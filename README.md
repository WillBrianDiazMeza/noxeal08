# Noxeal — Periodismo lento sobre la cultura digital

Plataforma editorial automatizada con:
- **Frontend**: React 19 + Tailwind 3 + react-router-dom 7 + react-helmet-async
- **Backend**: FastAPI + Motor (async MongoDB) + JWT cookies + bcrypt
- **AI**: Claude Sonnet 4.5 (texto) + Gemini Nano Banana (imagen, opcional) via Emergent LLM Key
- **Automation**: Make.com webhook → `POST /api/articles`
- **Emails**: Resend
- **Analytics**: Google Analytics 4 (env `REACT_APP_GA_ID`)
- **Ads**: Google AdSense (env `REACT_APP_ADSENSE_CLIENT_ID`)

## Características clave

- ✅ Diseño 100% tipográfico, sin imágenes (estilo Apple News + Vogue)
- ✅ Solo el admin / Make.com pueden crear artículos. Usuarios solo leen, comentan, dan like, guardan
- ✅ Likes anónimos en artículos (`viral_score` se incrementa)
- ✅ Comentarios con replies, likes, reportes y moderación automática (5 reports → auto-hide)
- ✅ Secciones home dinámicas: Polémicos (controversy_score), Más comentados, Tendencias
- ✅ SEO completo: sitemap.xml, robots.txt, canonical, Open Graph, JSON-LD NewsArticle
- ✅ Páginas legales: `/about`, `/privacy`, `/cookies`, `/terms`, `/disclaimer`, `/contact`
- ✅ Stats live con incrementos aleatorios orgánicos
- ✅ Sanitización HTML en backend (sin `<script>`, sin `<iframe>`, sin handlers inline)

## Endpoints públicos

### Lectura
```
GET  /api/articles               → listado de publicados
GET  /api/articles/{slug}        → artículo individual
GET  /api/articles/featured      → hero + side + viral + latest
GET  /api/articles/most-read     → top vistas
GET  /api/articles/{slug}/related → relacionados
GET  /api/feed/trending          → top viral_score
GET  /api/feed/controversial     → top controversy_score
GET  /api/feed/most-commented    → top comments_count
GET  /api/categories             → categorías con count
GET  /api/tags                   → tags con count
GET  /api/public-stats           → lecturas/suscriptores/historias (boost + tick)
GET  /api/health                 → health check
GET  /api/sitemap.xml            → sitemap dinámico
GET  /api/robots.txt             → robots
```

### Engagement (anónimo, dedupe en cliente)
```
POST /api/articles/{slug}/view   → incrementa vista
POST /api/articles/{slug}/like   → +1 like, +1 viral_score
POST /api/articles/{slug}/unlike → -1 like
POST /api/comments/{id}/like     → +1 like al comentario
POST /api/comments/{id}/report   → +1 reporte (auto-hide >= 5)
```

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/refresh
```

### Comentarios (usuario logueado)
```
GET    /api/articles/{slug}/comments
POST   /api/articles/{slug}/comments    {body, parent_id?}
DELETE /api/comments/{id}
```

## Integración Make.com — IMPORTANTE

### URL del endpoint
```
POST https://noxeal.com/api/articles
```

### Headers
```
Content-Type: application/json
X-API-Key: <valor de MAKE_API_KEY en backend/.env>
```

> Si `MAKE_API_KEY` está vacío en el `.env`, el endpoint funciona sin autenticación (solo desarrollo). En producción **siempre** ponle un valor.

### Body JSON aceptado
```json
{
  "title": "Título extremadamente polémico y viral",
  "excerpt": "Resumen corto emocional y provocador",
  "content": "Párrafo 1.\n\nPárrafo 2.\n\nPárrafo 3 con análisis profundo.",
  "category": "tecnologia",
  "tags": ["viral", "polemica", "debate"],
  "seoTitle": "Título SEO extremadamente clicable",
  "seoDescription": "Descripción SEO emocional y viral",
  "status": "published",
  "sourceUrl": "https://fuente-original.com/articulo",
  "authorName": "Noxeal AI"
}
```

**Campos**:
| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `title` | string | ✅ | 3-300 chars |
| `excerpt` | string | ❌ | Si vacío, se infiere del primer párrafo |
| `content` | string | ✅* | Texto largo con `\n\n` entre párrafos |
| `body` | string[] | ✅* | Alternativa: array de párrafos |
| `category` | string | ❌ | Default `"Cultura digital"`. Mapeo flexible: "tech"→Tecnología, "salud"→Salud y redes, "ia"→IA, "polit/investig"→Investigación |
| `tags` | string[] | ❌ | Max 10. Se normalizan a kebab-case |
| `seoTitle` | string | ❌ | Si presente, reemplaza el `title` para SEO |
| `seoDescription` | string | ❌ | Meta description |
| `status` | `"published"` \| `"draft"` | ❌ | Default `"published"` (vía `publish=true`) |
| `sourceUrl` | string | ❌ | Aparece como "Fuente original" al final del artículo |
| `authorName` | string | ❌ | Default `"Noxeal AI"` |

*Necesitas al menos uno de `content` o `body`.

### Respuesta exitosa
```json
{
  "success": true,
  "ok": true,
  "id": "uuid",
  "slug": "titulo-en-slug",
  "status": "published",
  "url": "https://noxeal.com/articulo/titulo-en-slug",
  "admin_url": "https://noxeal.com/admin"
}
```

### Errores comunes
- `401` → API key inválida o falta header `X-API-Key`
- `400` → Falta `content` y `body`, o cuerpo sin párrafos válidos
- `413` → Contenido demasiado largo (>50k chars)
- `500` → Verificar logs (probablemente MongoDB desconectada)

### Flujo Make.com recomendado

```
RSS Watch (Google Trends / Reuters / TechCrunch / BBC)
    ↓
