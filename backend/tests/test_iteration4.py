"""Iteration 4: health, public-config, public-stats, view tracking, most-read,
RSS feed, Make.com automation gate, hero singleton enforcement, email fire-and-forget.
"""
import os, time, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@noxeal.com"
ADMIN_PASS = "Noxeal2026!"
MAKE_KEY = "noxeal-make-7f3a9b2c8d4e5f6a1b9c3d8e7f2a5b6c"


@pytest.fixture
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return s


def _real_slug():
    """Pick first published article slug for view tests."""
    r = requests.get(f"{BASE}/api/articles")
    assert r.status_code == 200 and r.json()
    return r.json()[0]["slug"]


# ---------- /api/health ----------
def test_health_ok():
    r = requests.get(f"{BASE}/api/health")
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True
    assert d["service"] == "noxeal-api"
    assert "time" in d


# ---------- /api/public-config ----------
def test_public_config_shape():
    r = requests.get(f"{BASE}/api/public-config")
    assert r.status_code == 200
    d = r.json()
    assert d["contact_email"] == "hola@noxeal.com"
    s = d["social"]
    assert s["instagram"] == "https://instagram.com/noxael18"
    assert s["x"] == "https://x.com/noxeal"
    assert s["tiktok"] == "https://tiktok.com/@noxael18"
    assert s["youtube"] == "https://youtube.com/@noxeal"


# ---------- /api/public-stats ----------
def test_public_stats_shape_and_boost():
    r = requests.get(f"{BASE}/api/public-stats")
    assert r.status_code == 200
    d = r.json()
    # boost values must be applied
    assert d["reads"] >= 47230
    assert d["subscribers"] >= 5247
    # 8 seeded articles
    assert d["stories"] >= 8
    assert isinstance(d["reads"], int)
    assert isinstance(d["subscribers"], int)
    assert isinstance(d["stories"], int)


# ---------- view tracking ----------
def test_view_increment_on_real_slug():
    slug = _real_slug()
    before_resp = requests.get(f"{BASE}/api/articles/{slug}").json()
    before = before_resp.get("views", 0)
    r1 = requests.post(f"{BASE}/api/articles/{slug}/view")
    assert r1.status_code == 200 and r1.json().get("ok") is True
    r2 = requests.post(f"{BASE}/api/articles/{slug}/view")
    assert r2.status_code == 200 and r2.json().get("ok") is True
    after = requests.get(f"{BASE}/api/articles/{slug}").json().get("views", 0)
    assert after == before + 2, f"views did not increase by 2 (before={before}, after={after})"


def test_view_nonexistent_returns_ok_false():
    r = requests.post(f"{BASE}/api/articles/this-slug-does-not-exist-zzz/view")
    # Spec: 200 with {ok:false} (NOT 404)
    assert r.status_code == 200
    assert r.json() == {"ok": False}


# ---------- /api/articles/most-read ----------
def test_most_read_top_n():
    r = requests.get(f"{BASE}/api/articles/most-read", params={"limit": 4})
    assert r.status_code == 200, f"expected 200, got {r.status_code} body={r.text[:200]}"
    items = r.json()
    assert isinstance(items, list), f"expected list, got {type(items)} body={items}"
    assert len(items) == 4
    # sorted by views desc
    views = [a.get("views", 0) for a in items]
    assert views == sorted(views, reverse=True)
    # each has slug + title
    for a in items:
        assert "slug" in a and "title" in a


# ---------- /api/feed.rss ----------
def test_feed_rss_valid():
    r = requests.get(f"{BASE}/api/feed.rss")
    assert r.status_code == 200
    assert "application/rss+xml" in r.headers.get("content-type", "")
    body = r.text
    assert "<?xml" in body
    assert "<rss" in body
    assert "<channel>" in body
    assert "<item>" in body
    # Contains at least one real slug
    slug = _real_slug()
    assert slug in body


# ---------- /api/automation auth gate ----------
def test_automation_generate_no_key():
    r = requests.post(f"{BASE}/api/automation/articles/generate", json={"topic": "x"})
    assert r.status_code == 401


def test_automation_generate_wrong_key():
    r = requests.post(
        f"{BASE}/api/automation/articles/generate",
        json={"topic": "x"},
        headers={"X-API-Key": "wrong"},
    )
    assert r.status_code == 401


def test_automation_publish_no_key():
    r = requests.post(f"{BASE}/api/automation/articles/some-slug/publish")
    assert r.status_code == 401


def test_automation_publish_wrong_key():
    r = requests.post(
        f"{BASE}/api/automation/articles/some-slug/publish",
        headers={"X-API-Key": "wrong"},
    )
    assert r.status_code == 401


# Skip the actual Claude generation by default (slow + budget). One sanity invocation:
def test_automation_generate_with_correct_key_or_budget():
    """Validate the auth gate accepts the right key. If the LLM budget is exhausted
    we still want to confirm the route is wired (not 401)."""
    r = requests.post(
        f"{BASE}/api/automation/articles/generate",
        json={"topic": "Test Make.com auth gate validation"},
        headers={"X-API-Key": MAKE_KEY},
        timeout=120,
    )
    # 200 (success) or 500 (budget) — but must NOT be 401
    assert r.status_code != 401, f"correct key still returned 401: {r.text[:200]}"
    if r.status_code == 200:
        d = r.json()
        assert d["ok"] is True
        assert "slug" in d
        assert d["status"] == "draft"
        assert "admin_url" in d and "public_url" in d


# ---------- Hero singleton enforcement ----------
def test_hero_singleton(admin_session):
    listing = requests.get(f"{BASE}/api/articles").json()
    assert len(listing) >= 2
    a, b = listing[0]["slug"], listing[1]["slug"]
    # Set hero=true on A
    r = admin_session.put(f"{BASE}/api/admin/articles/{a}", json={"hero": True})
    assert r.status_code == 200
    feat = requests.get(f"{BASE}/api/articles/featured").json()
    assert feat["hero"]["slug"] == a
    # Set hero=true on B → A must lose hero
    r = admin_session.put(f"{BASE}/api/admin/articles/{b}", json={"hero": True})
    assert r.status_code == 200
    feat = requests.get(f"{BASE}/api/articles/featured").json()
    assert feat["hero"]["slug"] == b, f"hero singleton broken — expected {b}, got {feat['hero']['slug']}"
    # Restore default
    admin_session.put(f"{BASE}/api/admin/articles/libro-negro-digital-epstein", json={"hero": True})


# ---------- Email fire-and-forget: response must be fast ----------
def test_newsletter_subscribe_response_fast():
    """Email send must be fire-and-forget — response under 1500ms even with Resend wired."""
    import uuid
    email = f"TEST_nl_{uuid.uuid4().hex[:8]}@noxeal.com"
    t0 = time.time()
    r = requests.post(f"{BASE}/api/newsletter/subscribe", json={"email": email})
    elapsed_ms = (time.time() - t0) * 1000
    assert r.status_code == 200
    assert elapsed_ms < 1500, f"newsletter took {elapsed_ms}ms — email blocking response"


def test_login_response_fast():
    t0 = time.time()
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    elapsed_ms = (time.time() - t0) * 1000
    assert r.status_code == 200
    assert elapsed_ms < 1500, f"login took {elapsed_ms}ms — email blocking response"
