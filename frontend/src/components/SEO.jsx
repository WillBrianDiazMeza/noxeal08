import { Helmet } from "react-helmet-async";

const SITE_NAME = "Noxeal";
const SITE_URL = "https://noxeal.com";
const DEFAULT_OG = `${SITE_URL}/og-image.jpg`;

export default function SEO({
  title,
  description,
  image,
  type = "website",
  path = "",
  article, // { datePublished, dateModified, author, category, tags }
  noindex = false,
}) {
  const fullUrl = `${SITE_URL}${path}`;
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Periodismo lento sobre la cultura digital`;
  const desc =
    description ||
    "Noxeal transforma tendencias, historias virales y temas complejos en contenido claro, verificable e inteligente.";
  const ogImage = image || DEFAULT_OG;

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE_NAME,
    alternateName: "Noxeal Editorial",
    url: SITE_URL,
    logo: `${SITE_URL}/noxeal-logo.png`,
    description:
      "Noxeal es una revista digital editorial en español dedicada al periodismo lento sobre la cultura digital, las tendencias virales y los temas complejos del momento.",
    sameAs: [],
    foundingDate: "2026",
    inLanguage: "es",
  };

  const jsonLd = article
    ? {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: title,
        description: desc,
        image: [ogImage],
        datePublished: article.datePublished,
        dateModified: article.dateModified || article.datePublished,
        author: {
          "@type": "Organization",
          name: article.author || "Noxeal Editorial",
          url: SITE_URL,
        },
        publisher: {
          "@type": "NewsMediaOrganization",
          name: SITE_NAME,
          url: SITE_URL,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/noxeal-logo.png`,
            width: 1536,
            height: 1024,
          },
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
        publisher: {
          "@type": "NewsMediaOrganization",
          name: SITE_NAME,
          logo: `${SITE_URL}/noxeal-logo.png`,
        },
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
      <meta name="robots" content={noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1"} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="es_ES" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      <link rel="canonical" href={fullUrl} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(organizationLd)}</script>
    </Helmet>
  );
}
