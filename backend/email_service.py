"""Resend email helpers — fire-and-forget admin notifications."""
import os
import asyncio
import logging

import resend

logger = logging.getLogger("noxeal.email")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
ADMIN_NOTIFY_EMAIL = os.environ.get("ADMIN_NOTIFY_EMAIL", "")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def _wrap(html_body: str, title: str = "Noxeal") -> str:
    return f"""<!doctype html>
<html><body style="margin:0;padding:32px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;background:#ffffff;border-radius:18px;border:1px solid #eaeaea;overflow:hidden;">
    <tr><td style="padding:28px 32px;border-bottom:1px solid #eaeaea;">
      <div style="font-family:Georgia,serif;font-weight:700;letter-spacing:0.18em;color:#111;">NOXEAL</div>
    </td></tr>
    <tr><td style="padding:32px;color:#1a1a1a;line-height:1.55;font-size:15px;">{html_body}</td></tr>
    <tr><td style="padding:18px 32px;border-top:1px solid #eaeaea;color:#86868b;font-size:12px;">
      Noxeal · noticias y análisis. Recibes este correo como administrador. <br>
      <a href="https://trending-news-3.preview.emergentagent.com/admin" style="color:#111;">Abrir panel admin →</a>
    </td></tr>
  </table>
</body></html>"""


async def _send(to: str, subject: str, html: str):
    if not RESEND_API_KEY or not to:
        logger.info(f"[email skipped — key/to missing] to={to} subj={subject!r}")
        return
    try:
        params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"[email sent] id={result.get('id')} to={to} subj={subject!r}")
    except Exception as e:
        # Fire-and-forget: never raise to caller
        logger.warning(f"[email failed] to={to} subj={subject!r} err={e}")


def fire(coro):
    """Schedule a coroutine without awaiting (fire-and-forget)."""
    try:
        asyncio.create_task(coro)
    except RuntimeError:
        # No running loop (e.g. called from sync context) — ignore
        pass


def notify_admin_subscriber(email: str, total_subscribers: int):
    body = f"""<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;">Nueva suscripción</h2>
<p>Acabas de recibir un nuevo suscriptor a la newsletter:</p>
<p style="background:#f5f5f7;padding:14px 16px;border-radius:10px;font-family:monospace;">{email}</p>
<p style="color:#86868b;">Total acumulado: <strong>{total_subscribers}</strong> suscriptor{'es' if total_subscribers != 1 else ''}.</p>"""
    fire(_send(ADMIN_NOTIFY_EMAIL, f"📬 Nuevo suscriptor en Noxeal — {email}", _wrap(body)))


def notify_admin_login(email: str, name: str, role: str, action: str):
    body = f"""<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;">Actividad de cuenta</h2>
<p>Un usuario ha {action} en Noxeal:</p>
<table style="background:#f5f5f7;padding:14px 16px;border-radius:10px;border-collapse:separate;border-spacing:0 4px;">
  <tr><td style="color:#86868b;padding-right:14px;">Nombre</td><td><strong>{name}</strong></td></tr>
  <tr><td style="color:#86868b;padding-right:14px;">Email</td><td style="font-family:monospace;">{email}</td></tr>
  <tr><td style="color:#86868b;padding-right:14px;">Rol</td><td>{role}</td></tr>
</table>"""
    fire(_send(ADMIN_NOTIFY_EMAIL, f"🔐 {action.title()} — {email}", _wrap(body)))


def notify_admin_comment(article_title: str, slug: str, user_name: str, body_preview: str):
    safe = (body_preview or "")[:240].replace("<", "&lt;").replace(">", "&gt;")
    msg = f"""<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;">Nuevo comentario</h2>
<p><strong>{user_name}</strong> ha comentado en <em>{article_title}</em>:</p>
<blockquote style="border-left:3px solid #111;padding:8px 16px;color:#1a1a1a;background:#f5f5f7;border-radius:0 10px 10px 0;">{safe}</blockquote>
<p><a href="https://trending-news-3.preview.emergentagent.com/articulo/{slug}" style="color:#111;">Ver en el sitio →</a></p>"""
    fire(_send(ADMIN_NOTIFY_EMAIL, f"💬 Comentario nuevo — {article_title}", _wrap(msg)))


def notify_admin_published(title: str, slug: str, author: str):
    msg = f"""<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;">Artículo publicado</h2>
<p><strong>{title}</strong></p>
<p style="color:#86868b;">Autor: {author}</p>
<p><a href="https://trending-news-3.preview.emergentagent.com/articulo/{slug}" style="color:#111;">Ver en el sitio →</a></p>"""
    fire(_send(ADMIN_NOTIFY_EMAIL, f"📰 Publicado: {title}", _wrap(msg)))


async def send_newsletter_blast(article: dict, subscribers: list):
    """Send the published article to all newsletter subscribers."""
    base = "https://trending-news-3.preview.emergentagent.com"
    title = article.get("title", "")
    excerpt = article.get("excerpt", "")
    slug = article.get("slug", "")
    category = article.get("category", "")
    image = article.get("image", "")
    if image and image.startswith("/api/"):
        image = base + image

    img_html = f'<img src="{image}" alt="" style="width:100%;border-radius:14px;margin-bottom:18px;display:block;">' if image else ""
    body = f"""<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#86868b;margin-bottom:12px;">{category}</div>
{img_html}
<h2 style="font-family:Georgia,serif;font-size:28px;line-height:1.1;margin:0 0 16px;color:#111;">{title}</h2>
<p style="font-size:16px;line-height:1.55;color:#1a1a1a;margin:0 0 22px;">{excerpt}</p>
<p style="margin:0 0 22px;">
  <a href="{base}/articulo/{slug}" style="display:inline-block;padding:14px 26px;background:#111;color:#fff;border-radius:9999px;text-decoration:none;font-weight:500;font-size:15px;">Leer artículo →</a>
</p>
<p style="color:#86868b;font-size:13px;line-height:1.55;margin-top:32px;">Recibes este correo porque te suscribiste a la newsletter de Noxeal. Si no quieres más correos, ignora este mensaje.</p>"""

    for sub in subscribers:
        await _send(sub.get("email"), f"Noxeal · {title}", _wrap(body, title))


def fire_newsletter_blast(article: dict, subscribers: list):
    fire(send_newsletter_blast(article, subscribers))
