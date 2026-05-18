# Noxeal — Product Requirements Document

## Original Problem Statement
Sitio web Noxeal: revista digital premium en español, estilo Apple + Vogue + Apple News.
Idea editorial: "aquí no solo leo noticias; aquí entiendo el contexto detrás de lo viral."

Iteración 3 (Jan 2026): el usuario pide convertir Noxeal en una **plataforma profesional automatizada**:
Google Trends → IA crea borrador → admin revisa → publica → Home se actualiza sola.
Roles: Admin/CEO (control total), IA (Noxeal AI, solo borradores), Suscriptores (comentar/suscribirse).
La IA NO puede modificar diseño, solo contenido.

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB), JWT auth (cookies httpOnly), bcrypt.
- **AI**: Claude Sonnet 4.5 (texto) + Gemini Nano Banana (imágenes) via emergentintegrations + `EMERGENT_LLM_KEY`.
- **Frontend**: React 19 + react-router-dom 7 + Tailwind 3 + react-helmet-async, axios `withCredentials`.
- **Tipografías**: Playfair Display (serif headlines) + Manrope (sans body).
- **Images**: AI-generated PNGs servidos en `/api/static/images/{uuid}.png` (StaticFiles mount).
- **Roles**: `admin` (control total) | `author` (Noxeal AI, solo crea drafts) | `user` (suscriptor).
- **Status de artículos**: `draft` (privado, solo admin) | `published` (público).
- **Compatible con WordPress**: mismo modelo de datos (slug, category, tags, image, excerpt, body, status).

## Implementation Roadmap

### Iteración 1 (2026-01-09)
Auth, newsletter, articles, categories, base UI con header/footer/hero/portada/viral/latest/newsletter,
9 páginas (Home/Explorar/Tendencias/Categorías/Articulo/Buscar/Entrar/Suscribirse/estáticas).

### Iteración 2 (2026-01-09)
Hero retitulado, manifesto strip, tags + filtros, share buttons, comentarios (auth+moderación),
related articles, SEO (helmet, sitemap.xml, robots.txt), polish visual.

### Iteración 3 (2026-01-09) ⭐ NEW
- ✅ **Sistema de roles**: admin / author / user. Admin = control total, IA = solo borradores.
- ✅ **Status de artículos**: `draft` | `published`. Public endpoints filtran `status=published`.
- ✅ **Panel /admin** con 5 tabs: Artículos, Generar con IA, Comentarios, Suscriptores, Usuarios.
- ✅ **Endpoints admin** (solo admin): GET /admin/stats · GET/PUT/DELETE /admin/articles · POST publish/unpublish · POST regenerate-image · GET /admin/comments · GET/PUT /admin/users.
- ✅ **AI generation con Claude Sonnet 4.5**: POST /admin/articles/generate { topic, publish? } → genera title/excerpt/body/category/tags/meta_description/image_prompt en español.
- ✅ **AI topics**: POST /admin/ai/suggest-topics { focus? } → 5 ideas de temas trending.
- ✅ **AI image regen con Nano Banana**: POST /admin/articles/{slug}/regenerate-image → guarda PNG en /api/static/images.
- ✅ **ProtectedAdmin** redirige anónimos a /entrar y no-admins a /.
- ✅ **Header**: link "ADMIN" solo visible para admins.
- ✅ **Tests**: 58/59 backend (1 fallo es budget de la EMERGENT_LLM_KEY, no código).

## Backlog (priorizado)

### P1 — siguiente iteración
- **WordPress real**: cuando el usuario tenga su WP listo, conectar `/api/articles*` al WP REST API
  vía `WORDPRESS_API_URL` env. Mapeo: WP post → modelo Noxeal.
- **Make.com / Zapier**: configurar el flujo Google Trends RSS → webhook → /admin/articles/generate.
- **Newsletter sender**: integrar Resend / SendGrid / Mailchimp para envíos automáticos.
- **Brute-force lockout** (login) + rate limiting (comments, AI generate, newsletter).
- **AI image desde generación inicial**: opcional flag para que `generate` ya cree la imagen.

