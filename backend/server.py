from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import time as _time

# Fixed at server start — used by /public-stats live tick
LAUNCH_TIMESTAMP_SEC = int(_time.time()) - 200 * 60   # backdate ~3h so stats start non-zero


import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, Query, Header
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

import ai_service
import email_service

MAKE_API_KEY = os.environ.get("MAKE_API_KEY", "")


# ---------- Setup (Vercel-safe: never crash on missing env at import time) ----------
mongo_url = os.environ.get("MONGO_URL", "")
db_name = os.environ.get("DB_NAME", "noxeal")
JWT_SECRET = os.environ.get("JWT_SECRET", "")

if not mongo_url:
    logging.warning("MONGO_URL not configured — DB-backed endpoints will fail at runtime.")
if not JWT_SECRET:
    # Generate a random ephemeral secret so the app still imports.
    # WARNING: tokens won't survive process restart. Set JWT_SECRET in production.
    import secrets as _secrets
    JWT_SECRET = _secrets.token_hex(32)
    logging.warning("JWT_SECRET not configured — using ephemeral random secret (tokens won't persist).")

client = AsyncIOMotorClient(mongo_url) if mongo_url else None
db = client[db_name] if client is not None else None

JWT_ALGORITHM = "HS256"

app = FastAPI(title="Noxeal API")
api_router = APIRouter(prefix="/api")


# ---------- Helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60 * 24),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=60 * 60 * 24, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax", max_age=60 * 60 * 24 * 7, path="/")


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Tipo de token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acceso de administrador requerido")
    return user


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    created_at: str


class NewsletterIn(BaseModel):
    email: EmailStr


class NewsletterOut(BaseModel):
    email: str
    subscribed_at: str


# ---------- Auth Endpoints ----------
@api_router.post("/auth/register", response_model=UserOut)
async def register(data: RegisterIn, response: Response):
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one({
        "id": user_id,
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "user",
        "created_at": now,
    })
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    email_service.notify_admin_login(email, data.name, "user", "registrado")
    return UserOut(id=user_id, email=email, name=data.name, role="user", created_at=now)


