import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n";

/**
 * Public "Estado emocional del internet" strip.
 * Reads /api/emotional/state and renders the dominant emotional currents
 * detected across the last 30 days of editorial output.
 */
export default function EmotionalStateStrip() {
  const { t } = useLang();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/emotional/state")
      .then(({ data }) => setData(data))
      .catch(() => {});
  }, []);

  if (!data || !Array.isArray(data.emotions) || data.emotions.length === 0) return null;
  const top = data.emotions.slice(0, 4);

  return (
    <section className="bg-[var(--nx-dark)] text-white py-14 md:py-20 border-t border-b border-black/10" data-testid="emotional-strip">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity size={14} className="text-[var(--nx-blue)]" strokeWidth={2} />
          <span className="label-eyebrow text-white/55">{t("Pulso del internet · últimos 30 días")}</span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.05] tracking-tight max-w-3xl mb-10">
          {t("Lo que internet siente esta semana.")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {top.map((em, i) => (
            <div key={em.key} className="border-t border-white/15 pt-5" data-testid={`emotion-card-${em.key}`}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="label-eyebrow text-white/45">0{i+1}</span>
                <span className="font-serif text-2xl text-[var(--nx-blue)] tabular-nums">{em.intensity}%</span>
              </div>
              <h3 className="font-serif text-xl md:text-[22px] leading-tight mb-1.5">{t(em.label)}</h3>
              <p className="text-[13px] text-white/55 leading-relaxed mb-3">{t(em.desc)}</p>
              <div className="h-[2px] bg-white/10 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-[var(--nx-blue)]" style={{ width: `${em.intensity}%` }} />
              </div>
              {em.top && em.top.slug && (
                <Link
                  to={`/articulo/${em.top.slug}`}
                  className="text-[12.5px] text-white/75 hover:text-white inline-flex items-center gap-1.5 transition-colors group"
                  data-testid={`emotion-top-${em.key}`}
                >
                  <span className="text-[var(--nx-blue)]">→</span>
                  <span className="line-clamp-2 group-hover:underline">{em.top.title}</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
