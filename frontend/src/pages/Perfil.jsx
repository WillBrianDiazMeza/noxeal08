import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen, Clock, Bookmark, Highlighter, MessageCircle,
  Flame, Sparkles, Calendar, Trash2, LogIn, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import SEO from "@/components/SEO";
import FactBadge from "@/components/FactBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/lib/i18n";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

function formatJoined(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  } catch { return ""; }
}

const FACT_LABELS = {
  confirmed: "Confirmado",
  investigation: "Investigación",
  rumor: "Rumor / pendiente",
  opinion: "Opinión",
  analysis: "Análisis",
  story: "Historia",
};

export default function Perfil() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const authLoading = user === null;
  const authed = !!(user && user.email);

  const load = useCallback(async () => {
    if (!authed) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get("/me/dashboard");
      setData(data);
    } catch {
      toast.error(t("No se pudo cargar tu perfil"));
    } finally {
      setLoading(false);
    }
  }, [authed, t]);

  useEffect(() => { load(); }, [load]);

  const clearHistory = async () => {
    if (!window.confirm(t("¿Borrar tu historial de lectura? Esta acción no se puede deshacer."))) return;
    try {
      await api.delete("/me/dashboard/history");
      toast.success(t("Historial borrado"));
      load();
    } catch {
      toast.error(t("No se pudo borrar el historial"));
    }
  };

  // Not authenticated
  if (!authLoading && !authed) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-6 py-24" data-testid="perfil-locked">
        <SEO title="Tu perfil editorial · Noxeal" noindex />
        <div className="max-w-md text-center">
          <div className="label-eyebrow text-[var(--nx-text-muted)] mb-3">{t("Perfil editorial")}</div>
          <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight text-[var(--nx-text)] mb-5">
            {t("Tu ecosistema de lectura, en privado.")}
          </h1>
          <p className="text-[15px] text-[var(--nx-text-soft)] leading-relaxed mb-8">
            {t("Inicia sesión para ver tu historial, tus subrayados, las narrativas que has seguido y el mapa emocional de lo que lees.")}
          </p>
          <button
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => navigate("/entrar?next=/perfil")}
            data-testid="perfil-signin-cta"
          >
            <LogIn size={15} strokeWidth={1.6} /> {t("nav.signin")}
          </button>
        </div>
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center" data-testid="perfil-loading">
        <SEO title="Tu perfil editorial · Noxeal" noindex />
        <div className="label-eyebrow text-[var(--nx-text-muted)]">{t("common.loading")}</div>
      </main>
    );
  }

  const { user: u, totals, top_categories, top_tags, by_fact_level, emotions, recent } = data;

  return (
    <main className="bg-[var(--nx-bg)] min-h-screen pb-24" data-testid="perfil-page">
      <SEO title={`${u.name} · Perfil editorial · Noxeal`} noindex />

      {/* ──────────── Editorial header ──────────── */}
      <section className="bg-[var(--nx-dark)] text-white">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-16 md:py-20">
          <div className="label-eyebrow text-white/55 mb-4" data-testid="perfil-eyebrow">
            {t("Perfil editorial")}
          </div>
          <div className="grid md:grid-cols-[1fr_auto] gap-8 items-end">
            <div>
              <h1
                className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-tight"
                data-testid="perfil-name"
              >
                {u.name || u.email.split("@")[0]}
              </h1>
              <p className="mt-3 text-[15px] text-white/65 max-w-xl leading-relaxed">
                {t("Cada artículo que lees deja una huella editorial. Esta es la tuya.")}
              </p>
            </div>
            <div className="text-right md:text-right">
              <div className="label-eyebrow text-white/45 mb-1">{t("Miembro desde")}</div>
              <div className="font-serif text-2xl" data-testid="perfil-joined">
                <Calendar size={16} strokeWidth={1.5} className="inline -mt-0.5 mr-2 text-white/55" />
                {formatJoined(u.joined_at)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── KPIs strip ──────────── */}
      <section className="border-b border-[var(--nx-border)] bg-white">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 grid grid-cols-2 md:grid-cols-6 divide-x divide-[var(--nx-border)]">
          <Stat icon={<BookOpen size={14} />} label={t("Lecturas")} value={totals.reads} testid="stat-reads" />
          <Stat icon={<Clock size={14} />} label={t("Minutos")} value={totals.minutes} testid="stat-minutes" />
          <Stat icon={<Bookmark size={14} />} label={t("Guardados")} value={totals.saved} testid="stat-saved" />
          <Stat icon={<Highlighter size={14} />} label={t("Subrayados")} value={totals.highlights} testid="stat-highlights" />
          <Stat icon={<MessageCircle size={14} />} label={t("Comentarios")} value={totals.comments} testid="stat-comments" />
          <Stat icon={<Flame size={14} />} label={t("Racha (días)")} value={totals.streak_days} testid="stat-streak" highlight />
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-12 grid md:grid-cols-3 gap-10">
        {/* ──────────── LEFT: Emotional map ──────────── */}
        <div className="md:col-span-2 space-y-12">
          <section data-testid="perfil-emotions">
            <SectionHeader
              eyebrow={t("Mapa emocional")}
              title={t("Lo que tu lectura dice de ti")}
              note={t("Combinamos categorías y etiquetas de los artículos que has leído para detectar tus intereses dominantes.")}
            />
            {emotions.length === 0 ? (
              <EmptyHint text={t("Lee algunos artículos para descubrir tu mapa emocional.")} />
            ) : (
              <ul className="mt-6 space-y-4">
                {emotions.map((em) => (
                  <li key={em.key} className="border border-[var(--nx-border)] bg-white p-5" data-testid={`emotion-${em.key}`}>
                    <div className="flex items-baseline justify-between gap-4 mb-2">
                      <div>
                        <div className="font-serif text-xl text-[var(--nx-text)]">{t(em.label)}</div>
                        <div className="text-[13px] text-[var(--nx-text-muted)] mt-0.5">{t(em.desc)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-serif text-2xl tabular-nums text-[var(--nx-blue)]">{em.intensity}%</div>
                        <div className="text-[11px] uppercase tracking-widest text-[var(--nx-text-muted)]">{em.count} {em.count === 1 ? t("artículo") : t("artículos")}</div>
                      </div>
                    </div>
                    <div className="h-[3px] bg-[var(--nx-surface-muted)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--nx-blue)] rounded-full transition-all duration-700" style={{ width: `${em.intensity}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent reading timeline */}
          <section data-testid="perfil-timeline">
            <div className="flex items-baseline justify-between mb-6">
              <SectionHeader
                eyebrow={t("Tu timeline")}
                title={t("Lecturas recientes")}
                note={t("Tu archivo personal de las últimas historias que te llevaste contigo.")}
                inline
              />
              {recent.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[12px] uppercase tracking-widest text-[var(--nx-text-muted)] hover:text-[var(--nx-red)] inline-flex items-center gap-1.5 transition-colors"
                  data-testid="clear-history-btn"
                >
                  <Trash2 size={13} strokeWidth={1.5} /> {t("Borrar historial")}
                </button>
              )}
            </div>
            {recent.length === 0 ? (
              <EmptyHint text={t("Aún no tienes lecturas registradas. Empieza por la portada.")} cta={{ to: "/", label: t("Ir a la portada") }} />
            ) : (
              <ol className="space-y-0 border-t border-[var(--nx-border)]">
                {recent.map((r) => (
                  <li key={`${r.slug}-${r.read_at}`} className="border-b border-[var(--nx-border)] py-5 group" data-testid={`timeline-${r.slug}`}>
                    <Link to={`/articulo/${r.slug}`} className="block">
                      <div className="flex items-center gap-2 mb-1.5">
                        <FactBadge level={r.fact_level} />
                        <span className="label-eyebrow text-[var(--nx-text-muted)]">{r.category}</span>
                        <span className="text-[var(--nx-text-muted)] text-[11px]">· {formatDate(r.read_at)}</span>
                        <span className="text-[var(--nx-text-muted)] text-[11px]">· {r.read_time} min</span>
                      </div>
                      <h3 className="font-serif text-xl md:text-[22px] leading-snug text-[var(--nx-text)] group-hover:text-[var(--nx-blue)] transition-colors flex items-start gap-2">
                        {r.title}
                        <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 text-[var(--nx-blue)] shrink-0" />
                      </h3>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* ──────────── RIGHT: Sidebar ──────────── */}
        <aside className="space-y-10">
          {/* Top categories */}
          <section data-testid="perfil-categories">
            <SectionHeader eyebrow={t("Categorías favoritas")} title={t("Lo que más sigues")} small />
            {top_categories.length === 0 ? (
              <EmptyHint text={t("Sin datos aún.")} compact />
            ) : (
              <ul className="mt-4 space-y-2">
                {top_categories.map((c) => (
                  <li key={c.name} className="flex items-baseline justify-between border-b border-dashed border-[var(--nx-border)] py-2">
                    <span className="text-[14px] text-[var(--nx-text)]">{t(c.name)}</span>
                    <span className="tabular-nums text-[13px] text-[var(--nx-text-muted)]">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Top tags */}
          {top_tags.length > 0 && (
            <section data-testid="perfil-tags">
              <SectionHeader eyebrow={t("Tus etiquetas")} title={t("Recurrentes")} small />
              <div className="mt-3 flex flex-wrap gap-2">
                {top_tags.map((tg) => (
                  <Link
                    key={tg.slug}
                    to={`/tendencias/${tg.slug}`}
                    className="text-[12px] px-2.5 py-1 rounded-full border border-[var(--nx-border)] hover:border-[var(--nx-blue)] hover:text-[var(--nx-blue)] transition-colors"
                    data-testid={`tag-${tg.slug}`}
                  >
                    #{tg.slug} <span className="opacity-50">· {tg.count}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Fact level distribution */}
          {Object.keys(by_fact_level).length > 0 && (
            <section data-testid="perfil-fact-levels">
              <SectionHeader eyebrow={t("Tipo de lectura")} title={t("Qué tipo de historias eliges")} small />
              <ul className="mt-3 space-y-2.5">
                {Object.entries(by_fact_level).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
                  <li key={k} className="flex items-baseline justify-between text-[13.5px]">
                    <span className="text-[var(--nx-text)]">{t(FACT_LABELS[k] || k)}</span>
                    <span className="tabular-nums text-[var(--nx-text-muted)]">{v}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Quick links */}
          <section className="bg-[var(--nx-surface-muted)] border border-[var(--nx-border)] p-5">
            <div className="label-eyebrow text-[var(--nx-text-muted)] mb-3">{t("Tu ecosistema")}</div>
            <ul className="space-y-2.5 text-[14px]">
              <li><Link to="/guardados" className="nx-link-editorial inline-flex items-center gap-2"><Bookmark size={13} strokeWidth={1.6} /> {t("nav.saved")} · {totals.saved}</Link></li>
              <li><Link to="/mis-notas" className="nx-link-editorial inline-flex items-center gap-2"><Highlighter size={13} strokeWidth={1.6} /> {t("nav.notes")} · {totals.highlights}</Link></li>
              <li><Link to="/temas" className="nx-link-editorial inline-flex items-center gap-2"><Sparkles size={13} strokeWidth={1.6} /> {t("nav.topics")}</Link></li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}

// ───── Small atoms (kept local to keep the surface lean) ─────
function Stat({ icon, label, value, testid, highlight }) {
  return (
    <div className="px-4 md:px-6 py-6 first:pl-0 md:first:pl-6" data-testid={testid}>
      <div className="flex items-center gap-1.5 label-eyebrow text-[var(--nx-text-muted)] mb-2">
        <span className={highlight ? "text-[var(--nx-blue)]" : ""}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`font-serif text-3xl md:text-4xl tabular-nums ${highlight ? "text-[var(--nx-blue)]" : "text-[var(--nx-text)]"}`}>
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, note, small, inline }) {
  return (
    <div className={inline ? "" : "mb-2"}>
      <div className="label-eyebrow text-[var(--nx-text-muted)]">{eyebrow}</div>
      <h2 className={`font-serif tracking-tight text-[var(--nx-text)] mt-1.5 ${small ? "text-xl" : "text-2xl md:text-[28px]"} leading-tight`}>
        {title}
      </h2>
      {note && <p className="text-[13.5px] text-[var(--nx-text-soft)] mt-2 max-w-xl leading-relaxed">{note}</p>}
    </div>
  );
}

function EmptyHint({ text, compact, cta }) {
  return (
    <div className={`border border-dashed border-[var(--nx-border)] ${compact ? "py-4 px-3 mt-3" : "py-10 px-6 mt-4"} text-center bg-white`}>
      <p className="text-[13.5px] text-[var(--nx-text-muted)]">{text}</p>
      {cta && (
        <Link to={cta.to} className="btn-secondary inline-block mt-4 text-[12.5px]">{cta.label}</Link>
      )}
    </div>
  );
}
