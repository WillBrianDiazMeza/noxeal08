import { Helmet } from "react-helmet-async";

const SITE_NAME = "Noxeal";
const SITE_URL = "https://noxeal.com";

export default function SEO({
  title,
  description,
  image,
  type = "website",
  path = "",
  article, // { datePublished, dateModified, author, category, tags }
}) {
  // Always use the real production canonical, not the preview URL.
  const fullUrl = `${SITE_URL}${path}`;
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Periodismo lento sobre la cultura digital`;
  const desc =
    description ||
    "Noxeal transforma tendencias, historias virales y temas complejos en contenido claro, verificable e inteligente.";

  const jsonLd = article
    ? {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: title,
        description: desc,
        datePublished: article.datePublished,
        dateModified: article.dateModified || article.datePublished,
        author: {
          "@type": "Organization",
          name: article.author || "Noxeal Editorial",
          url: SITE_URL,
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
        },
        mainEntityOfPage: fullUrl,
        articleSection: article.category,
        keywords: (article.tags || []).join(", "),
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: desc,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/buscar?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="es_ES" />
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
      <link rel="canonical" href={fullUrl} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
