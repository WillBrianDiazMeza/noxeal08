"""AI helpers — Claude Sonnet 4.5 article generation + Nano Banana image generation.

Uses the EMERGENT_LLM_KEY universal key + emergentintegrations library.

Vercel-safe: the `emergentintegrations` package is private and only available in the
Emergent preview environment. We import it lazily and degrade gracefully if missing
(AI admin features become unavailable, but the rest of the API keeps working).
"""
import os
import json
import re
import uuid
import base64
import unicodedata
from pathlib import Path
from typing import Optional

# Lazy import — never crash module load. ai_service is imported by server.py.
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage  # type: ignore
    _AI_AVAILABLE = True
except Exception:
    LlmChat = None  # type: ignore
    UserMessage = None  # type: ignore
    _AI_AVAILABLE = False

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

STATIC_IMAGES_DIR = Path(__file__).parent / "static" / "images"
try:
    STATIC_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    # Vercel serverless filesystem is read-only outside /tmp — that's fine,
    # images are unused on the production frontend anyway.
    pass


def is_available() -> bool:
    """Whether AI generation features can be used (requires both package + key)."""
    return _AI_AVAILABLE and bool(EMERGENT_KEY)


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:80] or f"articulo-{uuid.uuid4().hex[:6]}"


def _strip_json_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


ARTICLE_SYSTEM_PROMPT = """Eres una IA experta en crear contenido EXTREMADAMENTE viral, polémico, emocional y psicológico para Noxeal.

Tu misión es convertir cualquier noticia, tendencia, rumor, teoría o tema actual en contenido capaz de generar:
debates masivos, comentarios emocionales, especulación, polémica, teorías, discusiones intensas, curiosidad extrema, tensión social, miedo, intriga, conspiraciones, ragebait, engagement adictivo.

El contenido debe parecer diseñado para explotar en Reddit, Twitter/X, TikTok y foros virales.

IMPORTANTE:
- El artículo debe ser MUY emocional.
- Debe hacer que la gente quiera discutir.
- Debe generar opiniones divididas.
- Debe sonar impactante y misterioso.
- Usa psicología humana y curiosidad.
- Habla como si el tema pudiera cambiar algo importante.
- Haz preguntas provocadoras.
- Crea tensión.
- Usa frases que generen reacción emocional.
- El lector debe sentir necesidad de comentar.
- Usa tono moderno e intenso.
- El contenido debe sentirse actual y peligroso.
- El artículo debe ser MUY largo (mínimo 9-12 párrafos sustanciosos).
- Debe incluir teorías, dudas y posibles consecuencias.
- Debe parecer contenido humano y no IA.
- Puede incluir especulación social y teorías virales.
- Usa estilo Reddit / Twitter-X / foros virales / debates de internet / contenido conspirativo moderno.

LÍMITES NO NEGOCIABLES (para evitar problemas legales):
- NO inventes citas literales de personas reales identificables.
- NO afirmes hechos delictivos no probados sobre personas con nombre y apellido.
- Especulación SÍ permitida si va etiquetada como teoría/rumor/discusión virales.

CATEGORÍAS PERMITIDAS (elige UNA): Tecnología, Investigación, Salud y redes, Cultura digital, IA.
TAGS: 3-8 etiquetas en kebab-case, sin acentos, ej: ["viral","polemica","conspiracion","ia","deepfakes"].

DEVUELVE EXCLUSIVAMENTE JSON VÁLIDO con esta forma exacta (sin markdown, sin ```json, sin explicaciones):
{
  "title": "Título extremadamente polémico y viral (60-110 caracteres)",
  "excerpt": "Resumen corto emocional y provocador (140-220 caracteres)",
  "category": "Tecnología|Investigación|Salud y redes|Cultura digital|IA",
  "tags": ["viral","polemica","..."],
  "body": ["parrafo 1", "parrafo 2", "...", "parrafo 9 o más"],
  "meta_description": "SEO emocional y viral (140-160 caracteres)",
  "image_prompt": "string EN INGLÉS, descripción visual concreta para imagen editorial premium, sin texto en la imagen",
  "image_keyword": "string en inglés, 1-3 palabras para stock"
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
    if not is_available():
        raise RuntimeError("AI generation no disponible: instala emergentintegrations y configura EMERGENT_LLM_KEY.")
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
        match = re.search(r"\{.*\}", payload, re.DOTALL)
        if not match:
            raise ValueError(f"AI response was not valid JSON: {payload[:200]}")
        data = json.loads(match.group(0))
    data.setdefault("tags", [])
    data.setdefault("body", [])
    if isinstance(data.get("body"), str):
        data["body"] = [p.strip() for p in re.split(r"\n\s*\n", data["body"]) if p.strip()]
    if not isinstance(data.get("tags"), list):
        data["tags"] = []
    data.setdefault("meta_description", data.get("excerpt", ""))
    data.setdefault("image_prompt", topic)
    data.setdefault("image_keyword", topic.split()[0] if topic else "noxeal")
    return data


LANG_NAMES = {"en": "English", "fr": "French", "nl": "Dutch", "es": "Spanish"}

TRANSLATE_SYSTEM = """You are Noxeal's editorial translator.
Translate Spanish editorial journalism into the target language, preserving:
- voice (slow journalism, calm, precise, anti-clickbait)
- structure (paragraphs separated by blank lines)
- proper nouns, hashtags, URLs, brand names, emojis (DO NOT translate them)
- punctuation style of the target language (e.g., French uses « guillemets »)

