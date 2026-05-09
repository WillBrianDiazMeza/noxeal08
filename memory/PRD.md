# Noxeal — Product Requirements Document

## Original Problem Statement
Sitio web Noxeal: revista digital premium en español, estilo Apple + Vogue + Apple News.
Idea editorial: "aquí no solo leo noticias; aquí entiendo el contexto detrás de lo viral."

Estructura solicitada (header, hero, portada editorial, temas virales, últimos artículos,
buscador, newsletter, footer) — todos los detalles en el problem statement original.

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB), JWT auth con cookies httpOnly, bcrypt.
- **Frontend**: React 19 + react-router-dom 7 + Tailwind, axios con `withCredentials`.
- **Tipografías**: Playfair Display (serif, headlines tipo Vogue) + Manrope (sans, body tipo Apple).
- **Datos**: 8 artículos de ejemplo seedeados al iniciar el backend (categorías: Investigación,
  IA, Cultura digital, Salud y redes, Tecnología). Listo para conmutar a WordPress REST API
  vía variable `WORDPRESS_API_URL` cuando el sitio esté listo.

## User Personas
- **Lector curioso**: llega por una historia viral y quiere contexto verificado.
- **Suscriptor recurrente**: vuelve por la newsletter semanal.
- **Administrador / editor**: mantiene el contenido (preparado para integración WP).

## Core Requirements (static)
1. Header sticky con NOXEAL centrado, navegación a la izquierda, accesos a la derecha.
2. Hero con titular grande tipo revista y dos CTAs.
3. Portada editorial asimétrica (1 grande + 3 laterales).
4. Sección de temas virales en oscuro.
5. Grid de últimos artículos.
6. Newsletter funcional.
7. Buscador y filtros por categoría en /explorar.
8. Login JWT (admin seedeado).
9. Footer completo con links legales y sociales.
10. data-testid en todos los elementos interactivos.

## Implemented (2026-01-09)
- ✅ Backend: auth (register/login/logout/me/refresh), newsletter (subscribe + admin list),
  artículos (lista, featured, por slug, search, filtro categoría, trending), categorías agregadas.
- ✅ Seed automático: admin (`admin@noxeal.com` / `Noxeal2026!`) + 8 artículos de muestra.
- ✅ Frontend: 9 páginas — Home, Explorar, Tendencias, Categorías, Articulo, Buscar, Entrar,
  Suscribirse, páginas estáticas (Contacto / Privacidad / Términos / 404).
- ✅ Header glassmorphism con menú móvil, footer editorial, ArticleCard, ViralCard, Newsletter.
- ✅ CORS configurado por regex para `*.preview.emergentagent.com` + localhost.
- ✅ Tests: 18/18 backend pytest pasados; flujos frontend validados.

## Backlog (priorizado)
**P0 — listo cuando el usuario diga "ya tengo WordPress"**
- Conectar `/api/articles*` y `/api/categories` al WP REST API si `WORDPRESS_API_URL` está set.
- Mapear campos WP → modelo Noxeal (slug, image, category, excerpt, body, published_at).

**P1 — recomendados pronto**
- Integración newsletter con un proveedor real (Resend / SendGrid / Mailchimp) para envíos.
- Página de admin sencilla: ver suscriptores, exportar CSV.
- Brute-force lockout en `/api/auth/login` (5 intentos / 15 min).
- Imágenes optimizadas (next-gen formats, srcset).
- SEO: meta tags dinámicas por artículo, sitemap.xml, OpenGraph.

**P2 — nice to have**
- Modo lectura ("reader mode") con tipografía aún más limpia.
- Sistema de comentarios moderados.
- Push notifications para suscriptores.
- Versión RSS/Atom feed.

## Next Tasks
1. Cuando el usuario tenga el WordPress activo: setear `WORDPRESS_API_URL` y actualizar
   los handlers para hacer fallback al WP REST API.
2. Decidir proveedor de envío de newsletter.
3. Añadir analítica privacy-first (Plausible / Umami) si se desea.