### P2 — funciones futuras
- Guardar artículos / favoritos por usuario.
- Contador de vistas + sección "Lo más leído".
- Comentarios destacados / fijados (admin pin).
- Comments con respuestas anidadas.
- IA: resumen automático de artículo, recomendaciones personalizadas.
- Notificaciones push para suscriptores.
- Modo lectura ("reader view").

### P3 — monetización & WP plugins
- Google AdSense slots (cuando haya tráfico).
- Membresías + artículos premium.
- Donaciones / afiliados / sponsors.
- WordPress plugins: Jetpack, Rank Math/Yoast, Akismet (todos en el lado WP cuando se conecte).

## Notas operativas
- **EMERGENT_LLM_KEY budget**: si la generación con IA devuelve "IA no respondió", el saldo está agotado.
  El usuario debe ir a Profile → Universal Key → Add Balance (o activar auto top-up).
- **Static files**: las imágenes IA se guardan en `/app/backend/static/images/`. Borrar archivos
  huérfanos manualmente si crece mucho.
- **Admin seed**: `admin@noxeal.com` / `Noxeal2026!` se crea/actualiza al iniciar el backend.

## Next Tasks
1. Esperar a que el usuario active su WP y nos dé la URL para conectar.
2. Configurar Make.com con webhook → /api/admin/articles/generate cuando exista WP.
3. Decidir proveedor real de envío de newsletter.

### Iteración 4 (2026-01-09) ⭐ NEW
- ✅ **Resend integration** — emails fire-and-forget a noxael18@gmail.com en register/login/newsletter/comment/publish.
- ✅ **Make.com webhook** con auth `X-API-Key`: POST /api/automation/articles/generate y .../publish.
- ✅ **View counter** + **/api/articles/most-read** (con boost inicial 820-4200 views por artículo).
- ✅ **/api/public-stats** con boost inicial 47.230 reads + 5.247 subs + crecimiento real encima.
- ✅ **/api/health** para monitorización + **/api/feed.rss** RSS público.
- ✅ **/api/public-config** expone contacto + redes sociales desde .env.
- ✅ **Hero singleton** enforcement en PUT /admin/articles/{slug}.
- ✅ **Footer dark** profesional con contact email + 4 redes (Instagram, X, TikTok, YouTube) + CTA newsletter.
- ✅ **Home stats strip** dark con los números (lecturas/suscriptores/historias) en serif grande.
- ✅ **Lo más leído** sección numerada (01-04) en home con views por artículo.
- ✅ **Toasts (sonner)** en todas las acciones admin + newsletter.
- ✅ **Hero/Trending toggles** por fila en /admin/Artículos (singleton enforced).
- ✅ **/admin/Make.com tab** con docs copy-paste: endpoints, API key, body JSON, flujo recomendado.
- ✅ **IA + Editor badge** en artículos generados por IA, **counter de lecturas** en cada artículo.
- ✅ **Tests**: 73/74 (98.6%) tras fix de route ordering en /api/articles/most-read.


### Iteración 5 (2026-02-10) ⭐ NEW — Editorial pure-typography & Vercel ready
- ✅ **Vercel build fix**: `load()` envuelto en `useCallback` en `Comments.jsx` + `Admin.jsx` (ArticlesPanel/CommentsPanel/UsersPanel). `CI=true yarn build` ahora pasa limpio.
- ✅ **Quitadas TODAS las imágenes de la UI** (modelo intacto, solo ocultas):
  - `ArticleCard` y `HeroEditorialCard`: cards 100% tipográficas con separadores border-top editoriales.
  - `Articulo.jsx`: eliminado `<img>` del hero del artículo, ancho de cuerpo subido a max-w-3xl.
  - `ViralCard`: solo título tipográfico, sin thumbnail.
  - `SkeletonHero`: ya no incluye placeholder de imagen.
