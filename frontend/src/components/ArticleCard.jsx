import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

export function ArticleCard({ article, size = "default", testId }) {
  if (!article) return null;
  const titleClass = size === "large"
    ? "h-display text-3xl md:text-4xl lg:text-[44px]"
    : size === "small"
    ? "h-display text-xl md:text-[22px]"
    : "h-display text-2xl md:text-[26px]";

  return (
    <article className="group border-t border-black/10 pt-7" data-testid={testId || `article-card-${article.slug}`}>
      <Link to={`/articulo/${article.slug}`} className="block">
        <div className="flex items-center gap-3 mb-4">
          <span className="label-eyebrow" data-testid={`article-category-${article.slug}`}>{article.category}</span>
          <span className="text-xs text-[#86868b]">· {formatDate(article.published_at)}</span>
        </div>
        <h3 className={`${titleClass} mb-4 text-[#111111] group-hover:opacity-80 transition-opacity`}>
          {article.title}
        </h3>
        {article.excerpt && size !== "small" && (
          <p className="text-[15px] md:text-[16px] text-[#424245] leading-relaxed mb-5 line-clamp-3">
            {article.excerpt}
          </p>
        )}
        <span className="btn-ghost inline-flex items-center gap-1" data-testid={`article-read-${article.slug}`}>
          Leer <ArrowUpRight size={14} />
        </span>
      </Link>
    </article>
  );
}

export function HeroEditorialCard({ article }) {
  if (!article) return null;
  return (
    <article className="group" data-testid={`hero-editorial-${article.slug}`}>
      <Link to={`/articulo/${article.slug}`} className="block">
        <div className="label-eyebrow mb-5">{article.category} · Portada</div>
        <h2 className="h-display text-4xl md:text-5xl lg:text-[56px] mb-6 text-[#111111] group-hover:opacity-85 transition-opacity leading-[1.05]">
          {article.title}
        </h2>
        <p className="text-lg text-[#424245] leading-relaxed mb-7 max-w-2xl">{article.excerpt}</p>
        <span className="btn-secondary" data-testid={`hero-read-cover-${article.slug}`}>
          Leer portada
        </span>
      </Link>
    </article>
  );
}
