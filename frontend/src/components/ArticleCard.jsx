import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import FactBadge from "@/components/FactBadge";

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
  const isRumor = article.fact_level === "rumor";
  const isStory = article.fact_level === "story";

  return (
    <article
      className={`group border-t pt-7 ${isRumor ? "border-red-200" : "border-black/10"}`}
      data-testid={testId || `article-card-${article.slug}`}
    >
      <Link to={`/articulo/${article.slug}`} className="block">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="label-eyebrow" data-testid={`article-category-${article.slug}`}>{article.category}</span>
          <span className="text-xs text-[#86868b]">· {formatDate(article.published_at)}</span>
          {article.fact_level && <FactBadge level={article.fact_level} size="sm" />}
        </div>
        <h3 className={`${titleClass} mb-4 text-[#111111] group-hover:opacity-80 transition-opacity ${isStory ? "italic" : ""}`}>
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
  const isRumor = article.fact_level === "rumor";
  return (
    <article className="group" data-testid={`hero-editorial-${article.slug}`}>
      <Link to={`/articulo/${article.slug}`} className="block">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="label-eyebrow">{article.category} · Portada</span>
          {article.fact_level && <FactBadge level={article.fact_level} size="sm" />}
        </div>
        <h2 className={`h-display text-4xl md:text-5xl lg:text-[56px] mb-6 text-[#111111] group-hover:opacity-85 transition-opacity leading-[1.05] ${article.fact_level === "story" ? "italic" : ""}`}>
          {article.title}
        </h2>
        <p className="text-lg text-[#424245] leading-relaxed mb-7 max-w-2xl">{article.excerpt}</p>
        {isRumor && (
          <p className="text-xs text-red-700 mb-5 max-w-2xl bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            ⚠ Esto es información viral SIN confirmar. Léelo con criterio.
          </p>
        )}
        <span className="btn-secondary" data-testid={`hero-read-cover-${article.slug}`}>
          Leer portada
        </span>
      </Link>
    </article>
  );
}
