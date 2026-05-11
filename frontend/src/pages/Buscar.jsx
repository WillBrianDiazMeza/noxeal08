import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon, X, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import SEO from "@/components/SEO";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

function Highlight({ text, query }) {
  if (!text || !query || query.length < 2) return <>{text}</>;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${safe})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-100 text-black px-0.5">{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

export default function Buscar() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") || "";
  const [input, setInput] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults([]); setTotal(0); return;
    }
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/search", { params: { q, limit: 30 } });
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError("No se pudo realizar la búsqueda. Intenta de nuevo.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { runSearch(initial); }, [initial, runSearch]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (e) => {
    e.preventDefault();
    const q = input.trim();
    setQuery(q);
    setParams(q ? { q } : {});
    runSearch(q);
  };

  const clear = () => {
    setInput(""); setQuery(""); setResults([]); setTotal(0); setParams({});
    inputRef.current?.focus();
  };

  return (
    <main className="pt-24 pb-32 min-h-[70vh]" data-testid="search-page">
      <SEO
        title={query ? `Buscar: ${query}` : "Buscar en Noxeal"}
        description={query ? `Resultados de búsqueda para "${query}" en Noxeal.` : "Busca artículos, análisis y tendencias en Noxeal."}
        path={`/buscar${query ? `?q=${encodeURIComponent(query)}` : ""}`}
      />

      <div className="max-w-4xl mx-auto px-5 lg:px-8">
        <div className="label-eyebrow mb-4">Archivo</div>
        <h1 className="h-display text-5xl md:text-6xl mb-10">Buscar</h1>

        <form onSubmit={submit} className="relative mb-10" data-testid="search-form">
          <SearchIcon size={20} strokeWidth={1.5} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tema, palabra clave, autor…"
            className="w-full pl-14 pr-14 py-5 rounded-full bg-[#f5f5f7] border border-transparent focus:bg-white focus:border-black/20 outline-none text-lg"
            data-testid="search-input"
            autoFocus
          />
          {input && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-black"
              aria-label="Limpiar"
              data-testid="search-clear"
            >
              <X size={20} />
            </button>
          )}
        </form>

        {loading && (
          <p className="text-sm text-[#86868b]" data-testid="search-loading">Buscando…</p>
        )}
        {!loading && error && (
          <p className="text-sm text-red-600" data-testid="search-error">{error}</p>
        )}
        {!loading && !error && query && total === 0 && (
          <div className="py-12 text-center" data-testid="search-empty">
            <p className="text-lg text-[#1a1a1a] mb-2">Sin resultados para "<strong>{query}</strong>"</p>
            <p className="text-sm text-[#86868b]">Prueba con términos más generales o explora <Link to="/categorias" className="underline">categorías</Link>.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="text-sm text-[#86868b] mb-10" data-testid="search-summary">
              {total.toLocaleString("es-ES")} resultado{total !== 1 ? "s" : ""} para "<strong>{query}</strong>"
            </p>
            <ul className="space-y-10" data-testid="search-results">
              {results.map((a) => (
                <li key={a.slug} className="border-t border-black/10 pt-7 group" data-testid={`search-result-${a.slug}`}>
                  <Link to={`/articulo/${a.slug}`} className="block">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="label-eyebrow">{a.category}</span>
                      <span className="text-xs text-[#86868b]">· {formatDate(a.published_at)}</span>
                    </div>
                    <h2 className="h-display text-2xl md:text-3xl mb-3 leading-tight group-hover:opacity-80 transition-opacity">
                      <Highlight text={a.title} query={query} />
                    </h2>
                    {a.excerpt && (
                      <p className="text-[15px] text-[#424245] leading-relaxed mb-3 line-clamp-2">
                        <Highlight text={a.excerpt} query={query} />
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm text-black font-medium">
                      Leer <ArrowUpRight size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {!query && (
          <div className="py-10" data-testid="search-help">
            <p className="text-[#86868b]">Empieza a escribir un término. Puedes buscar por título, palabra clave, categoría o etiqueta.</p>
          </div>
        )}
      </div>
    </main>
  );
}
