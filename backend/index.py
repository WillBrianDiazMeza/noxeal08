"""Vercel / generic ASGI entrypoint.

Vercel's Python framework auto-detection looks for `app` or `handler` in
files like `index.py`, `main.py`, or `app.py`. We re-export the FastAPI
app from server.py so Vercel can find it via any of those conventions.
"""
from server import app  # noqa: F401

# Some platforms expect `handler` instead of `app`
handler = app