- ✅ **Google Analytics 4** instalado en `/public/index.html` (`G-S3TMB4WYWS`) con `anonymize_ip: true`.
- ✅ **Title del site** corregido: `Noxeal — Periodismo lento sobre la cultura digital`.
- ✅ **Live stats con ritmo aleatorio**: en `Home.jsx`, drift local cada 1.2-3.5s (+1..+4 ponderado) para lecturas y cada 30-75s con 50% prob (+1) para suscriptores. Re-sync con servidor cada 25s tomando `Math.max(local, server)` para nunca retroceder.
- ✅ Build verificado: 125 kB gzip JS, 14 kB CSS, 0 warnings.

## Backlog
- P1: Que cada referencia hardcoded de dominio apunte a `noxeal.com` (revisar SEO.jsx + sitemap base).
- P2: Sustituir mock de imágenes en backend por título tipográfico también en cards de admin si se desea.


### Iteración 6 (2026-02-10) ⭐ PRODUCCIÓN REAL
**Backend (`server.py`)**
- ✅ `POST /api/articles` (Make.com) mejorado: acepta `sourceUrl`, `seoTitle`, `seoDescription`, `authorName`, `status` explícito. Devuelve `{success:true, ok:true, slug, url, status}`. Inicializa `likes/comments_count/viral_score/controversy_score=0`. Hard-limit 50k chars + sanitización HTML (`<script>/<iframe>/on*=`). Auth con `hmac.compare_digest` (timing-safe).
- ✅ Likes anónimos: `POST /articles/{slug}/like` (+1 likes & viral_score) + `/unlike`.
- ✅ Comentarios: `parent_id` para hilos. Auto-incremento `comments_count` + `controversy_score` al crear, decremento al borrar.
- ✅ `POST /comments/{id}/like` + `POST /comments/{id}/report` con auto-hide a 5 reportes.
- ✅ `GET /admin/comments/reported`.
- ✅ Replies huérfanos se ocultan al listar comentarios.
- ✅ Feeds nuevos: `/api/feed/trending`, `/api/feed/controversial`, `/api/feed/most-commented` (no shadowed por `/articles/{slug}`).
- ✅ Migración startup: backfill de counters en docs legacy + recompute `comments_count` desde colección real.

**Frontend**
- ✅ `ArticleEngagement` con Like + Save + Views + Comments pills (dedupe localStorage).
- ✅ JSON-LD `NewsArticle` (Schema.org) en cada artículo + `WebSite` en home, en `SEO.jsx`.
- ✅ Canonical apunta a `https://noxeal.com` (no preview).
- ✅ Home con 2 secciones nuevas: Polémicos + Más comentados (data-testid `debate-section`).
- ✅ Comments con replies anidados, like y report (`comment-like-{id}`, `comment-reply-{id}`, `comment-report-{id}`).
- ✅ Páginas legales completas: `/about`, `/privacy`, `/cookies`, `/terms`, `/disclaimer`, `/contact` (+ alias en español).
- ✅ `AdSenseLoader.jsx` y `GAnalytics.jsx` cargan condicionalmente vía `REACT_APP_ADSENSE_CLIENT_ID` / `REACT_APP_GA_ID`.
- ✅ Footer con todos los enlaces legales.
- ✅ Source URL del artículo (cuando Make.com lo envía) se muestra al final con `rel="nofollow"`.

**Documentación**
- ✅ `README.md` completo con instrucciones Make.com paso a paso (endpoint, headers, body JSON, prompt Claude, flujo recomendado, variables env, deploy).

**Tests**: backend 17/17 (100%) + frontend completo (todas las testids, GA4 conditional, AdSense gated, 0 `<img>` en `<main>`, like/save persistente, comentarios anidados).

