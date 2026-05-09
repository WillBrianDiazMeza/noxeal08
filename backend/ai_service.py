"""AI helpers — Claude Sonnet 4.5 article generation + Nano Banana image generation.

Uses the EMERGENT_LLM_KEY universal key + emergentintegrations library.
"""
import os
import json
import re
import uuid
import base64
import unicodedata
from pathlib import Path
from typing import Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

STATIC_IMAGES_DIR = Path(__file__).parent / "static" / "images"
STATIC_IMAGES_DIR.mkdir(parents=True, exist_ok=True)


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:80] or f"articulo-{uuid.uuid4().hex[:6]}"


def _strip_json_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        # remove leading ```json or ``` and trailing ```
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


ARTICLE_SYSTEM_PROMPT = """Eres el editor jefe de Noxeal, una revista digital española de periodismo lento sobre cultura digital, IA, política, tecnología y temas virales. Tu trabajo: convertir un tema en un artículo completo, en español neutro, con tono inteligente, verificable, sin sensacionalismo.

REGLAS:
- Escribe SIEMPRE en español.
- Tono editorial: claro, directo, con autoridad pero sin engreimiento. Nada de clickbait.
- Estructura el cuerpo en 6-9 párrafos sustanciosos, cada uno aporta una idea concreta.
- Si el tema es delicado (acusaciones, política, salud) presenta hechos verificados vs. especulación, separados.
- NUNCA inventes datos, citas o fuentes específicas. Si no sabes algo, escríbelo en términos generales.
- Categorías permitidas (elige UNA): Tecnología, Investigación, Salud y redes, Cultura digital, IA.
- Tags: 3-6 etiquetas en kebab-case, en español, sin acentos, ej: ["ia","deepfakes","politica"].

DEVUELVE EXCLUSIVAMENTE JSON VÁLIDO con esta forma exacta (sin markdown, sin explicaciones extra):
{
  "title": "string (titular potente, 60-95 caracteres)",
  "excerpt": "string (resumen sucinto, 140-220 caracteres, atractivo y claro)",
  "category": "Tecnología|Investigación|Salud y redes|Cultura digital|IA",
  "tags": ["tag1","tag2","tag3"],
  "body": ["parrafo 1", "parrafo 2", "..."],
  "meta_description": "string (140-160 caracteres, optimizada para SEO)",
  "image_prompt": "string en INGLÉS, descripción visual concreta para generar la imagen destacada en estilo fotográfico editorial premium, sin texto en la imagen",
  "image_keyword": "string en inglés, 1-3 palabras para búsqueda de stock"
}"""


TOPICS_SYSTEM_PROMPT = """Eres un editor de Noxeal especializado en detectar temas que están moviendo conversación esta semana en cultura digital, IA, tecnología, política, salud mental y redes. Tu trabajo: sugerir temas para artículos.

REGLAS:
- Sugiere temas relevantes en español neutro, ACTUALES (asume que la fecha es reciente, finales de 2025 o 2026).
- Mezcla: 2 sobre IA/tech, 1 sobre política/investigación, 1 sobre cultura digital, 1 sobre salud/redes.
- Cada tema debe ser específico, no genérico ("IA" mal — "Cómo Claude Opus 4.5 cambia el trabajo creativo" bien).

DEVUELVE EXCLUSIVAMENTE JSON VÁLIDO:
{
  "topics": [
    {"title": "string (idea de titular)", "angle": "string (qué ángulo único cubrir, 1 frase)", "category": "Tecnología|Investigación|Salud y redes|Cultura digital|IA"},
    ...
  ]
}"""


async def generate_article_draft(topic: str) -> dict:
    """Use Claude Sonnet 4.5 to generate a full article draft from a topic."""
    if not EMERGENT_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY not configured")
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"noxeal-article-{uuid.uuid4().hex[:8]}",
        system_message=ARTICLE_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    msg = UserMessage(text=f"Tema asignado: {topic}\n\nGenera el artículo completo siguiendo las reglas. Devuelve solo el JSON.")
    raw = await chat.send_message(msg)
    payload = _strip_json_fences(raw if isinstance(raw, str) else str(raw))
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        # Attempt to find the JSON block heuristically
        match = re.search(r"\{.*\}", payload, re.DOTALL)
        if not match:
            raise ValueError(f"AI response was not valid JSON: {payload[:200]}")
        data = json.loads(match.group(0))
    # Sanity defaults
    data.setdefault("tags", [])
    data.setdefault("body", [])
    data.setdefault("meta_description", data.get("excerpt", ""))
    data.setdefault("image_prompt", topic)
    data.setdefault("image_keyword", topic.split()[0] if topic else "noxeal")
    return data


async def suggest_topics(focus: Optional[str] = None) -> list:
    if not EMERGENT_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY not configured")
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"noxeal-topics-{uuid.uuid4().hex[:8]}",
        system_message=TOPICS_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    prompt = "Sugiere 5 temas para cubrir esta semana."
    if focus:
        prompt += f" Enfoque preferido: {focus}."
    raw = await chat.send_message(UserMessage(text=prompt))
    payload = _strip_json_fences(raw if isinstance(raw, str) else str(raw))
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", payload, re.DOTALL)
        if not match:
            raise ValueError("AI did not return JSON")
        data = json.loads(match.group(0))
    return data.get("topics", [])


async def generate_image(prompt: str) -> str:
    """Generate an editorial featured image with Nano Banana, save to /static/images,
    return public path /api/static/images/{filename}."""
    if not EMERGENT_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY not configured")
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"noxeal-img-{uuid.uuid4().hex[:8]}",
        system_message="You generate premium editorial 16:9 photographic featured images for a digital magazine. No text in image, no logos, no people's specific faces.",
    ).with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    full_prompt = (
        f"Editorial 16:9 photograph, premium magazine quality, cinematic lighting, "
        f"shallow depth of field, no text, no logos. Subject: {prompt}"
    )
    msg = UserMessage(text=full_prompt)
    _text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        raise RuntimeError("La IA no devolvió ninguna imagen")
    img = images[0]
    image_bytes = base64.b64decode(img["data"])
    filename = f"{uuid.uuid4().hex}.png"
    out_path = STATIC_IMAGES_DIR / filename
    with open(out_path, "wb") as f:
        f.write(image_bytes)
    return f"/api/static/images/{filename}"
