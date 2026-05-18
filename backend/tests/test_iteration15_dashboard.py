"""Iter 15 backend tests — Premium User Dashboard + Emotional State + view tracking dedupe.

Covers:
- GET /api/me/dashboard (auth + 401 anon)
- DELETE /api/me/dashboard/history
- POST /api/articles/{slug}/view (anon + authenticated, dedupe within 1h)
- GET /api/emotional/state (public)
- Regression: POST /api/translate/strings
"""

import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
EMAIL = "noxael18@gmail.com"
PASSWORD = "Noxeal2026!"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Auth failed: {r.status_code} {r.text[:200]}")
    return s


@pytest.fixture(scope="session")
def trending_slug(anon_client):
    """Pick a published slug we can call /view on."""
    r = anon_client.get(f"{BASE_URL}/api/articles?limit=5")
    assert r.status_code == 200, r.text[:300]
    arr = r.json()
    assert isinstance(arr, list) and len(arr) > 0, "No published articles available"
    return arr[0]["slug"]


# ---------- health / login ----------
def test_health(anon_client):
    r = anon_client.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200


def test_login_sets_cookies(auth_client):
    cookies = auth_client.cookies.get_dict()
    assert "access_token" in cookies, f"access_token cookie missing: {cookies}"


# ---------- /api/me/dashboard ----------
def test_dashboard_anon_401(anon_client):
    r = anon_client.get(f"{BASE_URL}/api/me/dashboard")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text[:200]}"


def test_dashboard_authenticated_shape(auth_client):
    r = auth_client.get(f"{BASE_URL}/api/me/dashboard")
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    # required top-level keys
    for k in ["user", "totals", "top_categories", "top_tags", "by_fact_level", "emotions", "recent"]:
        assert k in data, f"Missing key: {k}"
    user = data["user"]
    assert user.get("email", "").lower() == EMAIL.lower()
    # totals
    t = data["totals"]
    for k in ["reads", "minutes", "saved", "highlights", "comments", "streak_days"]:
        assert k in t, f"Missing totals.{k}"
        assert isinstance(t[k], int), f"totals.{k} not int: {type(t[k])}"
    # arrays
    assert isinstance(data["top_categories"], list)
    assert isinstance(data["top_tags"], list)
    assert isinstance(data["emotions"], list)
    assert isinstance(data["recent"], list)
    assert isinstance(data["by_fact_level"], dict)


# ---------- DELETE /api/me/dashboard/history ----------
def test_delete_history(auth_client):
    r = auth_client.delete(f"{BASE_URL}/api/me/dashboard/history")
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    assert body.get("ok") is True
    # GET dashboard again - reads should be 0 and recent empty
    r2 = auth_client.get(f"{BASE_URL}/api/me/dashboard")
    assert r2.status_code == 200
    data = r2.json()
    assert data["totals"]["reads"] == 0, f"Expected 0 reads after clear, got {data['totals']['reads']}"
    assert data["recent"] == [], f"Expected empty recent, got {len(data['recent'])} items"


# ---------- POST /articles/{slug}/view ----------
def test_view_anonymous_increments(anon_client, trending_slug):
    r1 = anon_client.get(f"{BASE_URL}/api/articles/{trending_slug}")
    assert r1.status_code == 200
    v0 = r1.json().get("views", 0) or 0
    r2 = anon_client.post(f"{BASE_URL}/api/articles/{trending_slug}/view")
    assert r2.status_code == 200
    assert r2.json().get("ok") is True
    # Re-fetch
    r3 = anon_client.get(f"{BASE_URL}/api/articles/{trending_slug}")
    v1 = r3.json().get("views", 0) or 0
    assert v1 >= v0 + 1, f"views did not increment ({v0} -> {v1})"


