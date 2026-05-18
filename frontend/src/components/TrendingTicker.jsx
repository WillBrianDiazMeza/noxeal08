import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { useLang, translateMany } from "@/lib/i18n";

/**
 * Bloomberg-style top strip — single line, infinite horizontal scroll
 * of trending headlines. Premium, subtle, doesn't compete with hero.
 * When lang != es we batch-translate the headlines on the fly so the
 * whole platform feels instantly localized.
 */
export default function TrendingTicker() {
  const { lang, t } = useLang();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.get("/feed/trending?limit=10").then(async ({ data }) => {
      if (cancelled || !Array.isArray(data) || data.length === 0) return;
      setItems(data);
      if (lang && lang !== "es") {
        const titles = data.map((a) => a.title || "");
        const cats = data.map((a) => a.category || "");
        const [trTitles, trCats] = await Promise.all([
          translateMany(titles, lang),
          translateMany(cats, lang),
        ]);
        if (cancelled) return;
        setItems(data.map((a, i) => ({
          ...a,
          title: trTitles[i] || a.title,
          category: trCats[i] || a.category,
        })));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lang]);

  if (items.length === 0) return null;
  // Duplicate the list so the scroll loops seamlessly
  const doubled = [...items, ...items];

  return (
    <div className="nx-ticker" data-testid="trending-ticker" role="region" aria-label={t("Tendencias en vivo")}>
      <div className="nx-ticker-inner">
        <span className="nx-ticker-label">
          <TrendingUp size={11} strokeWidth={2.5} />
          <span>{t("nav.trends").toUpperCase()}</span>
        </span>
        <div className="nx-ticker-track" aria-hidden="false">
          {doubled.map((a, i) => (
            <Link
              key={`${a.slug}-${i}`}
              to={`/articulo/${a.slug}`}
              className="nx-ticker-item"
              data-testid={i < items.length ? `ticker-item-${i}` : undefined}
            >
              <span className="nx-ticker-cat">{a.category}</span>
              <span className="nx-ticker-title">{a.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
