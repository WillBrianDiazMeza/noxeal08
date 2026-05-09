"""Noxeal iteration 2 backend tests: tags, related, comments, sitemap, robots."""
import os, uuid, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@noxeal.com"
ADMIN_PASS = "Noxeal2026!"
SLUG = "libro-negro-digital-epstein"


@pytest.fixture
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, "Admin login failed"
    return s


@pytest.fixture
def user_session():
    s = requests.Session()
    email = f"u_{uuid.uuid4().hex[:8]}@noxeal.com"
    r = s.post(f"{BASE}/api/auth/register",
               json={"email": email, "password": "secret123", "name": f"U{uuid.uuid4().hex[:4]}"})
    assert r.status_code == 200
    s._email = email  # type: ignore[attr-defined]
    return s


# ---------- Tag filtering ----------
def test_articles_filter_tag_ia():
    r = requests.get(f"{BASE}/api/articles", params={"tag": "ia"})
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 3, f"Expected 3+ ia-tagged articles, got {len(items)}"
    slugs = {a["slug"] for a in items}
    assert "ia-autoconsciente-realidad-fantasia" in slugs
    assert "deepfakes-politicos-guerra-verdad" in slugs
    assert "modelos-open-source-ascenso" in slugs
    for a in items:
        assert "ia" in a.get("tags", [])


def test_articles_filter_tag_tecnologia():
    r = requests.get(f"{BASE}/api/articles", params={"tag": "tecnologia"})
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    for a in items:
        assert "tecnologia" in a.get("tags", [])


def test_articles_search_matches_tags():
    # iteration 2: search now matches tags too
    r = requests.get(f"{BASE}/api/articles", params={"search": "epstein"})
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_tags_endpoint():
    r = requests.get(f"{BASE}/api/tags")
    assert r.status_code == 200
    tags = r.json()
    assert isinstance(tags, list) and len(tags) >= 5
    # Aggregated structure
    for t in tags:
        assert "slug" in t and "count" in t and isinstance(t["count"], int)
    # Sorted by count desc
    counts = [t["count"] for t in tags]
    assert counts == sorted(counts, reverse=True)
    # 'ia' should have count >= 3
    ia_tag = next((t for t in tags if t["slug"] == "ia"), None)
    assert ia_tag is not None and ia_tag["count"] >= 3


# ---------- Related articles ----------
def test_related_articles_ok():
    r = requests.get(f"{BASE}/api/articles/{SLUG}/related")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert 1 <= len(items) <= 3
    for a in items:
        assert a["slug"] != SLUG
        assert "title" in a


def test_related_articles_404():
    r = requests.get(f"{BASE}/api/articles/does-not-exist-xyz/related")
    assert r.status_code == 404


# ---------- Comments ----------
def test_comments_empty_initially():
    # Use a slug that no test will pollute persistently — pick one rarely used
    slug = "economia-atencion-donde-se-gana"
    r = requests.get(f"{BASE}/api/articles/{slug}/comments")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_comment_post_requires_auth():
    r = requests.post(f"{BASE}/api/articles/{SLUG}/comments", json={"body": "hello world"})
    assert r.status_code == 401


def test_comment_post_admin_then_in_list(admin_session):
    body = f"TEST_admin_comment_{uuid.uuid4().hex[:6]}"
    r = admin_session.post(f"{BASE}/api/articles/{SLUG}/comments", json={"body": body})
    assert r.status_code == 200, r.text
    c = r.json()
    assert c["id"] and c["user_name"] and c["user_role"] == "admin"
    assert c["body"] == body
    assert c["created_at"]
    # appears in GET list
    g = requests.get(f"{BASE}/api/articles/{SLUG}/comments")
    assert g.status_code == 200
    assert any(x["id"] == c["id"] for x in g.json())
    # cleanup
    admin_session.delete(f"{BASE}/api/comments/{c['id']}")


def test_comment_post_short_body_422(admin_session):
    r = admin_session.post(f"{BASE}/api/articles/{SLUG}/comments", json={"body": "a"})
    assert r.status_code == 422


def test_comment_post_invalid_slug_404(admin_session):
    r = admin_session.post(f"{BASE}/api/articles/does-not-exist-xyz/comments",
                           json={"body": "valid body content"})
    assert r.status_code == 404


def test_comment_delete_admin_can_delete_any(admin_session, user_session):
    # user creates a comment
    body = f"TEST_user_comment_{uuid.uuid4().hex[:6]}"
    r = user_session.post(f"{BASE}/api/articles/{SLUG}/comments", json={"body": body})
    assert r.status_code == 200
    cid = r.json()["id"]
    # admin deletes it
    d = admin_session.delete(f"{BASE}/api/comments/{cid}")
    assert d.status_code == 200
    # gone from list (soft delete)
    g = requests.get(f"{BASE}/api/articles/{SLUG}/comments")
    assert all(x["id"] != cid for x in g.json())


def test_comment_delete_other_user_403(user_session):
    # user1 creates comment
    body = f"TEST_owner_{uuid.uuid4().hex[:6]}"
    r = user_session.post(f"{BASE}/api/articles/{SLUG}/comments", json={"body": body})
    assert r.status_code == 200
    cid = r.json()["id"]
    # different user tries to delete
    other = requests.Session()
    email2 = f"u2_{uuid.uuid4().hex[:8]}@noxeal.com"
    other.post(f"{BASE}/api/auth/register",
               json={"email": email2, "password": "secret123", "name": "Other"})
    d = other.delete(f"{BASE}/api/comments/{cid}")
    assert d.status_code == 403
    # cleanup as owner
    user_session.delete(f"{BASE}/api/comments/{cid}")


def test_comment_delete_owner_can_delete(user_session):
    body = f"TEST_self_{uuid.uuid4().hex[:6]}"
    r = user_session.post(f"{BASE}/api/articles/{SLUG}/comments", json={"body": body})
    assert r.status_code == 200
    cid = r.json()["id"]
    d = user_session.delete(f"{BASE}/api/comments/{cid}")
    assert d.status_code == 200


# ---------- Sitemap & robots ----------
def test_sitemap_xml():
    r = requests.get(f"{BASE}/sitemap.xml")
    assert r.status_code == 200
    assert "application/xml" in r.headers.get("content-type", "").lower()
    assert "<?xml" in r.text and "<urlset" in r.text
    assert "/articulo/libro-negro-digital-epstein" in r.text


def test_robots_txt():
    r = requests.get(f"{BASE}/robots.txt")
    assert r.status_code == 200
    assert "Sitemap:" in r.text
    assert "User-agent:" in r.text
