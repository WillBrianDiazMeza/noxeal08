import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Trash2, Cloud, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import SEO from "@/components/SEO";
import FactBadge from "@/components/FactBadge";
import { useAuth } from "@/contexts/AuthContext";

const LS_SAVE = "noxeal_saved_articles";

function readSavedSlugs() {
  try {
    return JSON.parse(localStorage.getItem(LS_SAVE) || "[]");
  } catch {
    return [];
  }
}

function writeSavedSlugs(arr) {
  localStorage.setItem(LS_SAVE, JSON.stringify(arr));
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

export default function Guardados() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let slugs = readSavedSlugs();
    // If logged in, sync with server first (merges local + remote, server is source of truth)
    if (user && user.email) {
      try {
        const { data } = await api.post("/me/saved/sync", { slugs });
        slugs = data.slugs || [];
        writeSavedSlugs(slugs);
      } catch {
        // fallback to localStorage if sync fails
      }
    }
    if (!slugs.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.post("/articles/by-slugs", { slugs });
      setItems(Array.isArray(data) ? data : []);
      const found = new Set((data || []).map((d) => d.slug));
      const cleaned = slugs.filter((s) => found.has(s));
      if (cleaned.length !== slugs.length) writeSavedSlugs(cleaned);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onStorage = (e) => { if (e.key === LS_SAVE) load(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const removeOne = async (slug) => {
    const next = readSavedSlugs().filter((s) => s !== slug);
    writeSavedSlugs(next);
    setItems((arr) => arr.filter((a) => a.slug !== slug));
    if (user && user.email) {
      api.delete(`/me/saved/${slug}`).catch(() => {});
    }
    toast.success("Eliminado de tu lista");
  };

  const clearAll = async () => {
    if (!items.length) return;
    if (!window.confirm("¿Vaciar tu lista de lectura?")) return;
    const slugs = readSavedSlugs();
    writeSavedSlugs([]);
    setItems([]);
    if (user && user.email) {
      // Fire-and-forget delete each on server
      slugs.forEach((s) => api.delete(`/me/saved/${s}`).catch(() => {}));
    }
    toast.success("Lista vaciada");
  };

  return (
    <main className="min-h-[70vh]" data-testid="guardados-page">
      <SEO
        title="Tu lista de lectura"
        description="Artículos que guardaste en Noxeal para leer con calma. Periodismo lento sobre la cultura digital."
        path="/guardados"
        noindex
      />
      <section className="max-w-5xl mx-auto px-5 lg:px-8 pt-16 md:pt-24 pb-10">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
          <div>
            <div className="label-eyebrow mb-3" style={{ color: "var(--nx-blue)" }}>Tu archivo</div>
            <h1 className="h-display text-4xl md:text-5xl lg:text-[56px] leading-[1.02]">
              Lista de lectura
            </h1>
            <p className="text-base text-[#424245] mt-4 max-w-2xl flex items-center gap-2 flex-wrap">
              {user && user.email ? (
                <>
                  <Cloud size={14} className="text-emerald-700" strokeWidth={2} />
                  <span data-testid="guardados-sync-status">Sincronizado en tu cuenta · {user.name}</span>
                </>
              ) : (
                <>
                  <CloudOff size={14} className="text-[#86868b]" strokeWidth={2} />
                  <span data-testid="guardados-local-status">
                    Guardado solo en este navegador. <Link to="/entrar" className="underline hover:text-black">Inicia sesión</Link> para sincronizar entre dispositivos.
                  </span>
                </>
              )}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-[#86868b] hover:text-[#b91c1c] inline-flex items-center gap-1.5 transition-colors"
              data-testid="guardados-clear-all"
            >
              <Trash2 size={14} /> Vaciar lista
            </button>
          )}
        </div>

        <div className="nx-divider mt-8 mb-10" />

        {loading ? (
          <div className="text-sm text-[#86868b]" data-testid="guardados-loading">Cargando tu lista…</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center" data-testid="guardados-empty">
            <Bookmark size={32} className="mx-auto mb-4 text-[#86868b]" strokeWidth={1.3} />
            <h2 className="h-display text-2xl mb-3">Aún no guardaste ningún artículo</h2>
            <p className="text-[#86868b] mb-7 max-w-md mx-auto">
              Toca el icono de marcador en cualquier artículo para añadirlo a tu lista.
            </p>
            <Link to="/explorar" className="btn-primary" data-testid="guardados-empty-explore">
              Explorar el archivo
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-black/8" data-testid="guardados-list">
            {items.map((a) => (
              <li key={a.slug} className="py-6 flex items-start gap-5 group" data-testid={`guardados-item-${a.slug}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="label-eyebrow">{a.category}</span>
                    {a.fact_level && <FactBadge level={a.fact_level} size="sm" />}
                    <span className="text-xs text-[#86868b]">{formatDate(a.published_at)}</span>
                    {a.read_time && (
                      <span className="text-xs text-[#86868b]">· {a.read_time} min</span>
                    )}
                  </div>
                  <Link
                    to={`/articulo/${a.slug}`}
                    className="block group-hover:opacity-80 transition-opacity"
                    data-testid={`guardados-link-${a.slug}`}
                  >
                    <h3 className="h-display text-2xl md:text-[28px] leading-[1.15] mb-2">
                      {a.title}
                    </h3>
                    <p className="text-[15px] text-[#424245] leading-relaxed line-clamp-2 max-w-2xl">
                      {a.excerpt}
                    </p>
                  </Link>
                </div>
                <button
                  onClick={() => removeOne(a.slug)}
                  className="shrink-0 mt-1 p-2 rounded-full text-[#86868b] hover:text-[#b91c1c] hover:bg-black/5 transition-colors"
                  aria-label="Eliminar de la lista"
                  data-testid={`guardados-remove-${a.slug}`}
                >
                  <Trash2 size={16} strokeWidth={1.6} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