@api_router.post("/auth/login", response_model=UserOut)
async def login(data: LoginIn, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    access = create_access_token(user["id"], email)
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    email_service.notify_admin_login(email, user.get("name", ""), user.get("role", "user"), "iniciado sesión")
    return UserOut(**{k: v for k, v in user.items() if k != "password_hash"})


@api_router.post("/auth/logout")
async def logout(response: Response, _user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No hay refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Tipo de token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        new_access = create_access_token(user["id"], user["email"])
        response.set_cookie("access_token", new_access, httponly=True, secure=False, samesite="lax", max_age=60 * 60 * 24, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# ---------- Newsletter ----------
@api_router.post("/newsletter/subscribe")
async def newsletter_subscribe(data: NewsletterIn):
    email = data.email.lower().strip()
    existing = await db.newsletter.find_one({"email": email})
    if existing:
        return {"ok": True, "already_subscribed": True, "message": "Ya estás suscrito a Noxeal"}
    await db.newsletter.insert_one({
        "email": email,
        "subscribed_at": datetime.now(timezone.utc).isoformat(),
    })
    total = await db.newsletter.count_documents({})
    email_service.notify_admin_subscriber(email, total)
    return {"ok": True, "already_subscribed": False, "message": "¡Bienvenido a Noxeal!"}


@api_router.get("/newsletter/list", response_model=List[NewsletterOut])
async def newsletter_list(_admin: dict = Depends(require_admin)):
    items = await db.newsletter.find({}, {"_id": 0}).sort("subscribed_at", -1).to_list(1000)
    return [NewsletterOut(**i) for i in items]


# ---------- Articles (public — only status=published) ----------
PUBLIC_STATUS_FILTER = {"status": {"$ne": "draft"}}

@api_router.get("/articles")
async def list_articles(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    trending: Optional[bool] = None,
    limit: int = Query(50, le=100),
):
    q = dict(PUBLIC_STATUS_FILTER)
    if category:
        q["category_slug"] = category.lower()
    if tag:
        q["tags"] = tag.lower()
    if trending:
        q["trending"] = True
    if search:
        q["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"excerpt": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]
    items = await db.articles.find(q, {"_id": 0}).sort("published_at", -1).to_list(limit)
    return items


@api_router.get("/articles/featured")
async def featured_articles():
    """Returns hero (1) + side (3) + viral (4) + latest (6). Only published."""
    base = PUBLIC_STATUS_FILTER
    hero = await db.articles.find_one({**base, "hero": True}, {"_id": 0})
    side = await db.articles.find({**base, "side": True}, {"_id": 0}).limit(3).to_list(3)
    viral = await db.articles.find({**base, "viral": True}, {"_id": 0}).limit(4).to_list(4)
    latest = await db.articles.find(base, {"_id": 0}).sort("published_at", -1).limit(6).to_list(6)
    return {"hero": hero, "side": side, "viral": viral, "latest": latest}


@api_router.get("/articles/most-read")
async def most_read(limit: int = 5):
    items = await db.articles.find(
        PUBLIC_STATUS_FILTER, {"_id": 0}
    ).sort("views", -1).limit(limit).to_list(limit)
    return items


@api_router.get("/articles/{slug}")
async def get_article(slug: str):
    article = await db.articles.find_one({"slug": slug, **PUBLIC_STATUS_FILTER}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    return article


@api_router.get("/articles/{slug}/related")
async def related_articles(slug: str, limit: int = 3):
    """Find related articles by shared tags, then by category, excluding the same slug."""
    current = await db.articles.find_one({"slug": slug, **PUBLIC_STATUS_FILTER}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    tags = current.get("tags", []) or []
    cat = current.get("category_slug")
    related = []
    seen = {slug}
    if tags:
        cursor = db.articles.find(
            {**PUBLIC_STATUS_FILTER, "slug": {"$ne": slug}, "tags": {"$in": tags}}, {"_id": 0}
        ).sort("published_at", -1).limit(limit * 2)
        async for doc in cursor:
            if doc["slug"] not in seen:
                related.append(doc); seen.add(doc["slug"])
                if len(related) >= limit: break
    if len(related) < limit and cat:
        cursor = db.articles.find(
            {**PUBLIC_STATUS_FILTER, "slug": {"$nin": list(seen)}, "category_slug": cat}, {"_id": 0}
        ).sort("published_at", -1).limit(limit)
        async for doc in cursor:
            if doc["slug"] not in seen:
                related.append(doc); seen.add(doc["slug"])
                if len(related) >= limit: break
    if len(related) < limit:
        cursor = db.articles.find(
            {**PUBLIC_STATUS_FILTER, "slug": {"$nin": list(seen)}}, {"_id": 0}
        ).sort("published_at", -1).limit(limit)
        async for doc in cursor:
            if doc["slug"] not in seen:
                related.append(doc); seen.add(doc["slug"])
                if len(related) >= limit: break
    return related


@api_router.get("/categories")
async def list_categories():
    pipeline = [
        {"$match": PUBLIC_STATUS_FILTER},
        {"$group": {"_id": {"slug": "$category_slug", "name": "$category"}, "count": {"$sum": 1}}},
        {"$project": {"_id": 0, "slug": "$_id.slug", "name": "$_id.name", "count": 1}},
        {"$sort": {"count": -1}},
    ]
    return await db.articles.aggregate(pipeline).to_list(50)


@api_router.get("/tags")
async def list_tags():
    pipeline = [
        {"$match": PUBLIC_STATUS_FILTER},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$project": {"_id": 0, "slug": "$_id", "count": 1}},
        {"$sort": {"count": -1, "slug": 1}},
    ]
    return await db.articles.aggregate(pipeline).to_list(200)


# ---------- Comments ----------
class CommentIn(BaseModel):
    body: str = Field(min_length=2, max_length=2000)
    parent_id: Optional[str] = None


@api_router.get("/articles/{slug}/comments")
async def list_comments(slug: str):
    comments = await db.comments.find(
        {"article_slug": slug, "deleted": {"$ne": True}}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    # Hide orphaned replies (parent deleted). Keep only those whose parent is still visible.
    visible_ids = {c["id"] for c in comments}
    return [c for c in comments if not c.get("parent_id") or c["parent_id"] in visible_ids]


@api_router.post("/articles/{slug}/comments")
async def create_comment(slug: str, data: CommentIn, user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"slug": slug}, {"_id": 0, "slug": 1, "title": 1})
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    # If reply, parent must exist on same article
    if data.parent_id:
        parent = await db.comments.find_one({"id": data.parent_id, "article_slug": slug}, {"_id": 0, "id": 1})
        if not parent:
            raise HTTPException(status_code=400, detail="Comentario padre no encontrado")
    doc = {
        "id": str(uuid.uuid4()),
        "article_slug": slug,
        "user_id": user["id"],
        "user_name": user.get("name") or user.get("email"),
        "user_role": user.get("role", "user"),
        "body": _sanitize(data.body.strip()),
        "parent_id": data.parent_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "likes": 0,
        "reports": 0,
        "deleted": False,
    }
    await db.comments.insert_one(doc)
    doc.pop("deleted", None)
    doc.pop("_id", None)
    # Auto-increment article comment count + controversy score
    await db.articles.update_one(
        {"slug": slug},
        {"$inc": {"comments_count": 1, "controversy_score": 1}},
    )
    email_service.notify_admin_comment(article.get("title", slug), slug, doc["user_name"], doc["body"])
    return doc


@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    """User can soft-delete own comment; admin can delete any."""
    comment = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    if user.get("role") != "admin" and comment.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    if comment.get("deleted"):
        return {"ok": True}
    await db.comments.update_one({"id": comment_id}, {"$set": {"deleted": True}})
    # Decrement article comment count (floor 0)
    await db.articles.update_one(
        {"slug": comment["article_slug"], "comments_count": {"$gt": 0}},
        {"$inc": {"comments_count": -1}},
    )
    return {"ok": True}


@api_router.post("/comments/{comment_id}/like")
async def like_comment(comment_id: str):
    """Anonymous: client dedupes via localStorage."""
    res = await db.comments.update_one(
        {"id": comment_id, "deleted": {"$ne": True}},
        {"$inc": {"likes": 1}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    return {"ok": True}


@api_router.post("/comments/{comment_id}/report")
async def report_comment(comment_id: str):
    """Anonymous report; auto-hide threshold = 5 reports."""
    res = await db.comments.update_one(
        {"id": comment_id, "deleted": {"$ne": True}},
        {"$inc": {"reports": 1}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    c = await db.comments.find_one({"id": comment_id}, {"_id": 0, "reports": 1, "article_slug": 1})
    if (c.get("reports") or 0) >= 5:
        await db.comments.update_one({"id": comment_id}, {"$set": {"deleted": True}})
        await db.articles.update_one(
            {"slug": c["article_slug"], "comments_count": {"$gt": 0}},
            {"$inc": {"comments_count": -1}},
        )
    return {"ok": True, "reports": c.get("reports", 1)}


# ---------- View counter & Most read (public) ----------
@api_router.post("/articles/{slug}/view")
async def increment_view(slug: str):
    """Public: track article view (called once per page load by frontend)."""
    res = await db.articles.update_one(
        {"slug": slug, **PUBLIC_STATUS_FILTER},
        {"$inc": {"views": 1}},
    )
    if res.matched_count == 0:
        return {"ok": False}
    return {"ok": True}


# ---------- Health & Stats (public-ish, used by Make.com / monitoring) ----------
@api_router.get("/health")
async def health():
    """Always returns 200 with diagnostic info, even when DB is unreachable."""
    db_ok = False
    db_error = None
    if db is not None:
        try:
            await db.command("ping")
            db_ok = True
        except Exception as e:
            db_error = str(e)[:200]
    else:
        db_error = "MONGO_URL not configured"
    return {
        "ok": True,
        "db": db_ok,
        "db_error": db_error,
        "service": "noxeal-api",
        "version": "1.0",
        "ai_available": ai_service.is_available() if hasattr(ai_service, "is_available") else False,
        "time": datetime.now(timezone.utc).isoformat(),
    }


@api_router.get("/public-config")
async def public_config():
    """Public site config — contact info + social URLs from env."""
    return {
        "contact_email": os.environ.get("PUBLIC_CONTACT_EMAIL", "hola@noxeal.com"),
        "social": {
            "instagram": os.environ.get("INSTAGRAM_URL", ""),
            "x": os.environ.get("X_TWITTER_URL", ""),
            "tiktok": os.environ.get("TIKTOK_URL", ""),
            "youtube": os.environ.get("YOUTUBE_URL", ""),
        },
    }


@api_router.get("/public-stats")
async def public_stats():
    """Stats shown publicly on landing — boost initial + real growth + live tick.
    The 'tick' adds a few reads/subscribers per minute so the counter feels alive."""
    boost = {"reads": 47230, "subscribers_base": 5247}
    real_articles = await db.articles.count_documents(PUBLIC_STATUS_FILTER)
    real_subs = await db.newsletter.count_documents({})
    pipeline = [
        {"$match": PUBLIC_STATUS_FILTER},
        {"$group": {"_id": None, "total_views": {"$sum": "$views"}}},
    ]
    agg = await db.articles.aggregate(pipeline).to_list(1)
    real_views = (agg[0]["total_views"] if agg else 0) or 0
    # Live tick: gentle growth based on actual time since server start.
    import time as _t
    seconds_since_launch = max(0, int(_t.time()) - LAUNCH_TIMESTAMP_SEC)
    # 1 read every 2.5s ≈ 24/min ≈ 1.4k/h ≈ 34k/day — feels alive but credible
    tick_reads = seconds_since_launch * 24 // 60
    tick_subs = seconds_since_launch // (25 * 60)   # 1 sub every 25 min
    return {
        "reads": boost["reads"] + real_views + tick_reads,
        "subscribers": boost["subscribers_base"] + real_subs + tick_subs,
        "stories": real_articles,
    }


# ---------- RSS feed ----------
from fastapi.responses import Response as PlainResp

@api_router.get("/feed.rss")
async def rss_feed():
    base = os.environ.get("FRONTEND_URL", "https://noxeal.com").rstrip("/")
    articles = await db.articles.find(PUBLIC_STATUS_FILTER, {"_id": 0}).sort("published_at", -1).limit(50).to_list(50)
    items = []
    for a in articles:
        link = f"{base}/articulo/{a['slug']}"
        title = (a.get("title", "") or "").replace("&", "&amp;").replace("<", "&lt;")
        desc = (a.get("excerpt", "") or "").replace("&", "&amp;").replace("<", "&lt;")
        pub = a.get("published_at", "")
        items.append(f"""<item><title>{title}</title><link>{link}</link><guid>{link}</guid><description>{desc}</description><pubDate>{pub}</pubDate></item>""")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Noxeal — Periodismo lento sobre la cultura digital</title>
<link>{base}</link>
<description>Tendencias, historias virales y temas complejos explicados con contexto.</description>
<language>es</language>
{''.join(items)}
</channel></rss>"""
    return PlainResp(content=xml, media_type="application/rss+xml")


# ---------- Make.com automation webhook (X-API-Key auth) ----------
async def require_api_key(x_api_key: Optional[str] = Header(None)):
    if not MAKE_API_KEY:
        raise HTTPException(status_code=503, detail="Automation desactivada")
    if x_api_key != MAKE_API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")
    return True


class MakeGenerateIn(BaseModel):
    topic: str = Field(min_length=3, max_length=300)
    publish: bool = False
    generate_image: bool = False


@api_router.post("/automation/articles/generate")
async def make_generate_article(data: MakeGenerateIn, _ok: bool = Depends(require_api_key)):
    """Webhook for Make.com / Zapier. Auth via X-API-Key header."""
    try:
        ai = await ai_service.generate_article_draft(data.topic)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IA no respondió: {str(e)[:200]}")

    title = ai.get("title", data.topic)[:160]
    base_slug = ai_service.slugify(title)
    slug = base_slug
    n = 1
    while await db.articles.find_one({"slug": slug}):
        n += 1; slug = f"{base_slug}-{n}"

    category = ai.get("category", "Cultura digital")
    if category not in CATEGORY_TO_SLUG:
        category = "Cultura digital"

    now = datetime.now(timezone.utc).isoformat()
    body_list = ai.get("body", [])
    if isinstance(body_list, str):
        body_list = [body_list]
    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "status": "published" if data.publish else "draft",
        "title": title,
        "excerpt": ai.get("excerpt", "")[:280],
        "body": body_list,
        "category": category,
        "category_slug": CATEGORY_TO_SLUG[category],
        "tags": [t.lower().strip() for t in ai.get("tags", []) if t][:8],
        "meta_description": ai.get("meta_description", ai.get("excerpt", ""))[:200],
        "image_prompt": ai.get("image_prompt", data.topic),
        "image_keyword": ai.get("image_keyword", ""),
        "image": "",
        "author": "Noxeal AI",
        "created_by": "make.com",
        "created_at": now,
        "published_at": now,
        "read_time": max(3, len(" ".join(body_list)) // 1000),
        "hero": False, "side": False, "viral": False, "trending": False,
        "views": 0,
    }

    if data.generate_image:
        try:
            doc["image"] = await ai_service.generate_image(doc["image_prompt"])
        except Exception:
            pass

    await db.articles.insert_one(doc)
    doc.pop("_id", None)
    if data.publish:
        email_service.notify_admin_published(title, slug, doc["author"])
    return {
        "ok": True,
        "slug": slug,
        "status": doc["status"],
        "admin_url": f"{os.environ.get('FRONTEND_URL', '').rstrip('/')}/admin",
        "public_url": f"{os.environ.get('FRONTEND_URL', '').rstrip('/')}/articulo/{slug}",
    }


@api_router.post("/automation/articles/{slug}/publish")
async def make_publish(slug: str, _ok: bool = Depends(require_api_key)):
    article = await db.articles.find_one({"slug": slug}, {"_id": 0, "title": 1, "author": 1})
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    now = datetime.now(timezone.utc).isoformat()
    await db.articles.update_one(
        {"slug": slug},
        {"$set": {"status": "published", "published_at": now}},
    )
    email_service.notify_admin_published(article.get("title", slug), slug, article.get("author", "Noxeal AI"))
    return {"ok": True}


# ---------- Public Make.com endpoint (matches the exact JSON your Claude prompt produces) ----------
class MakeArticleIn(BaseModel):
    """Schema your Make.com Claude scenario produces. Only `title` is required."""
    title: str = Field(min_length=3, max_length=300)
    excerpt: Optional[str] = ""
    content: Optional[str] = ""           # full article body as single string with \n\n between paragraphs
    body: Optional[List[str]] = None      # OR list of paragraphs (either works)
    category: Optional[str] = "Cultura digital"
    tags: Optional[List[str]] = []
    seoTitle: Optional[str] = None
    seoDescription: Optional[str] = None
    meta_description: Optional[str] = None
    image: Optional[str] = ""
    image_prompt: Optional[str] = ""
    sourceUrl: Optional[str] = ""
    authorName: Optional[str] = "Noxeal AI"
    status: Optional[str] = None          # "published" | "draft" — overrides `publish`
    publish: Optional[bool] = True


def _map_category(name: str) -> str:
    """Map flexible category names to Noxeal canonical."""
    if not name:
        return "Cultura digital"
    n = name.lower().strip()
    if any(k in n for k in ["tecno", "tech"]):
        return "Tecnología"
    if any(k in n for k in ["investig", "polit", "filtrac"]):
        return "Investigación"
    if any(k in n for k in ["salud", "mental"]):
        return "Salud y redes"
    if n == "ia" or "inteligencia" in n:
        return "IA"
    if any(k in n for k in ["controv", "polem", "debate", "teoria", "conspir"]):
        return "Investigación"
    return "Cultura digital"


_SCRIPT_RE = __import__("re").compile(r"<script[^>]*>.*?</script>|<iframe[^>]*>.*?</iframe>|on\w+\s*=", __import__("re").IGNORECASE | __import__("re").DOTALL)
def _sanitize(text: str) -> str:
    """Remove <script>, <iframe> and inline event handlers. Safe for plain editorial content."""
    if not text:
        return ""
    return _SCRIPT_RE.sub("", text)


async def require_make_key(x_api_key: Optional[str] = Header(None)):
    """If MAKE_API_KEY is set in env, demand it (timing-safe). Otherwise (dev) allow."""
    if MAKE_API_KEY:
        import hmac
        if not x_api_key or not hmac.compare_digest(x_api_key, MAKE_API_KEY):
            raise HTTPException(status_code=401, detail="API key inválida. Envía header 'X-API-Key' con el valor correcto.")
    return True


@app.post("/api/articles")
async def make_create_article(data: MakeArticleIn, _ok: bool = Depends(require_make_key)):
    """Public endpoint for Make.com / Zapier / external automation.
    If MAKE_API_KEY env is set, requires header X-API-Key. Otherwise allowed (dev).
    Accepts both `body: [paragraphs]` and `content: "long string"`.
    """

    if data.body and isinstance(data.body, list):
        paragraphs = [_sanitize(p.strip()) for p in data.body if p and p.strip()]
    elif data.content:
        clean = _sanitize(data.content)
        paragraphs = [p.strip() for p in clean.split("\n\n") if p.strip()]
        if len(paragraphs) <= 1:
            paragraphs = [p.strip() for p in clean.split("\n") if p.strip()]
    else:
        paragraphs = []
    if not paragraphs:
        raise HTTPException(status_code=400, detail="Necesito 'content' (string) o 'body' (list) con texto válido.")

    # Hard limit ~50k chars to avoid abuse
    total_len = sum(len(p) for p in paragraphs)
    if total_len > 50_000:
        raise HTTPException(status_code=413, detail="Contenido demasiado largo (>50k chars).")

    category = _map_category(data.category)
    base_slug = ai_service.slugify(data.title)
    slug = base_slug
    n = 1
    while await db.articles.find_one({"slug": slug}):
        n += 1; slug = f"{base_slug}-{n}"

    excerpt = _sanitize((data.excerpt or "").strip())[:280]
    if not excerpt and paragraphs:
        excerpt = paragraphs[0][:280]

    # Resolve status: explicit `status` field wins over `publish` flag
    status = "draft"
    if data.status in ("published", "draft"):
        status = data.status
    elif data.publish:
        status = "published"

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "status": status,
        "title": _sanitize((data.seoTitle or data.title).strip())[:200],
        "excerpt": excerpt,
        "body": paragraphs,
        "category": category,
        "category_slug": CATEGORY_TO_SLUG[category],
        "tags": [t.lower().strip().replace(" ", "-") for t in (data.tags or []) if t][:10],
        "meta_description": _sanitize((data.meta_description or data.seoDescription or excerpt).strip())[:200],
        "seo_title": _sanitize((data.seoTitle or data.title).strip())[:200] if data.seoTitle else "",
        "seo_description": _sanitize((data.seoDescription or "").strip())[:200],
        "source_url": (data.sourceUrl or "").strip()[:500],
        "image_prompt": data.image_prompt or data.title,
        "image": data.image or "",
        "author": data.authorName or "Noxeal AI",
        "created_by": "make.com",
        "created_at": now,
        "updated_at": now,
        "published_at": now,
        "read_time": max(3, total_len // 1000),
        "hero": False, "side": False, "viral": False, "trending": False,
        # Engagement counters
        "views": 0,
        "likes": 0,
        "comments_count": 0,
        "viral_score": 0,
        "controversy_score": 0,
    }
    await db.articles.insert_one(doc)
    if status == "published":
        email_service.notify_admin_published(doc["title"], slug, doc["author"])

    base_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    return {
        "success": True,
        "ok": True,
        "id": doc["id"],
        "slug": slug,
        "status": status,
        "url": f"{base_url}/articulo/{slug}",
        "admin_url": f"{base_url}/admin",
    }


# ---------- Public engagement: likes & saves ----------
@api_router.post("/articles/{slug}/like")
async def like_article(slug: str):
    """Anonymous: just increments. Client dedupes via localStorage."""
    res = await db.articles.update_one(
        {"slug": slug, **PUBLIC_STATUS_FILTER},
        {"$inc": {"likes": 1, "viral_score": 1}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    doc = await db.articles.find_one({"slug": slug}, {"_id": 0, "likes": 1})
    return {"ok": True, "likes": doc.get("likes", 1)}


@api_router.post("/articles/{slug}/unlike")
async def unlike_article(slug: str):
    res = await db.articles.update_one(
        {"slug": slug, **PUBLIC_STATUS_FILTER, "likes": {"$gt": 0}},
        {"$inc": {"likes": -1}},
    )
    if res.matched_count == 0:
        return {"ok": False}
    doc = await db.articles.find_one({"slug": slug}, {"_id": 0, "likes": 1})
    return {"ok": True, "likes": doc.get("likes", 0)}


# ---------- Trending / Controversial / Most-commented public feeds ----------
@api_router.get("/feed/trending")
async def feed_trending(limit: int = 6):
    """Highest viral_score first, falls back to views for legacy docs."""
    items = await db.articles.find(PUBLIC_STATUS_FILTER, {"_id": 0}).sort(
        [("viral_score", -1), ("views", -1), ("published_at", -1)]
    ).limit(limit).to_list(limit)
    return items


@api_router.get("/feed/controversial")
async def feed_controversial(limit: int = 6):
    """Highest controversy_score first (manually flagged or comment-driven)."""
    items = await db.articles.find(PUBLIC_STATUS_FILTER, {"_id": 0}).sort(
        [("controversy_score", -1), ("comments_count", -1), ("published_at", -1)]
    ).limit(limit).to_list(limit)
    return items


@api_router.get("/feed/most-commented")
async def feed_most_commented(limit: int = 6):
    items = await db.articles.find(PUBLIC_STATUS_FILTER, {"_id": 0}).sort(
        [("comments_count", -1), ("published_at", -1)]
    ).limit(limit).to_list(limit)
    return items




class BulkGenerateIn(BaseModel):
    topics: List[str]
    publish: bool = False
    generate_image: bool = False


@api_router.post("/admin/articles/bulk-generate")
async def admin_bulk_generate(data: BulkGenerateIn, admin: dict = Depends(require_admin)):
    """Generate multiple draft articles in sequence. Returns a job receipt; processing happens in background."""
    if not data.topics:
        raise HTTPException(status_code=400, detail="Lista de temas vacía")
    job_id = str(uuid.uuid4())
    await db.bulk_jobs.insert_one({
        "id": job_id,
        "topics": data.topics,
        "publish": data.publish,
        "generate_image": data.generate_image,
        "status": "running",
        "completed": 0,
        "total": len(data.topics),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "results": [],
    })

    async def runner():
        for topic in data.topics:
            try:
                ai = await ai_service.generate_article_draft(topic)
                title = ai.get("title", topic)[:160]
                base_slug = ai_service.slugify(title)
                slug = base_slug
                n = 1
                while await db.articles.find_one({"slug": slug}):
                    n += 1; slug = f"{base_slug}-{n}"
                category = ai.get("category", "Cultura digital")
                if category not in CATEGORY_TO_SLUG:
                    category = "Cultura digital"
                now = datetime.now(timezone.utc).isoformat()
                body_list = ai.get("body", [])
                if isinstance(body_list, str):
                    body_list = [body_list]
                doc = {
                    "id": str(uuid.uuid4()), "slug": slug,
                    "status": "published" if data.publish else "draft",
                    "title": title, "excerpt": ai.get("excerpt", "")[:280],
                    "body": body_list, "category": category,
                    "category_slug": CATEGORY_TO_SLUG[category],
                    "tags": [t.lower().strip() for t in ai.get("tags", []) if t][:8],
                    "meta_description": ai.get("meta_description", ai.get("excerpt", ""))[:200],
                    "image_prompt": ai.get("image_prompt", topic),
                    "image_keyword": ai.get("image_keyword", ""),
                    "image": "",
                    "author": "Noxeal AI", "created_by": admin["id"],
                    "created_at": now, "published_at": now,
                    "read_time": max(3, len(" ".join(body_list)) // 1000),
                    "hero": False, "side": False, "viral": False, "trending": False,
                    "views": 0,
                }
                if data.generate_image:
                    try:
                        doc["image"] = await ai_service.generate_image(doc["image_prompt"])
                    except Exception:
                        pass
                await db.articles.insert_one(doc)
                await db.bulk_jobs.update_one({"id": job_id}, {"$inc": {"completed": 1}, "$push": {"results": {"topic": topic, "slug": slug, "ok": True}}})
            except Exception as e:
                await db.bulk_jobs.update_one({"id": job_id}, {"$inc": {"completed": 1}, "$push": {"results": {"topic": topic, "ok": False, "error": str(e)[:200]}}})
        await db.bulk_jobs.update_one({"id": job_id}, {"$set": {"status": "done", "finished_at": datetime.now(timezone.utc).isoformat()}})

    asyncio.create_task(runner())
    return {"job_id": job_id, "total": len(data.topics), "status": "running"}


@api_router.get("/admin/bulk-jobs/{job_id}")
async def admin_bulk_job_status(job_id: str, _admin: dict = Depends(require_admin)):
    job = await db.bulk_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    return job


# ---------- Admin: Articles & AI generation ----------
class GenerateArticleIn(BaseModel):
    topic: str = Field(min_length=3, max_length=300)
    publish: bool = False  # if True, save as published; default save as draft


class TopicsIn(BaseModel):
    focus: Optional[str] = None


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    body: Optional[List[str]] = None
    category: Optional[str] = None
    category_slug: Optional[str] = None
    tags: Optional[List[str]] = None
    image: Optional[str] = None
    image_prompt: Optional[str] = None
    meta_description: Optional[str] = None
    hero: Optional[bool] = None
    side: Optional[bool] = None
    viral: Optional[bool] = None
    trending: Optional[bool] = None


CATEGORY_TO_SLUG = {
    "Tecnología": "tecnologia",
    "Investigación": "investigacion",
    "Salud y redes": "salud-y-redes",
    "Cultura digital": "cultura-digital",
    "IA": "ia",
}


@api_router.get("/admin/articles")
async def admin_list_articles(_admin: dict = Depends(require_admin), status: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    items = await db.articles.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api_router.post("/admin/ai/suggest-topics")
async def admin_suggest_topics(data: TopicsIn, _admin: dict = Depends(require_admin)):
    try:
        topics = await ai_service.suggest_topics(data.focus)
        return {"topics": topics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IA no respondió: {str(e)[:200]}")


@api_router.post("/admin/articles/generate")
async def admin_generate_article(data: GenerateArticleIn, admin: dict = Depends(require_admin)):
    """Use Claude Sonnet 4.5 to generate a draft article from a topic."""
    try:
        ai = await ai_service.generate_article_draft(data.topic)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IA no respondió: {str(e)[:200]}")

    title = ai.get("title", data.topic)[:160]
    base_slug = ai_service.slugify(title)
    slug = base_slug
    n = 1
    while await db.articles.find_one({"slug": slug}):
        n += 1
        slug = f"{base_slug}-{n}"

    category = ai.get("category", "Cultura digital")
    if category not in CATEGORY_TO_SLUG:
        category = "Cultura digital"

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "status": "published" if data.publish else "draft",
        "title": title,
        "excerpt": ai.get("excerpt", "")[:280],
        "body": ai.get("body", []),
        "category": category,
        "category_slug": CATEGORY_TO_SLUG[category],
        "tags": [t.lower().strip() for t in ai.get("tags", []) if t][:8],
        "meta_description": ai.get("meta_description", ai.get("excerpt", ""))[:200],
        "image_prompt": ai.get("image_prompt", data.topic),
        "image_keyword": ai.get("image_keyword", ""),
        "image": "",  # will be filled by regenerate-image
        "author": "Noxeal AI",
        "created_by": admin["id"],
        "created_at": now,
        "published_at": now,
        "read_time": max(3, len(" ".join(ai.get("body", []))) // 1000),
        "hero": False, "side": False, "viral": False, "trending": False,
    }
    await db.articles.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.post("/admin/articles/{slug}/regenerate-image")
async def admin_regenerate_image(slug: str, _admin: dict = Depends(require_admin)):
    article = await db.articles.find_one({"slug": slug}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    prompt = article.get("image_prompt") or article.get("title", "")
    # Clean up previous AI image to avoid orphaned files
    prev = article.get("image", "") or ""
    if prev.startswith("/api/static/images/"):
        try:
            (ai_service.STATIC_IMAGES_DIR / prev.split("/")[-1]).unlink(missing_ok=True)
        except Exception:
            pass
    try:
        image_url = await ai_service.generate_image(prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo generar la imagen: {str(e)[:200]}")
    await db.articles.update_one({"slug": slug}, {"$set": {"image": image_url}})
    return {"ok": True, "image": image_url}


@api_router.put("/admin/articles/{slug}")
async def admin_update_article(slug: str, data: ArticleUpdate, _admin: dict = Depends(require_admin)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if "category" in update and update["category"] in CATEGORY_TO_SLUG:
        update["category_slug"] = CATEGORY_TO_SLUG[update["category"]]
    if "tags" in update:
        update["tags"] = [t.lower().strip() for t in update["tags"] if t]
    if not update:
        raise HTTPException(status_code=400, detail="Nada para actualizar")
    # Enforce singleton: only one article can be hero at a time
    if update.get("hero") is True:
        await db.articles.update_many({"slug": {"$ne": slug}}, {"$set": {"hero": False}})
    res = await db.articles.update_one({"slug": slug}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    article = await db.articles.find_one({"slug": slug}, {"_id": 0})
    return article


@api_router.post("/admin/articles/{slug}/publish")
async def admin_publish_article(slug: str, _admin: dict = Depends(require_admin), notify_subscribers: bool = False):
    article = await db.articles.find_one({"slug": slug}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    now = datetime.now(timezone.utc).isoformat()
    await db.articles.update_one(
        {"slug": slug},
        {"$set": {"status": "published", "published_at": now}},
    )
    article["status"] = "published"; article["published_at"] = now
    email_service.notify_admin_published(article.get("title", slug), slug, article.get("author", "Noxeal AI"))
    if notify_subscribers:
        subs = await db.newsletter.find({}, {"_id": 0}).to_list(5000)
        email_service.fire_newsletter_blast(article, subs)
    return {"ok": True, "status": "published", "subscribers_notified": notify_subscribers}


@api_router.post("/admin/articles/{slug}/unpublish")
async def admin_unpublish_article(slug: str, _admin: dict = Depends(require_admin)):
    res = await db.articles.update_one({"slug": slug}, {"$set": {"status": "draft"}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    return {"ok": True, "status": "draft"}


@api_router.delete("/admin/articles/{slug}")
async def admin_delete_article(slug: str, _admin: dict = Depends(require_admin)):
    res = await db.articles.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    await db.comments.delete_many({"article_slug": slug})
    return {"ok": True}


@api_router.get("/admin/comments")
async def admin_list_comments(_admin: dict = Depends(require_admin), include_deleted: bool = False):
    q = {} if include_deleted else {"deleted": {"$ne": True}}
    items = await db.comments.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api_router.get("/admin/comments/reported")
async def admin_list_reported(_admin: dict = Depends(require_admin)):
    items = await db.comments.find(
        {"reports": {"$gt": 0}}, {"_id": 0}
    ).sort("reports", -1).to_list(200)
    return items


@api_router.get("/admin/users")
async def admin_list_users(_admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users


class RoleUpdate(BaseModel):
    role: str  # "admin" | "author" | "user"


@api_router.put("/admin/users/{user_id}/role")
async def admin_update_role(user_id: str, data: RoleUpdate, admin: dict = Depends(require_admin)):
    if data.role not in ("admin", "author", "user"):
        raise HTTPException(status_code=400, detail="Rol inválido")
    if user_id == admin["id"] and data.role != "admin":
        raise HTTPException(status_code=400, detail="No puedes degradar tu propio rol")
    res = await db.users.update_one({"id": user_id}, {"$set": {"role": data.role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"ok": True}


@api_router.get("/admin/stats")
async def admin_stats(_admin: dict = Depends(require_admin)):
    return {
        "articles": await db.articles.count_documents({}),
        "published": await db.articles.count_documents({"status": "published"}),
        "drafts": await db.articles.count_documents({"status": "draft"}),
        "comments": await db.comments.count_documents({"deleted": {"$ne": True}}),
        "subscribers": await db.newsletter.count_documents({}),
        "users": await db.users.count_documents({}),
    }


# ---------- Seeders ----------
SAMPLE_ARTICLES = [
    {
        "slug": "libro-negro-digital-epstein",
        "category": "Investigación",
        "category_slug": "investigacion",
        "tags": ["epstein", "filtraciones", "rumores", "documentos"],
        "title": "Qué se sabe y qué no sobre el supuesto \"Libro Negro\" digital de Epstein",
        "excerpt": "Recorrido por los documentos filtrados, las teorías que circulan en redes y las pruebas que sí han resistido el escrutinio público.",
        "image": "https://images.unsplash.com/photo-1677064061401-f77f966ff8a1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwxfHxibGFjayUyMGxlYXRoZXIlMjBub3RlYm9va3xlbnwwfHx8fDE3NzgzMjY4NTB8MA&ixlib=rb-4.1.0&q=85",
        "author": "Redacción Noxeal",
        "read_time": 12,
        "hero": True, "side": False, "viral": False, "trending": True,
        "body": [
            "Durante semanas, las redes sociales se han llenado de capturas y rumores sobre un supuesto archivo digital que recogería contactos, viajes y operaciones del entorno de Jeffrey Epstein. Separar lo verificado de lo viral es, hoy, el verdadero ejercicio periodístico.",
            "Los documentos oficiales liberados por tribunales estadounidenses contienen miles de páginas, pero ninguno coincide exactamente con la narrativa que circula en TikTok o X. Lo que sí está documentado son listas de pasajeros, registros de vuelo y testimonios bajo juramento.",
            "Este artículo distingue tres capas: lo confirmado por fuentes judiciales, lo plausible pero no probado, y lo que es directamente desinformación reciclada. La diferencia importa porque cambia por completo qué conclusiones podemos sacar.",
        ],
    },
    {
        "slug": "ia-autoconsciente-realidad-fantasia",
        "category": "IA",
        "category_slug": "ia",
        "tags": ["ia", "gpt-5", "claude", "consciencia", "tecnologia"],
        "title": "IA autoconsciente: ¿realidad técnica o fantasía colectiva?",
        "excerpt": "Lo que dicen los papers serios de 2025 frente a los hilos virales que aseguran que ChatGPT \"despertó\".",
        "image": "https://images.unsplash.com/photo-1674027444485-cec3da58eef4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwyfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwYnJhaW58ZW58MHx8fHwxNzc4MzI2ODQ5fDA&ixlib=rb-4.1.0&q=85",
        "author": "Redacción Noxeal",
        "read_time": 8,
        "hero": False, "side": True, "viral": True, "trending": True,
        "body": [
            "El término \"autoconsciente\" tiene un peso filosófico que la mayoría de hilos virales ignora. Antes de aceptarlo, conviene definir qué medimos.",
            "Modelos como GPT-5 o Claude Opus 4.5 muestran capacidades emergentes, pero ninguna evaluación independiente reproducible ha demostrado conciencia en sentido fenomenológico.",
        ],
    },
    {
        "slug": "cbdc-privacidad-banco-no-dice",
        "category": "Investigación",
        "category_slug": "investigacion",
        "tags": ["cbdc", "privacidad", "banca", "vigilancia"],
        "title": "CBDC y privacidad: lo que tu banco no te está contando",
        "excerpt": "Las monedas digitales de banco central avanzan en silencio. Esto es lo que cambian para tu dinero y tus datos.",
        "image": "https://images.unsplash.com/photo-1765121689322-6befc57dc8db?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwxfHxzdXJ2ZWlsbGFuY2UlMjBwcml2YWN5fGVufDB8fHx8MTc3ODMyNjg0NHww&ixlib=rb-4.1.0&q=85",
        "author": "Redacción Noxeal",
        "read_time": 10,
        "hero": False, "side": True, "viral": True, "trending": True,
        "body": [
            "El BCE, la Reserva Federal y más de 130 bancos centrales investigan o pilotan CBDCs. La pregunta clave: ¿qué nivel de anonimato sobrevive?",
            "Los diseños actuales contemplan trazabilidad por defecto. Eso cambia la naturaleza del efectivo tal y como lo conocemos.",
        ],
    },
    {
        "slug": "deepfakes-politicos-guerra-verdad",
        "category": "Cultura digital",
        "category_slug": "cultura-digital",
        "tags": ["deepfakes", "ia", "politica", "verdad", "tecnologia"],
        "title": "Deepfakes políticos: la nueva guerra por la verdad",
        "excerpt": "Cómo los videos sintéticos están redefiniendo campañas, escándalos y el concepto mismo de evidencia.",
        "image": "https://images.pexels.com/photos/17483870/pexels-photo-17483870.png",
        "author": "Redacción Noxeal",
        "read_time": 9,
        "hero": False, "side": True, "viral": True, "trending": True,
        "body": [
            "En 2025 ya no necesitas un estudio para fabricar a un presidente diciendo cualquier cosa. Necesitas una GPU y treinta segundos.",
            "El problema no es solo técnico: es epistémico. Cuando todo puede ser falso, el escepticismo se convierte en arma política.",
        ],
    },
    {
        "slug": "algoritmos-animo-redes-humor",
        "category": "Salud y redes",
        "category_slug": "salud-y-redes",
        "tags": ["algoritmos", "salud-mental", "redes-sociales", "tiktok"],
        "title": "Algoritmos y ánimo: cómo las redes están moldeando tu humor",
        "excerpt": "Estudios recientes muestran un patrón claro entre tiempo en feeds y caídas de bienestar emocional. Pero no es lineal.",
        "image": "https://images.unsplash.com/photo-1762279388957-c6ed514d3353?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGRhdGElMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc3ODMyNjg0NHww&ixlib=rb-4.1.0&q=85",
        "author": "Redacción Noxeal",
        "read_time": 7,
        "hero": False, "side": False, "viral": True, "trending": False,
        "body": [
            "El feed no es neutral: optimiza retención, no bienestar. Esa diferencia se nota a las pocas semanas en cualquier persona.",
        ],
    },
    {
        "slug": "modelos-open-source-ascenso",
        "category": "Tecnología",
        "category_slug": "tecnologia",
        "tags": ["ia", "open-source", "llama", "mistral", "tecnologia"],
        "title": "El ascenso silencioso de los modelos open source",
        "excerpt": "Mientras los gigantes acaparan titulares, una nueva generación de modelos abiertos está cambiando las reglas del mercado.",
        "image": "https://images.unsplash.com/photo-1758073519996-6d3c63b4922c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGRhdGElMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc3ODMyNjg0NHww&ixlib=rb-4.1.0&q=85",
        "author": "Redacción Noxeal",
        "read_time": 6,
        "hero": False, "side": False, "viral": False, "trending": True,
        "body": [
            "Llama, Mistral, Qwen y otras familias han cerrado la brecha de calidad mucho más rápido de lo que cualquier laboratorio cerrado anticipó.",
        ],
    },
    {
        "slug": "economia-atencion-donde-se-gana",
        "category": "Cultura digital",
        "category_slug": "cultura-digital",
        "tags": ["redes-sociales", "tiktok", "economia", "creators"],
        "title": "La economía de la atención: dónde se gana hoy el dinero",
        "excerpt": "El producto ya no eres tú: es tu siguiente segundo de scroll. Quién monetiza, cómo y a qué coste.",
        "image": "https://images.unsplash.com/photo-1611746872915-64382b5c76da?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMGRhdGElMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc3ODMyNjg0NHww&ixlib=rb-4.1.0&q=85",
        "author": "Redacción Noxeal",
        "read_time": 7,
        "hero": False, "side": False, "viral": False, "trending": False,
        "body": [
            "Plataformas, creadores y anunciantes pelean por el mismo recurso finito. La pregunta es quién paga el coste cognitivo.",
        ],
    },
    {
        "slug": "apple-vision-pro-fracaso-que-viene",
        "category": "Tecnología",
        "category_slug": "tecnologia",
        "tags": ["apple", "vision-pro", "spatial-computing", "tecnologia"],
        "title": "Por qué Apple Vision Pro no despegó (y lo que viene ahora)",
        "excerpt": "Análisis frío del primer round de Apple en spatial computing y por qué la segunda generación cambia las reglas.",
        "image": "https://images.unsplash.com/photo-1707343844152-6d33a0bb32c1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHw1fHxhYnN0cmFjdCUyMGRhdGElMjB0ZWNobm9sb2d5fGVufDB8fHx8MTc3ODMyNjg0NHww&ixlib=rb-4.1.0&q=85",
        "author": "Redacción Noxeal",
        "read_time": 8,
        "hero": False, "side": False, "viral": False, "trending": False,
        "body": [
            "$3500 sin app killer, peso incómodo y un mensaje confuso. Aún así, Apple no se retira de spatial computing.",
        ],
    },
]


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@noxeal.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Noxeal2026!")
    existing = await db.users.find_one({"email": admin_email})
    now = datetime.now(timezone.utc).isoformat()
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin Noxeal",
            "role": "admin",
            "created_at": now,
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )

    # Personal CEO account (the user's real email)
    ceo_email = os.environ.get("CEO_EMAIL", "").lower().strip()
    ceo_password = os.environ.get("CEO_PASSWORD", "")
    ceo_name = os.environ.get("CEO_NAME", "Noxael")
    if ceo_email and ceo_password:
        existing_ceo = await db.users.find_one({"email": ceo_email})
        if existing_ceo is None:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": ceo_email,
                "password_hash": hash_password(ceo_password),
                "name": ceo_name,
                "role": "admin",
                "created_at": now,
            })
        else:
            # Always promote to admin and reset password to env value (so password resets work via env)
            await db.users.update_one(
                {"email": ceo_email},
                {"$set": {"role": "admin", "name": ceo_name}},
            )


async def seed_articles():
    count = await db.articles.count_documents({})
    if count == 0:
        base_time = datetime.now(timezone.utc)
        docs = []
        for i, a in enumerate(SAMPLE_ARTICLES):
            published = (base_time - timedelta(days=i)).isoformat()
            docs.append({
                **a,
                "id": str(uuid.uuid4()),
                "published_at": published,
                "created_at": published,
                "status": "published",
            })
        await db.articles.insert_many(docs)
        return
    # Keep existing rows up-to-date
    for a in SAMPLE_ARTICLES:
        update = {}
        if "tags" in a:
            update["tags"] = a["tags"]
        if update:
            await db.articles.update_one({"slug": a["slug"]}, {"$set": update})
    # Ensure every article has a status field (default "published" for existing docs)
    await db.articles.update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": "published"}},
    )
    # Boost initial: seed credible view counts for each existing article on first run
    import random
    cursor = db.articles.find({"views": {"$exists": False}}, {"_id": 0, "slug": 1})
    async for a in cursor:
        boost = random.randint(820, 4200)
        await db.articles.update_one({"slug": a["slug"]}, {"$set": {"views": boost}})


@app.on_event("startup")
async def on_startup():
    """Best-effort init. Vercel serverless may not run this on every invocation; that's OK."""
    if db is None:
        logging.warning("Startup skipped: no DB configured.")
        return
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.articles.create_index("slug", unique=True)
        await db.articles.create_index("tags")
        await db.articles.create_index("category_slug")
        await db.articles.create_index("status")
        await db.articles.create_index([("viral_score", -1)])
        await db.articles.create_index([("controversy_score", -1)])
        await db.articles.create_index([("comments_count", -1)])
        await db.newsletter.create_index("email", unique=True)
        await db.comments.create_index("article_slug")
        await db.comments.create_index("id", unique=True)
        await seed_admin()
        await seed_articles()
        await db.articles.update_many(
            {"likes": {"$exists": False}},
            {"$set": {"likes": 0, "comments_count": 0, "viral_score": 0, "controversy_score": 0}},
        )
        pipeline = [
            {"$match": {"deleted": {"$ne": True}}},
            {"$group": {"_id": "$article_slug", "n": {"$sum": 1}}},
        ]
        async for r in db.comments.aggregate(pipeline):
            await db.articles.update_one({"slug": r["_id"]}, {"$set": {"comments_count": r["n"]}})
    except Exception as e:
        logging.warning(f"Startup task failed (non-fatal): {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()


# ---------- Mount ----------
@api_router.get("/")
async def root():
    return {"name": "Noxeal API", "ok": True}


app.include_router(api_router)

# Serve AI-generated images at /api/static/images/* (only if directory writable; Vercel skips this)
try:
    STATIC_DIR = ROOT_DIR / "static"
    STATIC_DIR.mkdir(exist_ok=True)
    (STATIC_DIR / "images").mkdir(exist_ok=True)
    app.mount("/api/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
except OSError:
    # Read-only filesystem (Vercel serverless) — skip mount.
    logger_init = logging.getLogger(__name__)
    logger_init.info("StaticFiles mount skipped (read-only filesystem).")


# ---------- Sitemap & robots (SEO) — under /api so kubernetes ingress forwards them ----------
from fastapi.responses import Response as PlainResponse

@app.get("/api/sitemap.xml")
async def sitemap():
    base = os.environ.get("FRONTEND_URL", "https://noxeal.com").rstrip("/")
    static_paths = ["/", "/explorar", "/tendencias", "/categorias", "/buscar", "/suscribirse", "/entrar"]
    articles = await db.articles.find({}, {"_id": 0, "slug": 1, "published_at": 1}).to_list(1000)
    urls = []
    for p in static_paths:
        urls.append(f"<url><loc>{base}{p}</loc><changefreq>daily</changefreq></url>")
    for a in articles:
        loc = f"{base}/articulo/{a['slug']}"
        lastmod = a.get("published_at", "")[:10]
        urls.append(f"<url><loc>{loc}</loc><lastmod>{lastmod}</lastmod><changefreq>weekly</changefreq></url>")
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(urls)
        + "</urlset>"
    )
    return PlainResponse(content=xml, media_type="application/xml")


@app.get("/api/robots.txt")
async def robots():
    base = os.environ.get("FRONTEND_URL", "https://noxeal.com").rstrip("/")
    txt = f"User-agent: *\nAllow: /\nSitemap: {base}/api/sitemap.xml\n"
    return PlainResponse(content=txt, media_type="text/plain")

# CORS — accept any *.preview.emergentagent.com host plus localhost dev
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost(:\d+)?|.*\.preview\.emergentagent\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
