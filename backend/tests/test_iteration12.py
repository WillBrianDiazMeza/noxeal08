"""Iter 11.B + 11.C backend tests — i18n/timeline editorial blocks + webhook logs + dedup."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
MAKE_KEY = "noxeal-make-7f3a9b2c8d4e5f6a1b9c3d8e7f2a5b6c"
ADMIN_EMAIL = "noxael18@gmail.com"
ADMIN_PASSWORD = "Noxeal2026!"

TIMEOUT = 30


@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(http):
    r = http.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=TIMEOUT)
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text[:200]}")
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def make_headers():
    return {"X-API-Key": MAKE_KEY, "Content-Type": "application/json"}


# --------------- TOPIC TIMELINE REGRESSION ----------------
PILLAR_SLUGS = ["jeffrey-epstein", "inteligencia-artificial", "deepfakes", "cbdc", "salud-mental-redes"]


@pytest.mark.parametrize("slug", PILLAR_SLUGS)
def test_topic_includes_timeline(http, slug):
    r = http.get(f"{BASE_URL}/api/topics/{slug}", timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "timeline" in data, f"timeline missing in {slug}"
    timeline = data["timeline"]
    assert isinstance(timeline, list) and len(timeline) >= 4, f"{slug} timeline too short: {len(timeline)}"
    for item in timeline:
        assert "date" in item and item["date"]
        assert "event" in item and item["event"]
        assert "description" in item


def test_epstein_timeline_has_five(http):
    r = http.get(f"{BASE_URL}/api/topics/jeffrey-epstein", timeout=TIMEOUT)
    assert r.status_code == 200
    assert len(r.json()["timeline"]) == 5


# --------------- MAKE.COM POST /api/articles ----------------
@pytest.fixture
def unique_title():
    return f"TEST_iter11_make_{uuid.uuid4().hex[:8]}"


def test_make_post_with_new_editorial_blocks(http, make_headers, unique_title):
    payload = {
        "title": unique_title,
        "excerpt": "regression test 11B",
        "content": "Párrafo uno.\n\nPárrafo dos.",
        "category": "tech",
        "tags": ["test", "iter11"],
        "whatInternetBelieves": ["Creencia uno popular", "Creencia dos viral"],
        "narrativeEvolution": [
            {"date": "2020", "event": "Inicio", "description": "Origen del mito"},
            {"date": "2024", "event": "Mainstream", "description": "Mass media"},
        ],
    }
    r = http.post(f"{BASE_URL}/api/articles", json=payload, headers=make_headers, timeout=TIMEOUT)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body.get("ok") is True
    slug = body["slug"]

    # GET back to verify persistence
    g = http.get(f"{BASE_URL}/api/articles/{slug}", timeout=TIMEOUT)
    assert g.status_code == 200
    article = g.json()
    assert article.get("what_internet_believes") == ["Creencia uno popular", "Creencia dos viral"]
    ne = article.get("narrative_evolution")
    assert isinstance(ne, list) and len(ne) == 2
    assert ne[0]["date"] == "2020" and ne[0]["event"] == "Inicio"


def test_make_post_coerces_alt_keys_narrative(http, make_headers, unique_title):
    payload = {
        "title": unique_title,
        "excerpt": "alt keys test",
        "content": "Texto.",
        "category": "tech",
        "narrativeEvolution": [{"when": "2020", "title": "X event"}],
    }
    r = http.post(f"{BASE_URL}/api/articles", json=payload, headers=make_headers, timeout=TIMEOUT)
    assert r.status_code in (200, 201), r.text
    slug = r.json()["slug"]
    g = http.get(f"{BASE_URL}/api/articles/{slug}", timeout=TIMEOUT)
    assert g.status_code == 200
    ne = g.json()["narrative_evolution"]
    assert len(ne) == 1 and ne[0]["date"] == "2020" and ne[0]["event"] == "X event"


def test_make_post_coerces_string_what_internet_believes(http, make_headers, unique_title):
    payload = {
        "title": unique_title,
        "excerpt": "string coerce",
        "content": "Texto.",
        "category": "tech",
        "whatInternetBelieves": "una sola creencia suelta",
    }
    r = http.post(f"{BASE_URL}/api/articles", json=payload, headers=make_headers, timeout=TIMEOUT)
    assert r.status_code in (200, 201), r.text
    slug = r.json()["slug"]
    g = http.get(f"{BASE_URL}/api/articles/{slug}", timeout=TIMEOUT)
    wib = g.json()["what_internet_believes"]
    assert wib == ["una sola creencia suelta"]


# --------------- DEDUP + WEBHOOK LOGS ----------------
def test_dedup_409_and_webhook_log(http, make_headers):
    dup_title = f"TEST_iter11_dedup_{uuid.uuid4().hex[:8]}"
    payload = {"title": dup_title, "excerpt": "first", "content": "Texto base.", "category": "tech"}
    r1 = http.post(f"{BASE_URL}/api/articles", json=payload, headers=make_headers, timeout=TIMEOUT)
    assert r1.status_code in (200, 201), r1.text

    # Re-post with same title
    r2 = http.post(f"{BASE_URL}/api/articles", json=payload, headers=make_headers, timeout=TIMEOUT)
    assert r2.status_code == 409, f"expected 409, got {r2.status_code}: {r2.text}"
    detail = r2.json().get("detail", "")
    assert "Duplicado" in detail, detail


def test_admin_webhook_logs_requires_auth(http):
    r = http.get(f"{BASE_URL}/api/admin/webhook-logs", timeout=TIMEOUT)
    assert r.status_code in (401, 403), r.status_code


def test_admin_webhook_logs_lists_duplicates(http, admin_headers, make_headers):
    # Generate one dup to ensure a log exists
    dup_title = f"TEST_iter11_loggen_{uuid.uuid4().hex[:8]}"
    p = {"title": dup_title, "excerpt": "x", "content": "Texto.", "category": "tech"}
    http.post(f"{BASE_URL}/api/articles", json=p, headers=make_headers, timeout=TIMEOUT)
    http.post(f"{BASE_URL}/api/articles", json=p, headers=make_headers, timeout=TIMEOUT)

    r = http.get(f"{BASE_URL}/api/admin/webhook-logs", headers=admin_headers, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    logs = r.json()
    assert isinstance(logs, list) and len(logs) >= 1

    # Verify shape
    first = logs[0]
    for k in ("event", "title", "existing_slug", "received_at"):
        assert k in first, f"missing key {k} in {first}"
    # Ordered desc by received_at
    if len(logs) >= 2:
        assert logs[0]["received_at"] >= logs[1]["received_at"]

    # Find our dup
    found = any(l.get("title", "").startswith(dup_title[:30]) and l["event"] == "duplicate_rejected" for l in logs)
    assert found, "expected our duplicate to be logged"


# --------------- REGRESSIONS (iter 11.A and earlier) ----------------
def test_regression_editorial_activity(http):
    r = http.get(f"{BASE_URL}/api/editorial/activity", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert "last_published" in data and "counts_24h" in data and "counts_7d" in data and "recent" in data


def test_regression_post_reading(http):
    r = http.get(f"{BASE_URL}/api/articles/trending-news-3/post-reading", timeout=TIMEOUT)
    # May be 404 if slug doesn't exist; allow 200 or 404
    assert r.status_code in (200, 404)


def test_regression_me_saved_sync_unauth(http):
    r = http.post(f"{BASE_URL}/api/me/saved/sync", json={"slugs": []}, timeout=TIMEOUT)
    assert r.status_code in (200, 401)


def test_regression_me_highlights_unauth(http):
    # Without auth, this endpoint may return 401 or an empty list depending on auth optional vs required.
    r = http.get(f"{BASE_URL}/api/me/highlights", timeout=TIMEOUT)
    assert r.status_code in (200, 401)


# --------------- ADMIN UPDATE / MANUAL CREATE WITH NEW FIELDS ----------------
def test_admin_put_article_accepts_new_fields(http, admin_headers, make_headers):
    # Create one to update
    t = f"TEST_iter11_putfields_{uuid.uuid4().hex[:8]}"
    p = {"title": t, "excerpt": "x", "content": "Texto.", "category": "tech"}
    r = http.post(f"{BASE_URL}/api/articles", json=p, headers=make_headers, timeout=TIMEOUT)
    assert r.status_code in (200, 201)
    slug = r.json()["slug"]

    upd = {
        "what_internet_believes": ["Beta beliefs"],
        "narrative_evolution": [{"date": "2021", "event": "Update", "description": "desc"}],
    }
    pr = http.put(f"{BASE_URL}/api/admin/articles/{slug}", json=upd, headers=admin_headers, timeout=TIMEOUT)
    assert pr.status_code == 200, pr.text
    g = http.get(f"{BASE_URL}/api/articles/{slug}", timeout=TIMEOUT)
    body = g.json()
    assert body["what_internet_believes"] == ["Beta beliefs"]
    assert body["narrative_evolution"][0]["event"] == "Update"


def test_admin_manual_create_accepts_new_fields(http, admin_headers):
    t = f"TEST_iter11_manual_{uuid.uuid4().hex[:8]}"
    payload = {
        "title": t,
        "excerpt": "manual ed",
        "body": ["Párrafo manual uno.", "Párrafo manual dos."],
        "category": "tech",
        "tags": ["test"],
        "what_internet_believes": ["manual1", "manual2"],
        "narrative_evolution": [{"date": "2022", "event": "Manual", "description": "ok"}],
        "status": "published",
    }
    r = http.post(f"{BASE_URL}/api/admin/articles/manual", json=payload, headers=admin_headers, timeout=TIMEOUT)
    assert r.status_code in (200, 201), r.text
    create_body = r.json()
    print("CREATE_RESPONSE_KEYS:", list(create_body.keys()))
    print("CREATE wib:", create_body.get("what_internet_believes"))
    print("CREATE ne:", create_body.get("narrative_evolution"))
    slug = create_body.get("slug")
    assert slug
    g = http.get(f"{BASE_URL}/api/articles/{slug}", timeout=TIMEOUT)
    body = g.json()
    print("GET keys:", list(body.keys()))
    assert body.get("what_internet_believes") == ["manual1", "manual2"]
    assert body["narrative_evolution"][0]["date"] == "2022"
