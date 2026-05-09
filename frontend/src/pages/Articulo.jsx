import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

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
    api.get(`/articles/${slug}`)
      .then(({ data }) => setArticle(data))
      .catch(() => setError("Artículo no encontrado"))
      .finally(() => setLoading(false));
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
      <article className="pt-16 md:pt-24 pb-24">
        <div className="max-w-3xl mx-auto px-5 lg:px-0">
          <Link to="/explorar" className="inline-flex items-center gap-2 text-sm text-[#86868b] hover:text-black mb-10" data-testid="article-back">
            <ArrowLeft size={14} /> Volver
          </Link>
          <div className="label-eyebrow mb-5" data-testid="article-category">{article.category}</div>
          <h1 className="h-display text-4xl md:text-5xl lg:text-[64px] mb-8 leading-[1.05]" data-testid="article-title">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-[#86868b] mb-12">
            <span data-testid="article-author">{article.author}</span>
            <span>·</span>
            <span data-testid="article-date">{formatDate(article.published_at)}</span>
            {article.read_time && (<><span>·</span><span>{article.read_time} min de lectura</span></>)}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-5 lg:px-8 mb-16">
          <div className="card-image-wrap aspect-[16/9]">
            <img src={article.image} alt={article.title} />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 lg:px-0 prose-noxeal" data-testid="article-body">
          <p className="text-xl text-[#1a1a1a] leading-relaxed mb-8 font-medium">
            {article.excerpt}
          </p>
          {(article.body || []).map((p, i) => (<p key={i}>{p}</p>))}
          <p className="text-[#86868b] mt-12 text-sm">— Redacción Noxeal</p>
        </div>
      </article>
    </main>
  );
}