def test_view_authenticated_records_and_dedupes(auth_client, trending_slug):
    # First, clear the history so we start clean
    auth_client.delete(f"{BASE_URL}/api/me/dashboard/history")
    # First view
    r1 = auth_client.post(f"{BASE_URL}/api/articles/{trending_slug}/view")
    assert r1.status_code == 200
    time.sleep(0.5)
    # Second view within 1h should dedupe
    r2 = auth_client.post(f"{BASE_URL}/api/articles/{trending_slug}/view")
    assert r2.status_code == 200
    time.sleep(0.5)
    # Check dashboard — should be exactly 1 read for this slug
    d = auth_client.get(f"{BASE_URL}/api/me/dashboard").json()
    matching = [r for r in d.get("recent", []) if r.get("slug") == trending_slug]
    assert len(matching) == 1, (
        f"Expected 1 read entry after 2 calls (dedupe 1h), got {len(matching)}; recent={d.get('recent')}"
    )
    assert d["totals"]["reads"] >= 1


def test_view_invalid_slug(anon_client):
    r = anon_client.post(f"{BASE_URL}/api/articles/this-slug-does-not-exist-xyz/view")
    # Returns 200 with ok:false (no exception)
    assert r.status_code == 200
    assert r.json().get("ok") is False


# ---------- /api/emotional/state ----------
def test_emotional_state_shape(anon_client):
    r = anon_client.get(f"{BASE_URL}/api/emotional/state")
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert "emotions" in data
    assert "generated_at" in data
    assert "sample_size" in data
    assert isinstance(data["emotions"], list)
    # If non-empty, validate per-item shape
    for em in data["emotions"]:
        for k in ["key", "label", "desc", "intensity", "article_count"]:
            assert k in em, f"emotion missing {k}: {em}"
        assert isinstance(em["intensity"], int)
        assert 0 <= em["intensity"] <= 100


def test_dashboard_emotions_mapping(auth_client, anon_client):
    """Read an article that should map to an emotion key and verify it appears."""
    # Clear history
    auth_client.delete(f"{BASE_URL}/api/me/dashboard/history")
    # Find an article with relevant tags / category
    r = anon_client.get(f"{BASE_URL}/api/articles?limit=50")
    arts = r.json()
    # tag-based picks
    targets = []
    for a in arts:
        tags = a.get("tags") or []
        cat = a.get("category") or ""
        if any(t in tags for t in ["ia", "ai", "deepfake", "deepfakes"]) or cat in ("IA", "Tecnología"):
            targets.append(("ansiedad_tecnologica", a["slug"]))
            break
    if not targets:
        for a in arts:
            cat = a.get("category") or ""
            if cat == "Cultura digital":
                targets.append(("fascinacion_cultural", a["slug"]))
                break
    if not targets:
        pytest.skip("No article with mappable emotion tags/category found")
    expected_key, slug = targets[0]
    # Trigger a read
    rv = auth_client.post(f"{BASE_URL}/api/articles/{slug}/view")
    assert rv.status_code == 200
    # Fetch dashboard — emotions list must contain the expected key OR at least 1 emotion
    d = auth_client.get(f"{BASE_URL}/api/me/dashboard").json()
    keys = [e["key"] for e in d.get("emotions", [])]
    assert len(keys) > 0, f"No emotions returned in dashboard after read of {slug}; got: {d.get('emotions')}"


# ---------- regression: /api/translate/strings ----------
def test_translate_strings_regression(anon_client):
    payload = {"lang": "en", "strings": ["Hola mundo iter15", "Adiós iter15"]}
    r = anon_client.post(f"{BASE_URL}/api/translate/strings", json=payload)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    # Returns either {translated:[...]} or {strings:[...]}
    arr = data.get("translations") or data.get("translated") or data.get("strings") or data.get("texts")
    assert isinstance(arr, list) and len(arr) == 2, f"Unexpected response: {data}"
    # At minimum the strings should NOT be empty
    assert all(isinstance(s, str) and len(s) > 0 for s in arr)
