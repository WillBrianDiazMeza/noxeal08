"""Noxeal iteration 3: admin panel + AI generation tests.

CRITICAL:
- AI endpoints (Claude article gen + Nano Banana image gen) are slow (15-90s).
- Limit to 1-2 calls per AI endpoint to avoid billing.
- Cleanup: AI-generated drafts are deleted after each test.
"""
import os
import uuid
import requests
import pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@noxeal.com"
ADMIN_PASS = "Noxeal2026!"
SAMPLE_SLUG = "libro-negro-digital-epstein"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return s


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    email = f"i3_{uuid.uuid4().hex[:8]}@noxeal.com"
    r = s.post(f"{BASE}/api/auth/register",
               json={"email": email, "password": "secret123", "name": "I3User"})
    assert r.status_code == 200
    return s


# ---------- Public regression: only published returned ----------
def test_public_articles_only_published():
    r = requests.get(f"{BASE}/api/articles")
    assert r.status_code == 200
    items = r.json()
    # 8 seeded as published
    assert len(items) >= 8
    for a in items:
        # status field exists for new docs; old seeded ones may have it set to published
        assert a.get("status", "published") != "draft"


def test_public_article_by_slug_published():
    r = requests.get(f"{BASE}/api/articles/{SAMPLE_SLUG}")
    assert r.status_code == 200
    assert r.json()["slug"] == SAMPLE_SLUG


# ---------- Admin auth gating ----------
def test_admin_stats_requires_auth():
    r = requests.get(f"{BASE}/api/admin/stats")
    assert r.status_code == 401


def test_admin_stats_normal_user_403(user_session):
    r = user_session.get(f"{BASE}/api/admin/stats")
    assert r.status_code == 403


def test_admin_stats_ok(admin_session):
    r = admin_session.get(f"{BASE}/api/admin/stats")
    assert r.status_code == 200
    d = r.json()
    for k in ("articles", "published", "drafts", "comments", "subscribers", "users"):
        assert k in d, f"Missing key {k}"
        assert isinstance(d[k], int)
    assert d["articles"] == d["published"] + d["drafts"]


def test_admin_articles_list(admin_session):
    r = admin_session.get(f"{BASE}/api/admin/articles")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 8


def test_admin_articles_filter_status(admin_session):
    r = admin_session.get(f"{BASE}/api/admin/articles", params={"status": "published"})
    assert r.status_code == 200
    items = r.json()
    assert all(a.get("status") == "published" for a in items)


def test_admin_articles_requires_auth():
    r = requests.get(f"{BASE}/api/admin/articles")
    assert r.status_code == 401


def test_admin_comments_admin_only(admin_session):
    assert requests.get(f"{BASE}/api/admin/comments").status_code == 401
    r = admin_session.get(f"{BASE}/api/admin/comments")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_users_admin_only(admin_session):
    assert requests.get(f"{BASE}/api/admin/users").status_code == 401
    r = admin_session.get(f"{BASE}/api/admin/users")
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list) and len(users) >= 1
    for u in users:
        assert "password_hash" not in u


# ---------- Admin user role updates ----------
def test_admin_role_invalid(admin_session):
    # find any non-admin user
    users = admin_session.get(f"{BASE}/api/admin/users").json()
    target = next((u for u in users if u["role"] != "admin"), None)
    assert target, "No non-admin user found"
    r = admin_session.put(f"{BASE}/api/admin/users/{target['id']}/role", json={"role": "superuser"})
    assert r.status_code == 400


def test_admin_role_cannot_demote_self(admin_session):
    me = admin_session.get(f"{BASE}/api/auth/me").json()
    r = admin_session.put(f"{BASE}/api/admin/users/{me['id']}/role", json={"role": "user"})
    assert r.status_code == 400


def test_admin_role_promote_then_revert(admin_session):
    users = admin_session.get(f"{BASE}/api/admin/users").json()
    target = next((u for u in users if u["role"] == "user"), None)
    if not target:
        pytest.skip("No user to promote")
    r = admin_session.put(f"{BASE}/api/admin/users/{target['id']}/role", json={"role": "author"})
    assert r.status_code == 200
    # verify
    users2 = admin_session.get(f"{BASE}/api/admin/users").json()
    updated = next(u for u in users2 if u["id"] == target["id"])
    assert updated["role"] == "author"
    # revert
    admin_session.put(f"{BASE}/api/admin/users/{target['id']}/role", json={"role": "user"})


# ---------- Admin update / publish / unpublish / delete on EXISTING article ----------
@pytest.fixture
def temp_article(admin_session):
    """Create a temp article via insert_one through the admin generate flow is too slow.
    Use direct DB by going through PUT — we can't, so we'll create an empty draft via the
    AI pipeline... Instead we operate on a copy: PUT update on a sample slug then revert.
    This fixture just yields a known sample slug to operate on (will revert tags only)."""
    yield SAMPLE_SLUG


def test_admin_update_article(admin_session):
    # snapshot original
    orig = requests.get(f"{BASE}/api/articles/{SAMPLE_SLUG}").json()
    new_excerpt = f"TEST_excerpt_{uuid.uuid4().hex[:6]}"
    r = admin_session.put(f"{BASE}/api/admin/articles/{SAMPLE_SLUG}",
                          json={"excerpt": new_excerpt})
    assert r.status_code == 200
    assert r.json()["excerpt"] == new_excerpt
    # verify GET
    g = requests.get(f"{BASE}/api/articles/{SAMPLE_SLUG}").json()
    assert g["excerpt"] == new_excerpt
    # revert
    admin_session.put(f"{BASE}/api/admin/articles/{SAMPLE_SLUG}",
                      json={"excerpt": orig["excerpt"]})


