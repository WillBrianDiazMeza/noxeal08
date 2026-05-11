"""Iteration 5: Make.com POST /api/articles, engagement (likes/comments/replies/reports),
new feeds (trending/controversial/most-commented), sanitization, sitemap, reported admin.
"""
import os, time, uuid, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://trending-news-3.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@noxeal.com"
ADMIN_PASS = "Noxeal2026!"
MAKE_KEY = "noxeal-make-7f3a9b2c8d4e5f6a1b9c3d8e7f2a5b6c"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def real_slug():
    r = requests.get(f"{BASE}/api/articles")
    assert r.status_code == 200 and r.json()
    return r.json()[0]["slug"]


# ---------- Health ----------
def test_health_ok():
    r = requests.get(f"{BASE}/api/health")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---------- Make.com POST /api/articles ----------
def test_make_create_no_key():
    body = {"title": "TEST_no_key_" + uuid.uuid4().hex[:6], "content": "p1\n\np2", "category": "controversia"}
    r = requests.post(f"{BASE}/api/articles", json=body)
    assert r.status_code == 401, r.text


def test_make_create_wrong_key():
    body = {"title": "TEST_wrong_" + uuid.uuid4().hex[:6], "content": "p1\n\np2"}
    r = requests.post(f"{BASE}/api/articles", json=body, headers={"X-API-Key": "bad"})
    assert r.status_code == 401


def test_make_create_with_correct_key():
    title = "TEST_Make_iter5_" + uuid.uuid4().hex[:6]
    body = {
        "title": title,
        "excerpt": "Resumen corto",
        "content": "Primer parrafo del articulo.\n\nSegundo parrafo del articulo viral.",
        "category": "controversia",
        "tags": ["viral", "test"],
        "seoTitle": title + " SEO",
        "seoDescription": "Descripcion SEO de prueba",
        "status": "published",
        "sourceUrl": "https://example.com/source",
    }
    r = requests.post(f"{BASE}/api/articles", json=body, headers={"X-API-Key": MAKE_KEY})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("success") is True and d.get("ok") is True
    assert "slug" in d and d["slug"]
    assert "url" in d and d["url"].endswith("/articulo/" + d["slug"])
    assert d.get("status") == "published"
    # Cleanup-ish: verify it exists via GET
    g = requests.get(f"{BASE}/api/articles/{d['slug']}")
    assert g.status_code == 200
    art = g.json()
    assert art["source_url"] == "https://example.com/source"
    assert art["author"] == "Noxeal AI"
    # New fields present
    for k in ("likes", "comments_count", "viral_score", "controversy_score"):
        assert k in art, f"missing field {k}"
    return d["slug"]


# ---------- Sanitization ----------
def test_make_create_sanitizes_script():
    title = "TEST_xss_" + uuid.uuid4().hex[:6]
    malicious = "<script>alert(1)</script>Texto seguro aqui."
    body = {
        "title": title,
        "excerpt": "<script>alert(2)</script>resumen ok",
        "content": malicious + "\n\nSegundo parrafo limpio.",
        "category": "tech",
        "status": "published",
    }
    r = requests.post(f"{BASE}/api/articles", json=body, headers={"X-API-Key": MAKE_KEY})
    assert r.status_code == 200, r.text
    slug = r.json()["slug"]
    g = requests.get(f"{BASE}/api/articles/{slug}").json()
    full = (g.get("excerpt", "") + " " + " ".join(g.get("body", []))).lower()
    assert "<script" not in full, f"script tag NOT sanitized: {full[:200]}"


# ---------- Engagement: likes/unlikes ----------
def test_article_like_unlike(real_slug):
    before = requests.get(f"{BASE}/api/articles/{real_slug}").json()
    likes0 = before.get("likes", 0)
    vs0 = before.get("viral_score", 0)
    r = requests.post(f"{BASE}/api/articles/{real_slug}/like")
    assert r.status_code == 200 and r.json().get("ok") is True
    mid = requests.get(f"{BASE}/api/articles/{real_slug}").json()
    assert mid.get("likes", 0) == likes0 + 1
    assert mid.get("viral_score", 0) == vs0 + 1
    r2 = requests.post(f"{BASE}/api/articles/{real_slug}/unlike")
    assert r2.status_code == 200
    after = requests.get(f"{BASE}/api/articles/{real_slug}").json()
    assert after.get("likes", 0) == likes0


def test_article_unlike_floor_zero():
    # Use a fresh article so likes=0
    title = "TEST_floor_" + uuid.uuid4().hex[:6]
    body = {"title": title, "content": "p1\n\np2", "status": "published"}
    r = requests.post(f"{BASE}/api/articles", json=body, headers={"X-API-Key": MAKE_KEY})
    assert r.status_code == 200
    slug = r.json()["slug"]
    # Unlike when likes=0 must not go negative
    requests.post(f"{BASE}/api/articles/{slug}/unlike")
    art = requests.get(f"{BASE}/api/articles/{slug}").json()
    assert art.get("likes", 0) == 0


