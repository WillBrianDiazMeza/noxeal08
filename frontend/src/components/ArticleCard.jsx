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
  const aspect = size === "large" ? "aspect-[16/10]" : size === "small" ? "aspect-[4/3]" : "aspect-[3/2]";
  const titleClass = size === "large"
    ? "h-display text-3xl md:text-4xl lg:text-[44px]"
    : size === "small"
    ? "h-display text-xl md:text-[22px]"
    : "h-display text-2xl md:text-[26px]";

  return (
    <article className="group" data-testid={testId || `article-card-${article.slug}`}>
      <Link to={`/articulo/${article.slug}`} className="block">
        <div className={`card-image-wrap ${aspect} mb-5`}>
          <img src={resolveImg(article.image)} alt={article.title} loading="lazy" />
        </div>
        <div className="label-eyebrow mb-3" data-testid={`article-category-${article.slug}`}>{article.category}</div>
        <h3 className={`${titleClass} mb-3 text-[#111111] group-hover:opacity-80 transition-opacity`}>
          {article.title}
        </h3>
        {article.excerpt && size !== "small" && (
          <p className="text-[15px] md:text-[16px] text-[#424245] leading-relaxed mb-4 line-clamp-3">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[#86868b]">{formatDate(article.published_at)}</span>
          <span className="btn-ghost inline-flex items-center gap-1" data-testid={`article-read-${article.slug}`}>
            Leer <ArrowUpRight size={14} />
          </span>
        </div>
      </Link>
    </article>
  );
}

export function HeroEditorialCard({ article }) {
  if (!article) return null;
  return (
    <article className="group" data-testid={`hero-editorial-${article.slug}`}>
      <Link to={`/articulo/${article.slug}`} className="block">
        <div className="card-image-wrap aspect-[16/11] mb-7">
          <img src={resolveImg(article.image)} alt={article.title} />
        </div>
        <div className="label-eyebrow mb-4">{article.category} · Portada</div>
        <h2 className="h-display text-4xl md:text-5xl lg:text-[56px] mb-5 text-[#111111] group-hover:opacity-85 transition-opacity">
          {article.title}
        </h2>
        <p className="text-lg text-[#424245] leading-relaxed mb-6 max-w-2xl">{article.excerpt}</p>
        <span className="btn-secondary" data-testid={`hero-read-cover-${article.slug}`}>
          Leer portada
        </span>
      </Link>
    </article>
  );
}
