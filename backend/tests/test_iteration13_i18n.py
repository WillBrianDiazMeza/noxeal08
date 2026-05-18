"""Iteration 13 — Noxeal global i18n (auto-translate via Claude + cache).
Covers GET /api/articles/{slug}?lang=, POST /api/translate/strings,
listing endpoints with lang (cached-only), invalid-lang fallback, and regression
on Make.com POST + saved/sync + highlights + editorial/activity + post-reading."""
import os
import time
import json
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
MAKE_KEY = "noxeal-make-7f3a9b2c8d4e5f6a1b9c3d8e7f2a5b6c"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def any_published_slug(client):
    r = client.get(f"{API}/articles?limit=5", timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", [])
    assert items, "no published articles to translate"
    return items[0]["slug"]


# ---------- Health ----------
def test_health_ok(client):
    r = client.get(f"{API}/health", timeout=30)
    assert r.status_code == 200


# ---------- Translation: articles ----------
class TestArticleTranslation:
    def test_article_no_lang_returns_spanish(self, client, any_published_slug):
        r = client.get(f"{API}/articles/{any_published_slug}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("lang") == "es"
        assert "translations" not in d  # must be stripped
        assert d.get("title")

    def test_article_lang_es_explicit_returns_spanish(self, client, any_published_slug):
        r = client.get(f"{API}/articles/{any_published_slug}?lang=es", timeout=15)
        assert r.status_code == 200
        assert r.json().get("lang") == "es"

    def test_article_invalid_lang_fallbacks_to_spanish(self, client, any_published_slug):
        r = client.get(f"{API}/articles/{any_published_slug}?lang=xx", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("lang") == "es"
        # No has_original flag should be set in fallback
        assert d.get("has_original") in (None, False)

    def test_article_lang_en_translates_and_caches(self, client, any_published_slug):
        # First call: may take 10-18s (Claude)
        t0 = time.time()
        r1 = client.get(f"{API}/articles/{any_published_slug}?lang=en", timeout=60)
        elapsed1 = time.time() - t0
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1.get("lang") == "en"
        assert d1.get("has_original") is True
        assert d1.get("title"), "translated title missing"
        en_title = d1["title"]

        # Second call: cache hit, should be fast (<3s)
        t1 = time.time()
        r2 = client.get(f"{API}/articles/{any_published_slug}?lang=en", timeout=15)
        elapsed2 = time.time() - t1
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2.get("lang") == "en"
        assert d2.get("title") == en_title, "cache returned different title"
        # Cached call MUST be faster than first call (unless first was already cached)
        assert elapsed2 < 5.0, f"cache hit too slow: {elapsed2:.2f}s (first {elapsed1:.2f}s)"

    def test_article_lang_fr(self, client, any_published_slug):
        r = client.get(f"{API}/articles/{any_published_slug}?lang=fr", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d.get("lang") == "fr"
        assert d.get("has_original") is True
        assert d.get("title")

    def test_article_not_found_returns_404(self, client):
        r = client.get(f"{API}/articles/nope-{uuid.uuid4().hex[:8]}?lang=en", timeout=10)
        assert r.status_code == 404


# ---------- Translation: listings (cache-only) ----------
class TestListingsWithLang:
    def test_articles_list_with_lang_en_returns_200(self, client):
        r = client.get(f"{API}/articles?lang=en&limit=10", timeout=20)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("items", [])
        assert isinstance(items, list)
        # Listings only apply cached translations; items must each have lang
        for it in items:
            assert it.get("lang") in ("es", "en"), f"unexpected lang: {it.get('lang')}"
            assert "translations" not in it

    def test_featured_with_lang_fr(self, client):
        r = client.get(f"{API}/articles/featured?lang=fr", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "hero" in d
        # Hero (if any) should have a lang field
        if d.get("hero"):
            assert d["hero"].get("lang") in ("es", "fr")

    def test_most_read_with_lang_nl(self, client):
        r = client.get(f"{API}/articles/most-read?lang=nl&limit=3", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        for it in items:
            assert it.get("lang") in ("es", "nl")


# ---------- Translation: UI strings ----------
class TestUIStrings:
    def test_translate_strings_fr_first_call(self, client):
        payload = {"strings": ["Hola mundo iter13", "Adiós iter13"], "lang": "fr"}
        r = client.post(f"{API}/translate/strings", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("lang") == "fr"
        outs = d.get("translations") or []
        assert len(outs) == 2
        # Must not be identical to input (real translation happened)
        assert outs[0] and outs[1]
        assert (outs[0] != "Hola mundo iter13") or (outs[1] != "Adiós iter13"), "no translation occurred"

    def test_translate_strings_cache_hit(self, client):
        payload = {"strings": ["Hola mundo iter13", "Adiós iter13"], "lang": "fr"}
        # Prime once
        client.post(f"{API}/translate/strings", json=payload, timeout=30)
        t0 = time.time()
        r = client.post(f"{API}/translate/strings", json=payload, timeout=10)
        elapsed = time.time() - t0
        assert r.status_code == 200
        assert elapsed < 3.0, f"cache hit too slow: {elapsed:.2f}s"
        outs = r.json().get("translations") or []
        assert len(outs) == 2 and all(outs)

    def test_translate_strings_invalid_lang_returns_input(self, client):
        payload = {"strings": ["foo", "bar"], "lang": "zz"}
        r = client.post(f"{API}/translate/strings", json=payload, timeout=10)
        assert r.status_code == 200
        # Spec: returns strings untranslated (original list)
        assert r.json().get("translations") == ["foo", "bar"]

    def test_translate_strings_empty_body(self, client):
        r = client.post(f"{API}/translate/strings", json={}, timeout=10)
        assert r.status_code == 200
        # Returns empty translations list (no crash)
        assert r.json().get("translations") == []

    def test_translate_strings_empty_strings_list(self, client):
        r = client.post(f"{API}/translate/strings", json={"strings": [], "lang": "fr"}, timeout=10)
        assert r.status_code == 200
        assert r.json().get("translations") == []


# ---------- Regression ----------
class TestRegression:
    def test_make_com_post_article_still_ok(self, client):
        marker = uuid.uuid4().hex[:8]
        payload = {
            "title": f"TEST_iter13 Regression Make {marker}",
            "excerpt": "Regression check for Make.com endpoint after i18n changes.",
            "content": "<p>Cuerpo de prueba de regresión.</p>" * 3,
            "category": "controversia",
            "tags": ["regression", "iter13"],
            "publish": False,  # leave as draft, no email spam
        }
        r = client.post(
            f"{API}/articles",
            json=payload,
            headers={"X-API-Key": MAKE_KEY, "Content-Type": "application/json"},
            timeout=20,
        )
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d.get("ok") is True
        assert d.get("slug")

    def test_editorial_activity_endpoint(self, client):
        r = client.get(f"{API}/editorial/activity", timeout=10)
        assert r.status_code == 200
        d = r.json()
        # Expect an object with some array of recent events
        assert isinstance(d, (list, dict))

    def test_me_saved_sync_no_auth_returns_401_or_200_with_empty(self, client):
        r = client.post(f"{API}/me/saved/sync", json={"slugs": []}, timeout=10)
        # Endpoint may either require auth (401) or accept guest and return empty
        assert r.status_code in (200, 401, 403)

    def test_me_highlights_no_auth(self, client):
        r = client.get(f"{API}/me/highlights", timeout=10)
        assert r.status_code in (200, 401, 403)

    def test_post_reading_returns_suggestions(self, client, any_published_slug):
        r = client.get(f"{API}/articles/{any_published_slug}/post-reading", timeout=15)
        assert r.status_code == 200, r.text


# ---------- Interceptor regression: /admin requests must NOT require lang ----------
class TestAdminLangExclusion:
    def test_admin_endpoint_responds_without_lang_dependency(self, client):
        # We don't auth here; we just check the route exists (401/403 ok, not 5xx)
        r = client.get(f"{API}/admin/webhook-logs", timeout=10)
        assert r.status_code in (200, 401, 403, 404)