Filter por palabras clave
    ↓
Anthropic Claude (Sonnet 4.5) — genera JSON con prompt editorial
    ↓
Parse JSON
    ↓
HTTP Request POST → https://noxeal.com/api/articles
    Headers: Content-Type=application/json, X-API-Key=<tu_key>
    Body type: Raw, Content type: JSON
    Body: { "title": "{{title}}", "content": "{{content}}", ... }
    ↓
Telegram/Email notify — borrador listo para revisar
```

### Prompt sugerido para Claude en Make.com

```
Eres un periodista editorial profesional de tecnología y cultura digital.

Recibirás una noticia desde un RSS. Tu tarea es generar un artículo
analítico, no un resumen. El tono mezcla The Verge + Wired + Medium.

REGLAS:
- Responde SOLO JSON válido, sin ```json ni explicaciones.
- NO copies el RSS literal. Analiza, interpreta, añade contexto.
- Marca claramente análisis vs hecho confirmado.
- Cita la fuente en sourceUrl.

ESTRUCTURA OBLIGATORIA:
{
  "title": "Título editorial humano y SEO-friendly",
  "excerpt": "Resumen de 1-2 líneas que enganche",
  "content": "Artículo largo (800-2000 palabras) con párrafos separados por \\n\\n.\n\nIncluye subsecciones, contexto, análisis y conclusión.",
  "category": "tecnologia | ia | investigacion | salud-y-redes | cultura-digital",
  "tags": ["tag1", "tag2", "tag3"],
  "seoTitle": "Título optimizado para Google (60 chars max)",
  "seoDescription": "Meta description 140-160 chars",
  "sourceUrl": "URL del RSS original"
}

NOTICIA RSS:
Título: {{1.title}}
Descripción: {{1.description}}
Contenido: {{1.summary}}
URL: {{1.url}}
```

## Variables de entorno

### `backend/.env`
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=noxeal
JWT_SECRET=<random-64-hex>
MAKE_API_KEY=noxeal-make-<random>      # vacío = sin auth (dev only)
EMERGENT_LLM_KEY=<your-key>             # para AI generation
RESEND_API_KEY=<your-key>               # para emails
ADMIN_EMAIL=tu@email.com
ADMIN_PASSWORD=...
PUBLIC_CONTACT_EMAIL=hola@noxeal.com
FRONTEND_URL=https://noxeal.com
INSTAGRAM_URL=
X_TWITTER_URL=
TIKTOK_URL=
YOUTUBE_URL=
```

### `frontend/.env`
```
REACT_APP_BACKEND_URL=https://api.noxeal.com  # tu backend desplegado
REACT_APP_GA_ID=G-S3TMB4WYWS                  # opcional
REACT_APP_ADSENSE_CLIENT_ID=                   # opcional, ej. ca-pub-XXXXXXXXXXXXXXXX
```

## Deploy

### Frontend → Vercel
```
yarn build
```
`vercel.json` ya configurado en `frontend/vercel.json`. Las llamadas `/api/*` se redirigen al backend.

### Backend → Railway / Render / Fly.io (recomendado)
FastAPI necesita un host con soporte Python persistente. Vercel no es ideal para FastAPI; usa Railway o Render.

Comando de arranque:
```
uvicorn server:app --host 0.0.0.0 --port $PORT
```

### MongoDB → MongoDB Atlas (free tier OK)
```
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/noxeal?retryWrites=true&w=majority
DB_NAME=noxeal
```

## SEO Checklist

- [x] `<title>` y `<meta description>` por página
- [x] Canonical URL en cada artículo
- [x] Open Graph + Twitter Cards
- [x] JSON-LD `NewsArticle` (Schema.org)
- [x] `sitemap.xml` dinámico (`/api/sitemap.xml`)
- [x] `robots.txt` (`/api/robots.txt`)
- [x] GA4 con anonimize_ip
- [ ] Enviar `noxeal.com/api/sitemap.xml` a Google Search Console
- [ ] Solicitar indexación manual de la home
- [ ] Conseguir 3-5 backlinks de calidad

## Roles

| Rol | Permisos |
|-----|----------|
| `user` | Comentar, dar like, guardar, suscribirse |
| `moderator` | (futuro) moderar comentarios |
| `admin` | Todo: crear/editar/borrar artículos, gestionar usuarios |
| `author` | Reservado para "Noxeal AI" — no puede publicar manualmente |

## Comandos útiles

```bash
# Backend test local
curl http://localhost:8001/api/health

# Test Make.com endpoint
curl -X POST http://localhost:8001/api/articles \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $MAKE_API_KEY" \
  -d @ejemplo.json

# Build frontend para Vercel
cd frontend && CI=true yarn build
```

---

© Noxeal Editorial · MIT-style internal use.
