import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Tag } from "lucide-react";
import { api } from "@/lib/api";
import SEO from "@/components/SEO";
import SocialShare from "@/components/SocialShare";
import Comments from "@/components/Comments";
import RelatedArticles from "@/components/RelatedArticles";
import ArticleEngagement from "@/components/ArticleEngagement";

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

  if (loading) return <div className="max-w-3xl mx-auto px-5 py-32 text-center text-[#86868b]">Cargando…</div>;
  if (error || !article) return (
    <div className="max-w-3xl mx-auto px-5 py-32 text-center" data-testid="article-not-found">
      <h1 className="h-display text-4xl mb-4">Artículo no encontrado</h1>
      <Link to="/explorar" className="btn-secondary">Volver a explorar</Link>
    </div>
  );

  return (
    <main data-testid="article-page">
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
      />
      <article className="pt-16 md:pt-24 pb-8">
        <div className="max-w-3xl mx-auto px-5 lg:px-0">
          <Link to="/explorar" className="inline-flex items-center gap-2 text-sm text-[#86868b] hover:text-black mb-10" data-testid="article-back">
            <ArrowLeft size={14} /> Volver
          </Link>
          <div className="label-eyebrow mb-5" data-testid="article-category">{article.category}</div>
          <h1 className="h-display text-4xl md:text-5xl lg:text-[64px] mb-8 leading-[1.05]" data-testid="article-title">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-[#86868b] mb-8 flex-wrap">
            <span data-testid="article-author">{article.author}</span>
            {article.author === "Noxeal AI" && (
              <span className="text-[10px] uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-full">IA + Editor</span>
            )}
            <span>·</span>
            <span data-testid="article-date">{formatDate(article.published_at)}</span>
            {article.read_time && (<><span>·</span><span>{article.read_time} min de lectura</span></>)}
          </div>

          <ArticleEngagement
            slug={article.slug}
            initialLikes={article.likes || 0}
            views={article.views || 0}
            commentsCount={article.comments_count || 0}
          />
        </div>

        <div className="max-w-3xl mx-auto px-5 lg:px-0 prose-noxeal" data-testid="article-body">
          <p className="text-xl text-[#1a1a1a] leading-relaxed mb-8 font-medium">
            {article.excerpt}
          </p>
          {(article.body || []).map((p, i) => (<p key={i}>{p}</p>))}
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

        {/* Comments */}
        <Comments slug={article.slug} />
      </article>

      <RelatedArticles slug={article.slug} />
    </main>
  );
}
