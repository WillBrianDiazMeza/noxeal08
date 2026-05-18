import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Bloomberg-style top strip — single line, infinite horizontal scroll
 * of trending headlines. Premium, subtle, doesn't compete with hero.
 */
export default function TrendingTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/feed/trending?limit=10").then(({ data }) => {
      if (Array.isArray(data) && data.length > 0) setItems(data);
    }).catch(() => {});
  }, []);

  if (items.length === 0) return null;
  // Duplicate the list so the scroll loops seamlessly
  const doubled = [...items, ...items];

  return (
    <div className="nx-ticker" data-testid="trending-ticker" role="region" aria-label="Tendencias en vivo">
      <div className="nx-ticker-inner">
        <span className="nx-ticker-label">
          <TrendingUp size={11} strokeWidth={2.5} />
          <span>TENDENCIAS</span>
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
