"""Noxeal backend pytest suite. Runs against REACT_APP_BACKEND_URL."""
import os, uuid, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@noxeal.com"
ADMIN_PASS = "Noxeal2026!"


@pytest.fixture
def s():
    return requests.Session()


# ---------- Health & Articles ----------
def test_health(s):
    r = s.get(f"{BASE}/api/")
    assert r.status_code == 200 and r.json().get("ok") is True


def test_articles_list(s):
    r = s.get(f"{BASE}/api/articles")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 8


def test_articles_featured_shape(s):
    r = s.get(f"{BASE}/api/articles/featured")
    assert r.status_code == 200
    d = r.json()
    assert d["hero"] and d["hero"]["slug"] == "libro-negro-digital-epstein"
    assert len(d["side"]) == 3
    assert len(d["viral"]) == 4
    assert len(d["latest"]) == 6


def test_articles_filter_category(s):
    r = s.get(f"{BASE}/api/articles", params={"category": "ia"})
    assert r.status_code == 200
    items = r.json()
    assert all(a["category_slug"] == "ia" for a in items) and len(items) >= 1


def test_articles_trending(s):
    r = s.get(f"{BASE}/api/articles", params={"trending": "true"})
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1 and all(a.get("trending") for a in items)


def test_articles_search(s):
    r = s.get(f"{BASE}/api/articles", params={"search": "epstein"})
    assert r.status_code == 200 and len(r.json()) >= 1


def test_article_by_slug(s):
    r = s.get(f"{BASE}/api/articles/libro-negro-digital-epstein")
    assert r.status_code == 200
    a = r.json()
    assert a["slug"] == "libro-negro-digital-epstein"
    assert isinstance(a["body"], list)


def test_article_404(s):
    r = s.get(f"{BASE}/api/articles/does-not-exist-xyz")
    assert r.status_code == 404


def test_categories(s):
    r = s.get(f"{BASE}/api/categories")
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) >= 4
    assert all("slug" in c and "name" in c and "count" in c for c in cats)


# ---------- Auth ----------
def test_login_admin(s):
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200
    u = r.json()
    assert u["role"] == "admin" and u["email"] == ADMIN_EMAIL
    assert "password_hash" not in u
    assert "access_token" in s.cookies and "refresh_token" in s.cookies


def test_login_bad_password(s):
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me_no_cookie(s):
    r = s.get(f"{BASE}/api/auth/me")
    assert r.status_code == 401


def test_me_with_cookie():
    s = requests.Session()
    s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    r = s.get(f"{BASE}/api/auth/me")
    assert r.status_code == 200 and r.json()["email"] == ADMIN_EMAIL


def test_register_and_logout():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:8]}@noxeal.com"
    r = s.post(f"{BASE}/api/auth/register", json={"email": email, "password": "secret123", "name": "T"})
    assert r.status_code == 200
    u = r.json()
    assert u["email"] == email and u["role"] == "user"
    # me works
    assert s.get(f"{BASE}/api/auth/me").status_code == 200
    # refresh
    rr = s.post(f"{BASE}/api/auth/refresh")
    assert rr.status_code == 200 and rr.json().get("ok") is True
    # logout
    lo = s.post(f"{BASE}/api/auth/logout")
    assert lo.status_code == 200
    # cleanup: register endpoint requires unique email; we leave the test user


def test_logout_requires_auth():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/logout")
    assert r.status_code == 401


# ---------- Newsletter ----------
def test_newsletter_subscribe_flow():
    s = requests.Session()
    email = f"nl_{uuid.uuid4().hex[:8]}@noxeal.com"
    r = s.post(f"{BASE}/api/newsletter/subscribe", json={"email": email})
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True and d["already_subscribed"] is False
    # second time
    r2 = s.post(f"{BASE}/api/newsletter/subscribe", json={"email": email})
    assert r2.status_code == 200 and r2.json()["already_subscribed"] is True


def test_newsletter_invalid_email():
    s = requests.Session()
    r = s.post(f"{BASE}/api/newsletter/subscribe", json={"email": "not-an-email"})
    assert r.status_code == 422


def test_newsletter_list_auth():
    # no cookie
    assert requests.get(f"{BASE}/api/newsletter/list").status_code == 401
    # normal user -> 403
    s = requests.Session()
    email = f"u_{uuid.uuid4().hex[:8]}@noxeal.com"
    s.post(f"{BASE}/api/auth/register", json={"email": email, "password": "secret123", "name": "U"})
    assert s.get(f"{BASE}/api/newsletter/list").status_code == 403
    # admin -> 200
    a = requests.Session()
    a.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    r = a.get(f"{BASE}/api/newsletter/list")
    assert r.status_code == 200 and isinstance(r.json(), list)
