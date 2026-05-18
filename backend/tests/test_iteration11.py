"""Iteration 11.A — Noxeal: post-reading + highlights CRUD + editorial activity.

Covers all backend bullets from the review request. Re-uses Make.com endpoint
to seed a test article so highlights/post-reading can be exercised end to end.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "noxael18@gmail.com"
ADMIN_PASSWORD = "Noxeal2026!"
MAKE_KEY = "noxeal-make-7f3a9b2c8d4e5f6a1b9c3d8e7f2a5b6c"

EXISTING_ARTICLE_SLUG = "noxeal-report-las-tendencias-virales-que-sacudieron-la-red-esta-semana"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_session(session):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    return s


@pytest.fixture(scope="session")
def seed_article(admin_session):
    """Create an article via Make.com so we have a known slug with tags."""
    title = f"TEST iter11 highlight seed {uuid.uuid4().hex[:6]}"
    payload = {
        "title": title,
        "excerpt": "Test seed for iteration 11.A highlights and post-reading.",
        "content": (
            "Primer parrafo del test de iter11. Contiene texto largo para resaltar.\n\n"
            "Segundo parrafo con mas contenido para que el highlight tenga substancia.\n\n"
            "Tercer parrafo final con palabras clave virales y tendencia."
        ),
        "category": "viral",
        "tags": ["viral", "tendencia", "test-iter11"],
    }
    r = requests.post(
        f"{API}/articles",
        json=payload,
        headers={"X-API-Key": MAKE_KEY, "Content-Type": "application/json"},
    )
    assert r.status_code == 200, f"seed failed: {r.status_code} {r.text[:200]}"
    slug = r.json()["slug"]
    return slug


# ---------------- editorial activity ----------------
class TestEditorialActivity:
    def test_activity_shape(self, session):
        r = session.get(f"{API}/editorial/activity")
        assert r.status_code == 200
        d = r.json()
        assert "last_published" in d
        assert "counts_24h" in d
        assert "counts_7d" in d
        assert "recent" in d
        assert isinstance(d["counts_24h"], int)
        assert isinstance(d["counts_7d"], int)
        assert isinstance(d["recent"], list)
        if d["last_published"]:
            lp = d["last_published"]
            assert "slug" in lp and "title" in lp
            assert "minutes_ago" in lp
            assert lp["minutes_ago"] is None or lp["minutes_ago"] >= 0
        # counts_7d should be >= counts_24h
        assert d["counts_7d"] >= d["counts_24h"]


# ---------------- post-reading ----------------
class TestPostReading:
    def test_post_reading_valid_slug(self, session):
        r = session.get(f"{API}/articles/{EXISTING_ARTICLE_SLUG}/post-reading")
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert "similar" in d
        assert "contradiction" in d
        assert "topic" in d
        assert isinstance(d["similar"], list)
        # each similar item must include slug & title
        for it in d["similar"]:
            assert "slug" in it and "title" in it

    def test_post_reading_404(self, session):
        r = session.get(f"{API}/articles/this-slug-does-not-exist-iter11/post-reading")
        assert r.status_code == 404


# ---------------- highlights auth ----------------
class TestHighlightsAuth:
    def test_get_highlights_unauth_401(self):
        # fresh session (no cookies)
        r = requests.get(f"{API}/me/highlights")
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"


# ---------------- highlights CRUD ----------------
class TestHighlightsCRUD:
    @pytest.fixture(autouse=True)
    def _cleanup(self, admin_session):
        # Capture pre-existing ids to avoid touching them
        pre = admin_session.get(f"{API}/me/highlights").json()
        self._pre_ids = {h["id"] for h in pre}
        yield
        # Delete anything we created
        post = admin_session.get(f"{API}/me/highlights").json()
        for h in post:
            if h["id"] not in self._pre_ids:
                admin_session.delete(f"{API}/me/highlights/{h['id']}")

    def test_get_highlights_authed_returns_list(self, admin_session):
        r = admin_session.get(f"{API}/me/highlights")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_post_highlight_color_uppercase_coerce(self, admin_session, seed_article):
        payload = {
            "slug": seed_article,
            "text": "fragmento de prueba iter11",
            "color": "GREEN",
            "note": "mi nota",
            "paragraph_index": 1,
        }
        r = admin_session.post(f"{API}/me/highlights", json=payload)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert "id" in d
        assert d["color"] == "green"
        assert d["text"].startswith("fragmento")
        assert d["note"] == "mi nota"
        assert d["paragraph_index"] == 1

    def test_post_highlight_invalid_color_coerced_to_yellow(self, admin_session, seed_article):
        payload = {"slug": seed_article, "text": "otro fragmento", "color": "red"}
        r = admin_session.post(f"{API}/me/highlights", json=payload)
        assert r.status_code == 200
        assert r.json()["color"] == "yellow"

    def test_post_highlight_404_unknown_slug(self, admin_session):
        payload = {"slug": "this-slug-does-not-exist-iter11-xyz", "text": "abc 12345"}
        r = admin_session.post(f"{API}/me/highlights", json=payload)
        assert r.status_code == 404

    def test_get_highlights_by_slug_filter(self, admin_session, seed_article):
        # create one on seed_article
        admin_session.post(f"{API}/me/highlights", json={
            "slug": seed_article, "text": "filtro por slug iter11", "color": "blue",
        })
        r = admin_session.get(f"{API}/me/highlights/{seed_article}")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        for it in items:
            assert it["slug"] == seed_article

    def test_patch_highlight_updates_note_and_color(self, admin_session, seed_article):
        c = admin_session.post(f"{API}/me/highlights", json={
            "slug": seed_article, "text": "para patch test", "color": "yellow",
        })
        hid = c.json()["id"]
        p = admin_session.patch(f"{API}/me/highlights/{hid}", json={"note": "nueva nota", "color": "blue"})
        assert p.status_code == 200
        # verify persisted via GET
        items = admin_session.get(f"{API}/me/highlights/{seed_article}").json()
        found = next((x for x in items if x["id"] == hid), None)
        assert found is not None
        assert found["note"] == "nueva nota"
        assert found["color"] == "blue"

    def test_patch_highlight_404(self, admin_session):
        r = admin_session.patch(f"{API}/me/highlights/nonexistent-id-xyz", json={"note": "x"})
        assert r.status_code == 404

    def test_delete_highlight_ok_and_404(self, admin_session, seed_article):
        c = admin_session.post(f"{API}/me/highlights", json={
            "slug": seed_article, "text": "borrar me", "color": "yellow",
        })
        hid = c.json()["id"]
        d = admin_session.delete(f"{API}/me/highlights/{hid}")
        assert d.status_code == 200
        # second delete should 404
        d2 = admin_session.delete(f"{API}/me/highlights/{hid}")
        assert d2.status_code == 404


# ---------------- regression ----------------
class TestRegression:
    def test_make_post_article_still_works(self):
        title = f"TEST iter11 regression make {uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{API}/articles",
            json={
                "title": title,
                "excerpt": "regresion make iter11",
                "content": "Texto largo para regresion iter11. " * 4,
                "category": "viral",
                "tags": ["regresion"],
            },
            headers={"X-API-Key": MAKE_KEY, "Content-Type": "application/json"},
        )
        assert r.status_code == 200, r.text[:200]
        assert r.json().get("ok") is True
        assert "slug" in r.json()

    def test_saved_sync_no_collision_with_trending_news_3(self, admin_session):
        # /me/saved/sync should work and NOT be caught by /me/saved/{slug}
        r = admin_session.post(f"{API}/me/saved/sync", json={"slugs": []})
        assert r.status_code == 200
        d = r.json()
        # iter10 confirmed shape: contains 'slugs' key
        assert "slugs" in d
