import { Helmet } from "react-helmet-async";

export default function SEO({ title, description, image, type = "website", path = "" }) {
  const base = process.env.REACT_APP_BACKEND_URL || "";
  const fullUrl = `${base}${path}`;
  const fullTitle = title ? `${title} · Noxeal` : "Noxeal — Periodismo lento sobre la cultura digital";
  const desc = description || "Noxeal transforma tendencias, historias virales y temas complejos en contenido claro, verificable e inteligente.";
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content="Noxeal" />
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
      <link rel="canonical" href={fullUrl} />
    </Helmet>
  );
}
