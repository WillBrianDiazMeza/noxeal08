import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Highlighter as HighlighterIcon, Trash2, Cloud, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";

const LS_KEY = "noxeal_highlights";
const COLOR_BG = { yellow: "#fef9c3", green: "#d1fae5", blue: "#dbeafe" };
const COLOR_TEXT = { yellow: "#78350f", green: "#065f46", blue: "#1e3a8a" };

function readAllLocal() {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    const out = [];
    for (const slug of Object.keys(all)) {
      for (const h of (all[slug] || [])) {
        out.push({ ...h, slug });
      }
    }
    return out;
  } catch { return []; }
}

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
}

export default function MisNotas() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (user?.email) {
      try {
        const { data } = await api.get("/me/highlights");
        setItems(data || []);
      } catch { setItems([]); }
    } else {
      setItems(readAllLocal());
    }
    setLoading(false);
  }, [user?.email]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    for (const h of items) {
      if (!map[h.slug]) map[h.slug] = { slug: h.slug, title: h.article_title || h.slug, items: [] };
      map[h.slug].items.push(h);
    }
    return Object.values(map);
  }, [items]);

  const remove = async (h) => {
    if (!window.confirm("¿Eliminar subrayado?")) return;
    setItems((arr) => arr.filter((x) => x.id !== h.id));
    if (user?.email && !String(h.id).startsWith("local-")) {
      api.delete(`/me/highlights/${h.id}`).catch(() => {});
    } else {
      // remove from localStorage
      try {
        const all = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
        all[h.slug] = (all[h.slug] || []).filter((x) => x.id !== h.id);
        if (!all[h.slug].length) delete all[h.slug];
        localStorage.setItem(LS_KEY, JSON.stringify(all));
      } catch { /* ignore */ }
    }
    toast.success("Eliminado");
  };

  return (
    <main className="min-h-[70vh]" data-testid="mis-notas-page">
      <SEO
        title="Tus subrayados y notas"
        description="Todo lo que subrayaste y anotaste en Noxeal. Periodismo lento, lectura activa."
        path="/mis-notas"
        noindex
      />
      <section className="max-w-5xl mx-auto px-5 lg:px-8 pt-16 md:pt-24 pb-10">
        <div className="label-eyebrow mb-3" style={{ color: "var(--nx-blue)" }}>Tu archivo de lectura</div>
        <h1 className="h-display text-4xl md:text-5xl lg:text-[56px] leading-[1.02] mb-5">
          Subrayados y notas
        </h1>
        <p className="text-base text-[#424245] flex items-center gap-2 flex-wrap">
          {user?.email ? (
            <>
              <Cloud size={14} className="text-emerald-700" strokeWidth={2} />
              <span data-testid="mis-notas-sync-status">Sincronizado en tu cuenta · {user.name}</span>
            </>
          ) : (
            <>
              <CloudOff size={14} className="text-[#86868b]" strokeWidth={2} />
              <span data-testid="mis-notas-local-status">
                Guardado solo en este navegador. <Link to="/entrar" className="underline hover:text-black">Inicia sesión</Link> para sincronizar.
              </span>
            </>
          )}
        </p>
      </section>

      <div className="nx-divider max-w-5xl mx-auto" />

      <section className="max-w-5xl mx-auto px-5 lg:px-8 py-10">
        {loading ? (
          <p className="text-[#86868b]" data-testid="mis-notas-loading">Cargando…</p>
        ) : grouped.length === 0 ? (
          <div className="py-16 text-center" data-testid="mis-notas-empty">
            <HighlighterIcon size={32} className="mx-auto mb-4 text-[#86868b]" strokeWidth={1.3} />
            <h2 className="h-display text-2xl mb-3">No tienes subrayados aún</h2>
            <p className="text-[#86868b] max-w-md mx-auto mb-7">
              Selecciona texto en cualquier artículo para subrayarlo en amarillo, verde o azul, y añadir tus propias notas.
            </p>
            <Link to="/explorar" className="btn-primary">Explorar artículos</Link>
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.map((g) => (
              <div key={g.slug} data-testid={`mis-notas-group-${g.slug}`}>
                <Link to={`/articulo/${g.slug}`} className="block mb-4 group">
                  <span className="label-eyebrow">Artículo</span>
                  <h3 className="h-display text-2xl mt-1 group-hover:text-[var(--nx-blue)] transition-colors">{g.title}</h3>
                </Link>
                <ul className="space-y-3">
                  {g.items.map((h) => (
                    <li key={h.id} className="relative group" data-testid={`mis-notas-item-${h.id}`}>
                      <blockquote
                        className="text-[15px] leading-relaxed"
                        style={{
                          background: COLOR_BG[h.color] || COLOR_BG.yellow,
                          color: COLOR_TEXT[h.color] || COLOR_TEXT.yellow,
                          padding: "14px 18px",
                          borderRadius: 12,
                        }}
                      >
                        {h.text}
                      </blockquote>
                      {h.note && (
                        <p className="mt-2 text-[14px] text-[#1a1a1a] italic">“{h.note}”</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[#86868b]">
                        <span>{fmtDate(h.created_at)}</span>
                        <button
                          onClick={() => remove(h)}
                          className="inline-flex items-center gap-1 hover:text-[#b91c1c] opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`mis-notas-remove-${h.id}`}
                        >
                          <Trash2 size={11} /> Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
