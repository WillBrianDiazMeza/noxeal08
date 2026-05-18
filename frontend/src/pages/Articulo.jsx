import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Tag, Maximize2, Minimize2 } from "lucide-react";
import { api } from "@/lib/api";
import SEO from "@/components/SEO";
import SocialShare from "@/components/SocialShare";
import Comments from "@/components/Comments";
import RelatedArticles from "@/components/RelatedArticles";
import ArticleEngagement from "@/components/ArticleEngagement";
import FactBadge from "@/components/FactBadge";
import VerificationBar from "@/components/VerificationBar";
import ReadingProgress from "@/components/ReadingProgress";
import {
  WhatIsKnownBlock,
  WhatIsMissingBlock,
  RealityVsViralityBlock,
  ArticleFAQ,
} from "@/components/ArticleTransparency";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

export default function Articulo() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    setLoading(true);
    setArticle(null);
    api.get(`/articles/${slug}`)
      .then(({ data }) => {
        setArticle(data);
        // Fire-and-forget view tracking
        api.post(`/articles/${slug}/view`).catch(() => {});
      })
      .catch(() => setError("Artículo no encontrado"))
      .finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [slug]);

  // Sync focus mode with body class + ESC to exit
  useEffect(() => {
    document.body.classList.toggle("nx-focus-on", focusMode);
    const onKey = (e) => { if (e.key === "Escape") setFocusMode(false); };
    if (focusMode) window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("nx-focus-on");
      window.removeEventListener("keydown", onKey);
    };
  }, [focusMode]);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-5 py-32" data-testid="article-loading">
      <div className="nx-skeleton h-4 w-24 mb-6" />
      <div className="nx-skeleton h-12 w-full mb-3" />
      <div className="nx-skeleton h-12 w-5/6 mb-10" />
      <div className="nx-skeleton h-4 w-full mb-3" />
      <div className="nx-skeleton h-4 w-full mb-3" />
      <div className="nx-skeleton h-4 w-3/4" />
    </div>
  );
  if (error || !article) return (
    <div className="max-w-3xl mx-auto px-5 py-32 text-center" data-testid="article-not-found">
      <h1 className="h-display text-4xl mb-4">Artículo no encontrado</h1>
      <Link to="/explorar" className="btn-secondary">Volver a explorar</Link>
    </div>
  );

  return (
    <main data-testid="article-page">
      <ReadingProgress />
      <SEO
        title={article.title}
        description={article.excerpt}
        type="article"
        path={`/articulo/${article.slug}`}
        article={{
          datePublished: article.published_at,
          dateModified: article.updated_at || article.published_at,
          author: article.author || "Noxeal Editorial",
          category: article.category,
          tags: article.tags,
        }}
        breadcrumbs={[
          { name: "Inicio", url: "/" },
          ...(article.category_slug ? [{ name: article.category, url: `/categoria/${article.category_slug}` }] : []),
          { name: article.title, url: `/articulo/${article.slug}` },
        ]}
      />
      <article className="pt-16 md:pt-24 pb-8 nx-article-root">
        <div className="max-w-3xl mx-auto px-5 lg:px-0">
          <div className="flex items-center justify-between mb-10">
            <Link to="/explorar" className="inline-flex items-center gap-2 text-sm text-[#86868b] hover:text-black" data-testid="article-back">
              <ArrowLeft size={14} /> Volver
            </Link>
            <button
              type="button"
              onClick={() => setFocusMode((v) => !v)}
              className="nx-focus-toggle inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#86868b] hover:text-black transition-colors"
              data-testid="article-focus-toggle"
              aria-pressed={focusMode}
              title={focusMode ? "Salir del modo lectura (ESC)" : "Modo lectura inmersivo"}
            >
              {focusMode ? <Minimize2 size={14} strokeWidth={1.6} /> : <Maximize2 size={14} strokeWidth={1.6} />}
              <span className="hidden sm:inline">{focusMode ? "Salir" : "Modo lectura"}</span>
            </button>
          </div>
          <div className="flex items-center gap-3 mb-5 flex-wrap" data-testid="article-meta-row">
            <span className="label-eyebrow" data-testid="article-category">{article.category}</span>
            {article.fact_level && <FactBadge level={article.fact_level} size="md" />}
          </div>
          <h1 className={`h-display text-4xl md:text-5xl lg:text-[64px] mb-8 leading-[1.05] ${article.fact_level === "story" ? "italic" : ""}`} data-testid="article-title">
            {article.title}
          </h1>

          {/* Rumor warning banner */}
          {article.fact_level === "rumor" && (
            <div className="mb-8 p-5 rounded-2xl bg-red-50 border border-red-200" data-testid="rumor-warning">
              <p className="text-sm text-red-900 leading-relaxed">
                <strong>Esto es un rumor en circulación, NO está confirmado.</strong> Noxeal publica este tipo de contenido como análisis de narrativas virales, no como noticia. Lee con criterio y consulta fuentes primarias antes de compartir.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm text-[#86868b] mb-8 flex-wrap">
            <span data-testid="article-author">{article.author}</span>
            {article.author === "Noxeal AI" && (
              <span className="text-[10px] uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-full">IA + Editor</span>
            )}
            <span>·</span>
            <span data-testid="article-date">{formatDate(article.published_at)}</span>
            {article.updated_at && article.updated_at !== article.published_at && (
              <>
                <span>·</span>
                <span data-testid="article-updated" className="italic">Actualizado {formatDate(article.updated_at)}</span>
              </>
            )}
            {article.read_time && (<><span>·</span><span>{article.read_time} min de lectura</span></>)}
          </div>

          <ArticleEngagement
            slug={article.slug}
            initialLikes={article.likes || 0}
            views={article.views || 0}
            commentsCount={article.comments_count || 0}
          />

          {/* Verification confidence — only show when meaningful */}
          {typeof article.verification_level === "number" && (
            <div className="mt-8">
              <VerificationBar
                level={article.verification_level}
                factLevel={article.fact_level || "analysis"}
              />
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto px-5 lg:px-0 prose-noxeal" data-testid="article-body">
          <p className="text-xl text-[#1a1a1a] leading-relaxed mb-8 font-medium">
            {article.excerpt}
          </p>
          {(article.body || []).map((p, i) => (<p key={i}>{p}</p>))}
        </div>

        {/* Editorial transparency blocks (iter 10) — render only if data exists */}
        <div className="max-w-3xl mx-auto px-5 lg:px-0">
          {article.what_is_known?.length > 0 && <WhatIsKnownBlock items={article.what_is_known} />}
          {article.what_is_missing?.length > 0 && <WhatIsMissingBlock items={article.what_is_missing} />}
          {article.reality_vs_virality?.length > 0 && <RealityVsViralityBlock items={article.reality_vs_virality} />}
        </div>

        {/* Source disclosure (for Make.com-imported articles) */}
        {article.source_url && (
          <div className="max-w-3xl mx-auto px-5 lg:px-0 mt-8 text-sm text-[#86868b] border-t border-black/10 pt-6" data-testid="article-source">
            Fuente original: <a href={article.source_url} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-black break-all">{article.source_url}</a>
          </div>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="max-w-3xl mx-auto px-5 lg:px-0 mt-10" data-testid="article-tags">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={14} className="text-[#86868b]" />
              {article.tags.map((t) => (
                <Link
                  key={t}
                  to={`/explorar?tag=${encodeURIComponent(t)}`}
                  className="px-3 py-1 rounded-full text-xs border border-black/10 hover:bg-black hover:text-white transition-colors"
                  data-testid={`article-tag-${t}`}
                >
                  #{t}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-5 lg:px-0">
          <SocialShare url={`/articulo/${article.slug}`} title={article.title} excerpt={article.excerpt} />
        </div>

        {/* FAQ + FAQPage JSON-LD (iter 10) */}
        {article.faqs?.length > 0 && (
          <div className="max-w-3xl mx-auto px-5 lg:px-0">
            <ArticleFAQ faqs={article.faqs} articleTitle={article.title} />
          </div>
        )}

        {/* Comments */}
        <Comments slug={article.slug} />
      </article>

      <RelatedArticles slug={article.slug} />
    </main>
  );
}