### Iteración 8 (2026-02-10) ⭐ Branding + Search + Cron
**Branding**
- ✅ Logo Noxeal subido: `/public/noxeal-logo.png` (1536x1024).
- ✅ Generados favicon multi-tamaño (16/32/48 ICO + 32/16 PNG + 180 apple-touch).
- ✅ `og-image.jpg` (1200×630) para preview en X/WhatsApp/LinkedIn.
- ✅ `manifest.json` PWA-ready con maskable icon.
- ✅ `index.html` con todos los `<link rel>` y `<meta og:image>` apuntando a noxeal.com.
- ✅ `SEO.jsx` con fallback OG image por defecto en todas las páginas.

**P1: `/buscar` con full-text search ✅**
- ✅ Endpoint `GET /api/search?q=...&limit=20&skip=0`.
- ✅ Modo `$text` con índice MongoDB (idioma español) + fallback regex.
- ✅ Devuelve `{query, total, results, mode}` con score relevance.
- ✅ Página `/buscar?q=...` con highlighting amarillo, contador de resultados, estado vacío y clear button.
- ✅ Sincronización URL ↔ input (compartible).

**P2: Cron job "IA reorganiza la home" ✅**
- ✅ Función `_compute_engagement_score()`: `(likes·3 + comments·5 + viral·2 + controversy·2 + log(views)·4) × recency_decay(7d)`.
- ✅ `_recompute_homepage_flags()`: scorea todos los publicados, asigna top1=hero, top2-4=side, top5-8=viral.
- ✅ Endpoint `GET/POST /api/cron/recompute-homepage` con auth via `X-Cron-Secret` o `Authorization: Bearer <CRON_SECRET>` (fallback admin cookie).
- ✅ Vercel Cron configurado en `vercel.json`: lunes 06:00 UTC.
- ✅ **Auto-recompute después de cada publish Make.com** (los nuevos artículos suben al hero si tienen engagement).

**Tests locales**:
- search "epstein" → mode=text, 1 result ✅
- search "ia" → mode=text, 13 results ✅
- cron recompute → 34 articles scored, hero/side/viral asignados ✅
- favicons + og-image + manifest → HTTP 200 ✅
- frontend build → 27s, 0 warnings ✅


### Iteración 7 (2026-02-10) ⭐ VERCEL-SAFE
- ✅ `server.py` ahora importa SIN ninguna env var configurada (defensivo): `MONGO_URL`, `DB_NAME`, `JWT_SECRET` con defaults seguros; `client/db` son `None` si falta MONGO_URL; JWT_SECRET ephemeral si falta.
- ✅ `ai_service.py`: `from emergentintegrations...` envuelto en `try/except`. `is_available()` para checks. Si el paquete privado falta (caso Vercel), AI generation está deshabilitada pero todo lo demás funciona.
- ✅ `email_service.py`: `import resend` en try/except. Si falta, emails se loguean como skipped silenciosamente.
- ✅ `StaticFiles` mount condicional (filesystem read-only en Vercel).
- ✅ `@app.on_event("startup")` defensivo: hace try/except + no crashea si DB no responde.
- ✅ `/api/health` devuelve 200 SIEMPRE: incluye `{ok, db, db_error, service, version, ai_available, time}`.
- ✅ `backend/index.py` + `backend/main.py` + `backend/runtime.txt` (python-3.11) creados para auto-detect de Vercel.
- ✅ README con CHECKLIST exhaustivo de env vars Vercel (frontend + backend) + URLs para verificar deploy.

**Verificación local pasada**:
1. `env -i python -c "import server"` → ✅ OK (55 routes, no crash)
2. `/api/health` → `{ok:true, db:true, ai_available:true}`
3. `/api/sitemap.xml` → XML válido
4. `POST /api/articles` con key → success; sin key → 401
5. Frontend: home con todas las secciones (hero, stats, debate, latest), 0 JS errors

