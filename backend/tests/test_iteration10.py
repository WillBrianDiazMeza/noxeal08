"""Iteration 10: editorial transparency blocks (faqs, what_is_known, what_is_missing,
reality_vs_virality) + server-synced saved reading list (/api/me/saved).
"""
import os
import uuid
import requests
import pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "noxael18@gmail.com"
ADMIN_PASS = "Noxeal2026!"
MAKE_KEY = "noxeal-make-7f3a9b2c8d4e5f6a1b9c3d8e7f2a5b6c"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    if r.status_code != 200:
        r = s.post(f"{BASE}/api/auth/login", json={"email": "admin@noxeal.com", "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return s


# ---------- Make.com POST /api/articles regression + new transparency fields ----------
def test_make_regression_old_fields_only():
    """Old payload still works without new fields."""
    title = "TEST_iter10_make_old_" + uuid.uuid4().hex[:6]
    body = {
        "title": title,
        "content": "p1\n\np2",
        "category": "controversia",
        "tags": ["a", "b"],
    }
    r = requests.post(f"{BASE}/api/articles", json=body, headers={"X-API-Key": MAKE_KEY})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("ok") is True
    slug = j["slug"]
    g = requests.get(f"{BASE}/api/articles/{slug}")
    assert g.status_code == 200
    d = g.json()
    # New fields should be empty arrays (not missing)
    assert d.get("faqs", []) == []
    assert d.get("what_is_known", []) == []


def test_make_with_all_new_transparency_fields():
    title = "TEST_iter10_make_full_" + uuid.uuid4().hex[:6]
    body = {
        "title": title,
        "content": "x",
        "category": "controversia",
        "faqs": [{"q": "Pregunta 1?", "a": "Respuesta 1."}, {"q": "Pregunta 2?", "a": "Respuesta 2."}],
        "whatIsKnown": ["Hecho A", "Hecho B"],
        "whatIsMissing": ["Falta 1", "Falta 2"],
        "realityVsVirality": [
            {"virality": "Lo viral dice X", "reality": "La realidad es Y"},
        ],
    }
    r = requests.post(f"{BASE}/api/articles", json=body, headers={"X-API-Key": MAKE_KEY})
    assert r.status_code == 200, r.text
    slug = r.json()["slug"]
    # Verify persistence via GET
    g = requests.get(f"{BASE}/api/articles/{slug}")
    assert g.status_code == 200, g.text
    d = g.json()
    assert isinstance(d.get("faqs"), list) and len(d["faqs"]) == 2
    assert d["faqs"][0]["q"] == "Pregunta 1?"
    assert d["faqs"][0]["a"] == "Respuesta 1."
    assert d.get("what_is_known") == ["Hecho A", "Hecho B"]
    assert d.get("what_is_missing") == ["Falta 1", "Falta 2"]
    assert isinstance(d.get("reality_vs_virality"), list) and len(d["reality_vs_virality"]) == 1
    assert d["reality_vs_virality"][0]["virality"] == "Lo viral dice X"
    assert d["reality_vs_virality"][0]["reality"] == "La realidad es Y"


def test_make_with_null_and_string_coercion():
    """null faqs, string whatIsKnown, empty-dict realityVsVirality must not crash."""
    title = "TEST_iter10_make_coerce_" + uuid.uuid4().hex[:6]
    body = {
        "title": title,
        "content": "x",
        "category": "controversia",
        "faqs": None,
        "whatIsKnown": "Solo un string suelto",
        "whatIsMissing": None,
        "realityVsVirality": [{}],
    }
    r = requests.post(f"{BASE}/api/articles", json=body, headers={"X-API-Key": MAKE_KEY})
    assert r.status_code == 200, r.text
    slug = r.json()["slug"]
    g = requests.get(f"{BASE}/api/articles/{slug}")
    d = g.json()
    assert d.get("faqs", []) == []
    # whatIsKnown string → coerced to single-item list
    assert d.get("what_is_known") == ["Solo un string suelto"]
    assert d.get("what_is_missing", []) == []
    # empty dict in RvV → filtered out
    assert d.get("reality_vs_virality", []) == []


def test_make_rvv_variant_keys():
    """realityVsVirality should accept both {virality,reality} and {viral,fact}."""
    title = "TEST_iter10_rvv_variants_" + uuid.uuid4().hex[:6]
    body = {
        "title": title,
        "content": "x",
        "category": "controversia",
        "realityVsVirality": [
            {"virality": "A", "reality": "B"},
            {"viral": "C", "fact": "D"},
        ],
    }
    r = requests.post(f"{BASE}/api/articles", json=body, headers={"X-API-Key": MAKE_KEY})
    assert r.status_code == 200, r.text
    slug = r.json()["slug"]
    g = requests.get(f"{BASE}/api/articles/{slug}")
    d = g.json()
    rvv = d.get("reality_vs_virality") or []
    assert len(rvv) == 2, f"expected 2 RvV rows, got {rvv}"
    assert rvv[0] == {"virality": "A", "reality": "B"}
    assert rvv[1] == {"virality": "C", "reality": "D"}


# ---------- Admin manual create with new fields ----------
def test_admin_manual_with_transparency(admin_session):
    title = "TEST_iter10_manual_tr_" + uuid.uuid4().hex[:6]
    body = {
        "title": title,
        "excerpt": "x",
        "body": ["p1"],
        "category": "IA",
        "status": "published",
        "what_is_known": ["k1", "k2"],
        "what_is_missing": ["m1"],
        "faqs": [{"q": "Q1?", "a": "A1"}],
        "reality_vs_virality": [{"virality": "V1", "reality": "R1"}],
    }
    r = admin_session.post(f"{BASE}/api/admin/articles/manual", json=body)
    assert r.status_code == 200, r.text
    slug = r.json()["slug"]
    g = requests.get(f"{BASE}/api/articles/{slug}")
    d = g.json()
    assert d.get("what_is_known") == ["k1", "k2"]
    assert d.get("what_is_missing") == ["m1"]
    assert d.get("faqs") == [{"q": "Q1?", "a": "A1"}]
    assert d.get("reality_vs_virality") == [{"virality": "V1", "reality": "R1"}]
    return slug


# ---------- Admin PUT update with new fields (ArticleUpdate regression) ----------
def test_admin_update_with_transparency(admin_session):
    # Create a base article first
    title = "TEST_iter10_upd_tr_" + uuid.uuid4().hex[:6]
    c = admin_session.post(f"{BASE}/api/admin/articles/manual", json={
        "title": title, "body": ["p1"], "category": "IA", "status": "draft",
    })
    assert c.status_code == 200, c.text
    slug = c.json()["slug"]
    upd = {
        "faqs": [{"q": "Updated?", "a": "Yes."}],
        "what_is_known": ["upd-k"],
        "what_is_missing": ["upd-m"],
        "reality_vs_virality": [{"virality": "UV", "reality": "UR"}],
        "status": "published",
    }
    r = admin_session.put(f"{BASE}/api/admin/articles/{slug}", json=upd)
    assert r.status_code == 200, r.text
    g = requests.get(f"{BASE}/api/articles/{slug}")
    d = g.json()
    assert d.get("faqs") == [{"q": "Updated?", "a": "Yes."}]
    assert d.get("what_is_known") == ["upd-k"]
    assert d.get("what_is_missing") == ["upd-m"]
    assert d.get("reality_vs_virality") == [{"virality": "UV", "reality": "UR"}]


# ---------- /api/me/saved ----------
def test_me_saved_unauth_returns_401():
    r = requests.get(f"{BASE}/api/me/saved")
    assert r.status_code in (401, 403), r.text


def test_me_saved_full_flow(admin_session):
    # Initial state — may have prior data; just confirm list shape
    r = admin_session.get(f"{BASE}/api/me/saved")
    assert r.status_code == 200, r.text
    initial = r.json().get("slugs", [])
    assert isinstance(initial, list)

    # Get a real published slug
    arts = requests.get(f"{BASE}/api/articles").json()
    assert arts, "no articles to test against"
    slug = arts[0]["slug"]
    slug2 = arts[1]["slug"] if len(arts) > 1 else slug

    # Clean up any prior membership so this test is deterministic
    admin_session.delete(f"{BASE}/api/me/saved/{slug}")
    admin_session.delete(f"{BASE}/api/me/saved/{slug2}")

    # POST add
    r1 = admin_session.post(f"{BASE}/api/me/saved/{slug}")
    assert r1.status_code == 200, r1.text
    assert r1.json().get("ok") is True

    # Idempotent — second call must still 200 and not duplicate
    r2 = admin_session.post(f"{BASE}/api/me/saved/{slug}")
    assert r2.status_code == 200

    g = admin_session.get(f"{BASE}/api/me/saved").json()["slugs"]
    assert g.count(slug) == 1, f"duplicated: {g}"

    # 404 for non-existent slug
    r404 = admin_session.post(f"{BASE}/api/me/saved/non-existent-slug-xyz-12345")
    assert r404.status_code == 404, r404.text

    # DELETE
    rd = admin_session.delete(f"{BASE}/api/me/saved/{slug}")
    assert rd.status_code == 200
    after = admin_session.get(f"{BASE}/api/me/saved").json()["slugs"]
    assert slug not in after


def test_me_saved_sync_merges(admin_session):
    arts = requests.get(f"{BASE}/api/articles").json()
    assert len(arts) >= 2
    s1 = arts[0]["slug"]
    s2 = arts[1]["slug"]
    # Reset
    admin_session.delete(f"{BASE}/api/me/saved/{s1}")
    admin_session.delete(f"{BASE}/api/me/saved/{s2}")
    # Pre-populate server with s2
    admin_session.post(f"{BASE}/api/me/saved/{s2}")
    # Sync with local first, fake in middle, then s2 (already on server)
    payload = {"slugs": [s1, "fake-slug-zzz", s2]}
    r = admin_session.post(f"{BASE}/api/me/saved/sync", json=payload)
    assert r.status_code == 200, r.text
    merged = r.json().get("slugs", [])
    # Fake filtered out
    assert "fake-slug-zzz" not in merged
    # Both real slugs present
    assert s1 in merged
    assert s2 in merged
    # Local-first ordering: s1 should come before s2
    assert merged.index(s1) < merged.index(s2)


def test_me_saved_sync_empty_body(admin_session):
    """Empty body {} should not crash; returns 200 with current server slugs."""
    r = admin_session.post(f"{BASE}/api/me/saved/sync", json={})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("ok") is True
    assert isinstance(body.get("slugs"), list)


def test_me_saved_sync_route_does_not_collide(admin_session):
    """POST /me/saved/sync must NOT be interpreted as /me/saved/{slug='sync'}.
    If it collided with the catch-all, we'd get 404 ('sync' is not a real slug)."""
    r = admin_session.post(f"{BASE}/api/me/saved/sync", json={"slugs": []})
    assert r.status_code == 200, r.text
    # And the response shape must come from /sync (has 'slugs' key), not from add-slug (has 'slug')
    j = r.json()
    assert "slugs" in j, f"got add-slug shape: {j}"
