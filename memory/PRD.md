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
