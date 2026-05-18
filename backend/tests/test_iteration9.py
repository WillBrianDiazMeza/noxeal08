"""Iteration 9: manual article admin CRUD, sitemap-index + sub-sitemaps + topics,
admin delete user/subscriber/comment, ArticleUpdate new fields, Make.com regression.
"""
import os, uuid, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "noxael18@gmail.com"
ADMIN_PASS = "Noxeal2026!"
MAKE_KEY = "noxeal-make-7f3a9b2c8d4e5f6a1b9c3d8e7f2a5b6c"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    if r.status_code != 200:
        # Fallback admin
        r = s.post(f"{BASE}/api/auth/login", json={"email": "admin@noxeal.com", "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return s


# ---------- Health ----------
def test_health_db_true():
    r = requests.get(f"{BASE}/api/health")
    assert r.status_code == 200
    j = r.json()
    assert j.get("ok") is True
    assert j.get("db") is True


# ---------- Sitemap index + sub-sitemaps ----------
def test_sitemap_index_xml():
    r = requests.get(f"{BASE}/api/sitemap-index.xml")
    assert r.status_code == 200
    body = r.text
    assert "<sitemapindex" in body
    # Should reference the 5 sub-sitemaps
    for name in ("sitemap.xml", "sitemap-articles.xml", "sitemap-categories.xml",
                 "sitemap-tags.xml", "sitemap-topics.xml"):
        assert name in body, f"missing {name} in index"


@pytest.mark.parametrize("path", [
    "/api/sitemap-articles.xml",
    "/api/sitemap-categories.xml",
    "/api/sitemap-tags.xml",
    "/api/sitemap-topics.xml",
])
def test_sub_sitemaps_xml(path):
    r = requests.get(f"{BASE}{path}")
    assert r.status_code == 200, r.text[:200]
    assert "<urlset" in r.text
    assert "<?xml" in r.text


# ---------- Topics (pillar pages) ----------
def test_topics_list():
    r = requests.get(f"{BASE}/api/topics")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 5
    slugs = {t["slug"] for t in data}
    assert slugs == {"jeffrey-epstein", "inteligencia-artificial", "deepfakes", "cbdc", "salud-mental-redes"}
    for t in data:
        assert "name" in t and "article_count" in t
        assert isinstance(t["article_count"], int)


def test_topic_detail_ok():
    r = requests.get(f"{BASE}/api/topics/jeffrey-epstein")
    assert r.status_code == 200
    d = r.json()
    for k in ("name", "description", "articles", "article_count"):
        assert k in d, f"missing {k}"
    assert isinstance(d["articles"], list)
    assert d["article_count"] == len(d["articles"])


def test_topic_not_found():
    r = requests.get(f"{BASE}/api/topics/no-existe-12345")
    assert r.status_code == 404


# ---------- Admin: manual article CRUD ----------
def test_admin_manual_create_full(admin_session):
    title = "TEST_iter9_manual_" + uuid.uuid4().hex[:6]
    body = {
        "title": title,
        "excerpt": "Resumen manual de prueba.",
        "body": ["Parrafo 1 manual.", "Parrafo 2 manual."],
        "category": "Tecnología",
        "tags": ["test", "manual"],
        "fact_level": "ANALYSIS",
        "verification_level": 75,
        "source_url": "https://example.com/source-manual",
        "status": "published",
        "author": "Noxeal Editorial",
        "image": "",
        "meta_description": "SEO desc manual",
    }
    r = admin_session.post(f"{BASE}/api/admin/articles/manual", json=body)
    assert r.status_code == 200, r.text
    doc = r.json()
    # Full doc with new fields
    for k in ("fact_level", "verification_level", "category", "category_slug", "status", "slug"):
        assert k in doc, f"missing {k} in response"
    assert doc["status"] == "published"
    assert str(doc["fact_level"]).lower() == "analysis"
    assert doc["verification_level"] == 75
    # Verify GET returns the created article
    g = requests.get(f"{BASE}/api/articles/{doc['slug']}")
    assert g.status_code == 200
    return doc["slug"]


def test_admin_manual_body_as_string_coerce(admin_session):
    """body field as a plain string should be coerced to a list."""
    title = "TEST_iter9_str_body_" + uuid.uuid4().hex[:6]
    body = {
        "title": title,
        "excerpt": "x",
        "body": "Parrafo unico como string suelto.",
        "category": "IA",
        "status": "draft",
    }
    r = admin_session.post(f"{BASE}/api/admin/articles/manual", json=body)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert isinstance(doc.get("body"), list)
    assert len(doc["body"]) >= 1
    assert doc["status"] == "draft"


def test_admin_manual_unauth():
    r = requests.post(f"{BASE}/api/admin/articles/manual", json={"title": "x"})
    assert r.status_code in (401, 403)


def test_admin_manual_missing_body(admin_session):
    """Missing body/content should return 400 (validation)."""
    r = admin_session.post(f"{BASE}/api/admin/articles/manual", json={
        "title": "TEST_iter9_no_body_" + uuid.uuid4().hex[:6],
        "category": "Tecnología",
    })
    assert r.status_code in (400, 422), r.text


# ---------- Admin: delete user / subscriber ----------
def test_admin_delete_user_self_forbidden(admin_session):
    """Admin can't delete own account."""
    # Get self id
    me = admin_session.get(f"{BASE}/api/auth/me")
    assert me.status_code == 200
    my_id = me.json().get("id")
    r = admin_session.delete(f"{BASE}/api/admin/users/{my_id}")
    assert r.status_code == 400, r.text


def test_admin_delete_subscriber_flow(admin_session):
    test_email = f"TEST_iter9_{uuid.uuid4().hex[:6]}@example.com"
    # Create subscriber via public endpoint
    rs = requests.post(f"{BASE}/api/newsletter/subscribe", json={"email": test_email})
    assert rs.status_code in (200, 201), rs.text
    # Delete as admin
    r = admin_session.delete(f"{BASE}/api/admin/newsletter/{test_email}")
    assert r.status_code == 200, r.text
    # Second delete should 404
    r2 = admin_session.delete(f"{BASE}/api/admin/newsletter/{test_email}")
    assert r2.status_code == 404


# ---------- Regression: POST /api/articles (Make.com) Pydantic validators ----------
def test_make_regression_pydantic_validators():
    title = "TEST_iter9_make_reg_" + uuid.uuid4().hex[:6]
    body = {
        "title": title,
        "content": "p1\n\np2",
        "category": "controversia",
        "tags": None,                  # coerced to []
        "factLevel": "ANALYSIS",      # accepted
        "verificationLevel": "75%",   # coerced to int
        "publish": "true",             # coerced to bool
    }
    r = requests.post(f"{BASE}/api/articles", json=body, headers={"X-API-Key": MAKE_KEY})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("ok") is True
    assert "slug" in j


# ---------- Regression: POST /api/articles/by-slugs ----------
def test_articles_by_slugs_regression():
    # Pick any 2 slugs
    arts = requests.get(f"{BASE}/api/articles").json()
    if not arts:
        pytest.skip("no articles")
    slugs = [a["slug"] for a in arts[:2]]
    r = requests.post(f"{BASE}/api/articles/by-slugs", json={"slugs": slugs})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1


# ---------- ArticleUpdate new fields ----------
def test_article_update_new_fields(admin_session):
    # Create a draft article to mutate
    title = "TEST_iter9_upd_" + uuid.uuid4().hex[:6]
    body = {"title": title, "body": ["p1"], "category": "IA", "status": "draft"}
    c = admin_session.post(f"{BASE}/api/admin/articles/manual", json=body)
    assert c.status_code == 200, c.text
    slug = c.json()["slug"]

    update_body = {
        "fact_level": "OPINION",
        "verification_level": 42,
        "status": "published",
        "source_url": "https://example.com/upd",
        "author": "Iter9 Tester",
    }
    r = admin_session.put(f"{BASE}/api/admin/articles/{slug}", json=update_body)
    assert r.status_code == 200, r.text
    # Verify via GET
    g = requests.get(f"{BASE}/api/articles/{slug}")
    assert g.status_code == 200
    d = g.json()
    assert d.get("fact_level") == "OPINION"
    assert d.get("verification_level") == 42
    assert d.get("status") == "published"
    assert d.get("source_url") == "https://example.com/upd"
    assert d.get("author") == "Iter9 Tester"
