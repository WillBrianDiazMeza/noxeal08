import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, TrendingUp, Clock3 } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n";

function fmtAgo(min, t) {
  if (min == null) return t("recién");
  if (min < 1) return t("ahora");
  if (min < 60) return `${t("hace")} ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${t("hace")} ${h} h`;
  const d = Math.floor(h / 24);
  return `${t("hace")} ${d} d`;
}

export default function EditorialActivityStrip() {
  const { t } = useLang();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchIt = () => {
      api.get("/editorial/activity")
        .then(({ data }) => { if (!cancelled) setData(data); })
        .catch(() => {});
    };
    fetchIt();
    const interval = setInterval(fetchIt, 60_000); // refresh every minute
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!data || !data.last_published) return null;
  const last = data.last_published;

  return (
    <div className="nx-activity-strip" data-testid="editorial-activity-strip">
      <div className="nx-activity-row">
        <span className="nx-activity-pulse" aria-hidden="true" />
        <span className="label-eyebrow text-[#86868b]">{t("Redacción en directo")}</span>
        <span className="nx-activity-sep">·</span>
        <Clock3 size={11} className="text-[#86868b]" />
        <span className="text-[12.5px] text-[#1a1a1a]" data-testid="activity-last-updated">
          {t("Última publicación")} <strong className="font-semibold">{fmtAgo(last.minutes_ago, t)}</strong>
        </span>
        <span className="nx-activity-sep">·</span>
        <TrendingUp size={11} className="text-[var(--nx-blue)]" />
        <span className="text-[12.5px] text-[#1a1a1a]">
          <strong className="font-semibold" data-testid="activity-counts-24h">{data.counts_24h}</strong>
          {" "}{data.counts_24h !== 1 ? t("publicaciones en 24h") : t("publicación en 24h")} ·{" "}
          <strong className="font-semibold" data-testid="activity-counts-7d">{data.counts_7d}</strong> {t("esta semana")}
        </span>
      </div>
      <Link
        to={`/articulo/${last.slug}`}
        className="nx-activity-headline group"
        data-testid="activity-latest-link"
      >
        <Radio size={13} className="text-[var(--nx-blue)] flex-shrink-0" />
        <span className="text-[13.5px] truncate">
          <span className="text-[#86868b] mr-2">{t("Lo más reciente:")}</span>
          <span className="text-black group-hover:text-[var(--nx-blue)] transition-colors font-medium">
            {last.title}
          </span>
        </span>
      </Link>
    </div>
  );
}