def test_admin_update_empty_400(admin_session):
    r = admin_session.put(f"{BASE}/api/admin/articles/{SAMPLE_SLUG}", json={})
    assert r.status_code == 400


def test_admin_update_404(admin_session):
    r = admin_session.put(f"{BASE}/api/admin/articles/nope-xyz", json={"excerpt": "x"})
    assert r.status_code == 404


def test_admin_publish_unpublish_cycle(admin_session):
    # unpublish a sample article -> public 404
    target = "apple-vision-pro-fracaso-que-viene"
    r = admin_session.post(f"{BASE}/api/admin/articles/{target}/unpublish")
    assert r.status_code == 200 and r.json()["status"] == "draft"
    # public should now 404
    pub = requests.get(f"{BASE}/api/articles/{target}")
    assert pub.status_code == 404
    # admin still sees it
    items = admin_session.get(f"{BASE}/api/admin/articles", params={"status": "draft"}).json()
    assert any(a["slug"] == target for a in items)
    # publish back
    r2 = admin_session.post(f"{BASE}/api/admin/articles/{target}/publish")
    assert r2.status_code == 200 and r2.json()["status"] == "published"
    pub2 = requests.get(f"{BASE}/api/articles/{target}")
    assert pub2.status_code == 200


def test_admin_publish_404(admin_session):
    r = admin_session.post(f"{BASE}/api/admin/articles/nope-xyz/publish")
    assert r.status_code == 404


# ---------- AI endpoints (slow) ----------
@pytest.mark.timeout(120)
def test_admin_suggest_topics(admin_session):
    r = admin_session.post(f"{BASE}/api/admin/ai/suggest-topics",
                           json={"focus": "IA"}, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "topics" in d
    assert isinstance(d["topics"], list)
    assert len(d["topics"]) >= 3
    # each topic has structure
    for t in d["topics"]:
        assert "title" in t


def test_admin_suggest_topics_requires_admin(user_session):
    r = user_session.post(f"{BASE}/api/admin/ai/suggest-topics", json={"focus": "IA"})
    assert r.status_code == 403


@pytest.mark.timeout(180)
def test_admin_generate_article_draft(admin_session):
    """One Claude call. Cleans up after itself."""
    r = admin_session.post(f"{BASE}/api/admin/articles/generate",
                           json={"topic": "IA y educación en España (TEST)"},
                           timeout=120)
    assert r.status_code == 200, r.text
    a = r.json()
    # required fields
    for k in ("slug", "title", "excerpt", "body", "category", "category_slug",
              "tags", "meta_description", "image_prompt", "author", "status"):
        assert k in a, f"Missing field {k}"
    assert a["status"] == "draft"
    assert a["author"] == "Noxeal AI"
    assert isinstance(a["body"], list) and len(a["body"]) >= 1
    assert isinstance(a["tags"], list) and len(a["tags"]) <= 8
    assert a["category"] in ("Tecnología", "Investigación", "Salud y redes",
                             "Cultura digital", "IA")
    # public should NOT see this draft
    pub = requests.get(f"{BASE}/api/articles/{a['slug']}")
    assert pub.status_code == 404, "Draft is publicly visible — bug"
    # admin sees it in drafts
    drafts = admin_session.get(f"{BASE}/api/admin/articles", params={"status": "draft"}).json()
    assert any(x["slug"] == a["slug"] for x in drafts)
    # cleanup
    d = admin_session.delete(f"{BASE}/api/admin/articles/{a['slug']}")
    assert d.status_code == 200


@pytest.mark.timeout(180)
def test_admin_generate_article_publish_true(admin_session):
    r = admin_session.post(f"{BASE}/api/admin/articles/generate",
                           json={"topic": "Test topic publish flag", "publish": True},
                           timeout=120)
    assert r.status_code == 200
    a = r.json()
    assert a["status"] == "published"
    # public visible
    pub = requests.get(f"{BASE}/api/articles/{a['slug']}")
    assert pub.status_code == 200
    # cleanup
    admin_session.delete(f"{BASE}/api/admin/articles/{a['slug']}")


def test_admin_generate_requires_admin(user_session):
    r = user_session.post(f"{BASE}/api/admin/articles/generate",
                          json={"topic": "x"})
    assert r.status_code == 403


# ---------- Image regeneration (slow + billed) ----------
@pytest.mark.timeout(180)
def test_admin_regenerate_image(admin_session):
    """One Nano Banana call on the sample article."""
    r = admin_session.post(f"{BASE}/api/admin/articles/{SAMPLE_SLUG}/regenerate-image",
                           timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("ok") is True
    assert d.get("image", "").startswith("/api/static/images/")
    # file reachable
    img_url = f"{BASE}{d['image']}"
    img_r = requests.get(img_url)
    assert img_r.status_code == 200
    assert "image/png" in img_r.headers.get("content-type", "")
    assert len(img_r.content) > 1000  # actual PNG bytes
    # restore original image (so home doesn't break visually)
    admin_session.put(f"{BASE}/api/admin/articles/{SAMPLE_SLUG}",
                      json={"image": "https://images.unsplash.com/photo-1677064061401-f77f966ff8a1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwxfHxibGFjayUyMGxlYXRoZXIlMjBub3RlYm9va3xlbnwwfHx8fDE3NzgzMjY4NTB8MA&ixlib=rb-4.1.0&q=85"})


def test_admin_regenerate_image_404(admin_session):
    r = admin_session.post(f"{BASE}/api/admin/articles/nope-xyz/regenerate-image")
    assert r.status_code == 404