# ---------- New feeds ----------
def test_feed_trending():
    r = requests.get(f"{BASE}/api/feed/trending", params={"limit": 6})
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    # sorted by viral_score desc (allow ties)
    scores = [i.get("viral_score", 0) for i in items]
    assert scores == sorted(scores, reverse=True), scores


def test_feed_controversial():
    r = requests.get(f"{BASE}/api/feed/controversial")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    scores = [i.get("controversy_score", 0) for i in items]
    assert scores == sorted(scores, reverse=True), scores


def test_feed_most_commented():
    r = requests.get(f"{BASE}/api/feed/most-commented")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    counts = [i.get("comments_count", 0) for i in items]
    assert counts == sorted(counts, reverse=True), counts


# ---------- Comments: create, count auto-inc, reply, like, report ----------
def test_comment_create_increments_count(admin_session, real_slug):
    before = requests.get(f"{BASE}/api/articles/{real_slug}").json()
    c0 = before.get("comments_count", 0)
    cs0 = before.get("controversy_score", 0)
    r = admin_session.post(
        f"{BASE}/api/articles/{real_slug}/comments",
        json={"body": "TEST comment iter5"},
    )
    assert r.status_code == 200, r.text
    comment = r.json()
    assert comment["body"] == "TEST comment iter5"
    after = requests.get(f"{BASE}/api/articles/{real_slug}").json()
    assert after.get("comments_count", 0) == c0 + 1
    assert after.get("controversy_score", 0) == cs0 + 1
    # Reply
    rr = admin_session.post(
        f"{BASE}/api/articles/{real_slug}/comments",
        json={"body": "TEST reply iter5", "parent_id": comment["id"]},
    )
    assert rr.status_code == 200
    reply = rr.json()
    assert reply["parent_id"] == comment["id"]
    # Invalid parent
    bad = admin_session.post(
        f"{BASE}/api/articles/{real_slug}/comments",
        json={"body": "bad", "parent_id": "nope-nope"},
    )
    assert bad.status_code == 400
    # Cleanup: delete child then parent
    admin_session.delete(f"{BASE}/api/comments/{reply['id']}")
    admin_session.delete(f"{BASE}/api/comments/{comment['id']}")
    final = requests.get(f"{BASE}/api/articles/{real_slug}").json()
    assert final.get("comments_count", 0) == c0


def test_comment_like(admin_session, real_slug):
    c = admin_session.post(
        f"{BASE}/api/articles/{real_slug}/comments",
        json={"body": "TEST like target"},
    ).json()
    r = requests.post(f"{BASE}/api/comments/{c['id']}/like")
    assert r.status_code == 200 and r.json().get("ok") is True
    admin_session.delete(f"{BASE}/api/comments/{c['id']}")


def test_comment_report_autohide_at_5(admin_session, real_slug):
    c = admin_session.post(
        f"{BASE}/api/articles/{real_slug}/comments",
        json={"body": "TEST report target"},
    ).json()
    cid = c["id"]
    # Report 5 times → soft delete
    for i in range(5):
        rep = requests.post(f"{BASE}/api/comments/{cid}/report")
        assert rep.status_code == 200, rep.text
    # 6th report should 404 (deleted filter)
    rep6 = requests.post(f"{BASE}/api/comments/{cid}/report")
    assert rep6.status_code == 404
    # Comment must NOT appear in public listing
    comments = requests.get(f"{BASE}/api/articles/{real_slug}/comments").json()
    assert all(cc.get("id") != cid for cc in comments), "comment with 5 reports still visible"


# ---------- Admin reported comments ----------
def test_admin_reported_only_reports_gt_0(admin_session, real_slug):
    # Seed a reported comment
    c = admin_session.post(
        f"{BASE}/api/articles/{real_slug}/comments",
        json={"body": "TEST reported_only"},
    ).json()
    requests.post(f"{BASE}/api/comments/{c['id']}/report")
    r = admin_session.get(f"{BASE}/api/admin/comments/reported")
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list)
    for item in items:
        assert item.get("reports", 0) > 0, f"comment with 0 reports leaked: {item}"
    admin_session.delete(f"{BASE}/api/comments/{c['id']}")


def test_admin_reported_requires_auth():
    r = requests.get(f"{BASE}/api/admin/comments/reported")
    assert r.status_code in (401, 403)


# ---------- Sitemap ----------
def test_sitemap_xml():
    r = requests.get(f"{BASE}/api/sitemap.xml")
    assert r.status_code == 200
    body = r.text
    assert "<?xml" in body
    assert "<urlset" in body
    assert "noxeal.com" in body or "trending-news-3" in body


# ---------- Feeds NOT shadowed by /articles/{slug} ----------
def test_feeds_not_shadowed():
    """Regression: feed/* routes must NOT be captured by /articles/{slug}."""
    for path in ("/api/feed/trending", "/api/feed/controversial", "/api/feed/most-commented"):
        r = requests.get(f"{BASE}{path}")
        assert r.status_code == 200, f"{path} returned {r.status_code}: {r.text[:200]}"
        assert isinstance(r.json(), list)