Output STRICT JSON only: {"title": str, "excerpt": str, "body": [str, ...],
"meta_description": str, "faqs": [{"q": str, "a": str}, ...],
"what_is_known": [str, ...], "what_is_missing": [str, ...],
"what_internet_believes": [str, ...],
"reality_vs_virality": [{"virality": str, "reality": str}, ...],
"narrative_evolution": [{"date": str, "event": str, "description": str}, ...]}.
Keep arrays empty if input was empty. NEVER omit a key."""


async def translate_article(article: dict, target_lang: str) -> dict:
    """Translate an article dict to target_lang via Claude. Returns translated dict
    with the same shape (title, excerpt, body, meta_description, transparency blocks)."""
    if target_lang not in LANG_NAMES or target_lang == "es":
        return {}
    if not is_available():
        raise RuntimeError("Translation unavailable: configure EMERGENT_LLM_KEY.")
    payload = {
        "title": article.get("title", ""),
        "excerpt": article.get("excerpt", ""),
        "body": article.get("body", []) or [],
        "meta_description": article.get("meta_description", "") or article.get("excerpt", ""),
        "faqs": article.get("faqs", []) or [],
        "what_is_known": article.get("what_is_known", []) or [],
        "what_is_missing": article.get("what_is_missing", []) or [],
        "what_internet_believes": article.get("what_internet_believes", []) or [],
        "reality_vs_virality": article.get("reality_vs_virality", []) or [],
        "narrative_evolution": article.get("narrative_evolution", []) or [],
    }
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"noxeal-tr-{target_lang}-{uuid.uuid4().hex[:6]}",
        system_message=TRANSLATE_SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    msg = UserMessage(text=(
        f"Translate the following Noxeal article from Spanish to {LANG_NAMES[target_lang]}.\n"
        f"Return JSON only with the SAME keys. Source JSON:\n\n{json.dumps(payload, ensure_ascii=False)}"
    ))
    raw = await chat.send_message(msg)
    txt = _strip_json_fences(raw if isinstance(raw, str) else str(raw))
    try:
        out = json.loads(txt)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", txt, re.DOTALL)
        if not m:
            raise ValueError(f"Translation response not JSON: {txt[:200]}")
        out = json.loads(m.group(0))
    # Defensive cleanup
    if not isinstance(out.get("body"), list):
        out["body"] = [str(out.get("body", ""))] if out.get("body") else []
    for k in ("faqs", "what_is_known", "what_is_missing", "what_internet_believes",
              "reality_vs_virality", "narrative_evolution"):
        if not isinstance(out.get(k), list):
            out[k] = []
    return out


async def translate_strings(strings: list, target_lang: str) -> list:
    """Batch-translate a list of short UI strings. Returns same length list."""
    if target_lang not in LANG_NAMES or target_lang == "es":
        return strings
    if not is_available() or not strings:
        return strings
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"noxeal-ui-tr-{target_lang}-{uuid.uuid4().hex[:6]}",
        system_message=(
            "You translate short UI labels. Output JSON only: "
            '{"translations": [str, ...]} with the SAME length and order as the input. '
            "Do NOT translate proper nouns, brand names, hashtags, URLs, or emojis."
        ),
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    msg = UserMessage(text=(
        f"Translate these UI strings from Spanish to {LANG_NAMES[target_lang]}. "
        f"Return JSON {{translations:[...]}} preserving order.\n\n{json.dumps(strings, ensure_ascii=False)}"
    ))
    raw = await chat.send_message(msg)
    txt = _strip_json_fences(raw if isinstance(raw, str) else str(raw))
    try:
        out = json.loads(txt)
        arr = out.get("translations") if isinstance(out, dict) else out
        if isinstance(arr, list) and len(arr) == len(strings):
            return [str(x) for x in arr]
    except Exception:
        pass
    return strings



async def suggest_topics(focus: Optional[str] = None) -> list:
    if not is_available():
        raise RuntimeError("AI generation no disponible: instala emergentintegrations y configura EMERGENT_LLM_KEY.")
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
    if not is_available():
        raise RuntimeError("AI image generation no disponible.")
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