**Lo que el usuario debe hacer ahora**:
1. Push a GitHub (Save to Github desde Emergent).
2. En Vercel → Settings → Env Vars añadir las del CHECKLIST del README.
3. Redeploy → probar `https://noxeal.com/api/health`.
4. Si funciona → `Run once` en Make.com → primer artículo publicado.
5. Enviar `noxeal.com/api/sitemap.xml` a Google Search Console.



### Iteración 8 (2026-02-18) ⭐ NEXT LEVEL — Inmersión, Guardado y Make.com a prueba de fallos
- ✅ **Validación estricta Make.com** (`MakeArticleIn` Pydantic v2):
  - `default_factory=list` para `body` y `tags` (sin mutable defaults).
  - `@field_validator("body","tags", mode="before")`: tolera `null`, string suelto, lista mixta → lista limpia.
  - `@field_validator(...strings..., mode="before")`: coacciona `null`/números a string seguro.
  - `verificationLevel` acepta `"75%"`, `75.0`, `null` → 0–100 clamped.
  - `publish` acepta `"true"`, `1`, `"yes"`, `null` → bool real.
  - `factLevel` se normaliza a minúsculas + whitelist. Cualquier valor inválido → `"analysis"` (fallback editorial).
- ✅ **Endpoint batch `POST /api/articles/by-slugs`**: lookup de N artículos en una sola request, preservando orden y filtrando borrados. Usado por la lista de lectura.
- ✅ **Página `/guardados` (Lista de lectura)**:
  - Lee `localStorage["noxeal_saved_articles"]` (sin cuentas, sin tracking).
  - Self-heal: limpia slugs huérfanos cuando un artículo se borra/despublica.
  - Empty state editorial + sync entre pestañas vía `storage` event.
  - Botón "Vaciar lista" + remove individual.
  - `noindex` (página personal del lector).
- ✅ **Icono Bookmark en Header** (desktop + mobile) hacia `/guardados`.
- ✅ **Modo Lectura Inmersivo** en `Articulo.jsx`:
  - Toggle "Modo lectura" arriba a la derecha (Maximize2 / Minimize2 lucide).
  - Aplica `body.nx-focus-on`: ticker, header, engagement, tags, comentarios y related se atenúan a opacidad 0.18 + `pointer-events:none`.
  - Tipografía del body crece (20px / 1.78 line-height) cuando focus está activo.
  - Cierre con tecla `Escape`.
  - Animación entrada artículo `nx-focus-fade` (cubic-bezier).
- ✅ **Skeleton premium de carga** en `Articulo.jsx` (reemplaza el "Cargando…" plano).
- ✅ **SEO**: prop `noindex` añadida al componente `SEO` para páginas personales.

**Tests pasados**:
- `POST /api/articles` con `tags:null`, `factLevel:"ANALYSIS"`, `verificationLevel:"75%"`, `publish:"true"` → 200, `fact_level:"analysis"`, `verification_level:75`, `status:"published"`.
- `POST /api/articles` con `tags:"ia"` (string) → guardado como `["ia"]`.
- `POST /api/articles` sin `content`/`body` → 400 con mensaje claro.
- `POST /api/articles/by-slugs` con `[]` → `[]`; con mix válido/inválido → solo válidos en orden.
- `/guardados` vacío → CTA "Explorar el archivo". Con slug seeded en localStorage → artículo se renderiza con FactBadge + meta.
- Modo focus → `body.className === "nx-focus-on"` y elementos perimetrales atenuados visualmente.

**Backlog priorizado**:
- P1: Highlights / anotaciones por párrafo dentro del artículo.
- P1: Cuenta premium — historial real (sync localStorage ↔ servidor cuando hay sesión).
- P1: Componente visual "Realidad vs Viralidad" (tabla comparativa hechos vs narrativa).
- P1: Sistema emocional/narrativo (estado emocional del internet por categoría).
- P2: Sugerencias post-lectura ("Narrativas similares", "La evolución de esta historia").
- P2: Multi-idioma (ES/EN/FR/NL) con routing y traducción.
- P2: Audio articles (TTS) + dark mode premium.
