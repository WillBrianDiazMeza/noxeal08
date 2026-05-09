# Noxeal — Product Requirements Document

## Original Problem Statement
Sitio web Noxeal: revista digital premium en español, estilo Apple + Vogue + Apple News.
Idea editorial: "aquí no solo leo noticias; aquí entiendo el contexto detrás de lo viral."

Iteración 2 (Jan 2026): el usuario pide convertir Noxeal en una **plataforma profesional**
con tags, compartir en redes, artículos relacionados, comentarios, SEO técnico y un look más
atrayente — todo compatible con WordPress cuando lo conecte.

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB), JWT auth (cookies httpOnly), bcrypt.
- **Frontend**: React 19 + react-router-dom 7 + Tailwind 3 + react-helmet-async, axios `withCredentials`.
- **Tipografías**: Playfair Display (serif headlines) + Manrope (sans body).
- **Datos**: 8 artículos seedeados con tags. Listo para WordPress vía `WORDPRESS_API_URL` env var.
- **Ingress**: solo `/api/*` se enruta al backend; sitemap/robots viven bajo `/api/sitemap.xml`
  y `/api/robots.txt`.

## User Personas
- **Lector curioso**: llega por una historia viral, quiere contexto verificado y compartir.
- **Suscriptor recurrente**: vuelve por newsletter semanal y comentarios.
- **Administrador / editor**: modera comentarios, mantiene contenido (preparado para WP).

## Core Requirements (static)
1. Header sticky con NOXEAL centrado, navegación a la izquierda, accesos a la derecha.
2. Hero con titular grande tipo revista y dos CTAs.
3. Manifesto strip (3 principios editoriales).
4. Portada editorial asimétrica (1 grande + 3 laterales).
5. Sección de temas virales en oscuro.
6. Grid de últimos artículos.
7. Newsletter funcional.
8. Buscador con filtros por categoría y por tag.
9. Login JWT (admin seedeado).
10. Página de artículo con: tags, share buttons, comentarios, artículos relacionados.
11. SEO técnico: meta tags dinámicas, OpenGraph, sitemap.xml, robots.txt.
12. Footer completo con links legales y sociales.
13. data-testid en todos los elementos interactivos.

## Implemented

### Iteración 1 (2026-01-09)
- Backend: auth, newsletter, artículos (lista/featured/por slug/search/category/trending), categorías.
- Seed automático: admin + 8 artículos de muestra.
- Frontend: 9 páginas — Home, Explorar, Tendencias, Categorías, Articulo, Buscar, Entrar, Suscribirse, estáticas.
- Header glassmorphism con menú móvil, footer editorial.
- CORS por regex para `*.preview.emergentagent.com` + localhost.
- Tests: 18/18 backend pytest.

### Iteración 2 (2026-01-09)
- ✅ Hero retitulado: *"Descubre la verdad antes de que el algoritmo la distorsione."*
- ✅ Manifesto strip nuevo (3 principios) en Home.
- ✅ Tags en artículos: 8 artículos enriquecidos. Endpoints `/api/tags` y `/api/articles?tag=X`.
- ✅ Filtro por tags en /explorar (chips). URL sync `?cat=`, `?tag=`, `?q=`.
- ✅ SocialShare component: X, Facebook, WhatsApp, Telegram + Instagram/TikTok (brand) + copiar enlace.
- ✅ Comments: POST/GET por slug. Auth requerida. Admin puede moderar cualquiera, owner puede borrar el suyo.
  Soft delete con flag `deleted`.
- ✅ RelatedArticles: 3 cards al final de cada artículo, prioriza tags compartidos > misma categoría > recientes.
- ✅ SEO (react-helmet-async): title dinámico, description, OG title/description/image/url, Twitter card,
  canonical, por página.
- ✅ `/api/sitemap.xml` + `/api/robots.txt` (bajo /api porque ingress solo enruta `/api/*`).
- ✅ Search input — icono de la lupa ahora a la izquierda sin solapar (paddingLeft 56px).
- ✅ Bug fix de motor `_id` leak en POST comments.
- ✅ Tests: 32/34 backend (los 2 "fallos" eran sitemap/robots fuera de /api — ya arreglados).

## Backlog (priorizado)

### P1 — siguiente iteración
- Conectar `/api/articles*` y `/api/categories` al **WordPress REST API** cuando el usuario tenga el sitio listo.
- Integración newsletter con proveedor real (Resend / SendGrid / Mailchimp) para envíos automáticos.
- Brute-force lockout en `/api/auth/login` (5 intentos / 15 min).
- Rate limiting en `/api/articles/{slug}/comments` y `/api/newsletter/subscribe`.

### P2 — funciones futuras
- Guardar artículos / favoritos por usuario.
- Contador de vistas + sección "Lo más leído".
- Página de admin para moderar suscriptores y comentarios desde UI.
- IA resumen de artículo, IA recomendaciones (Claude / GPT).
- Notificaciones push para suscriptores.
- Modo lectura limpio.
- Comments con respuestas anidadas (thread reply).

### P3 — monetización
- Anuncios, membresías, artículos premium, donaciones, afiliados, sponsors.

## Next Tasks
1. WordPress: cuando el usuario active su WP, setear `WORDPRESS_API_URL` y crear un adaptador
   que mapee WP REST → modelo Noxeal (slug, image, category, excerpt, body, tags, published_at).
2. Decidir proveedor real de envío de newsletter.
3. Añadir analítica privacy-first (Plausible / Umami).
