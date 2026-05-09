import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { ArticleCard } from "@/components/ArticleCard";

export default function Buscar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get("/articles", { params: { search: q } })
        .then(({ data }) => setResults(data || []))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    navigate(`/buscar?q=${encodeURIComponent(q)}`);
  };

  return (
    <main data-testid="buscar-page">
      <section className="pt-24 pb-10">
        <div className="max-w-3xl mx-auto px-5 lg:px-8">
          <div className="label-eyebrow mb-4">Búsqueda</div>
          <h1 className="h-display text-5xl md:text-6xl mb-8">¿Qué quieres entender hoy?</h1>
          <form onSubmit={submit} className="relative">
            <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none z-10" />
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por tema, tendencia o palabra clave…"
              className="input-pill text-lg"
              style={{ paddingLeft: "3.5rem", paddingRight: "1.5rem" }}
              data-testid="buscar-input"
              aria-label="Buscar"
            />
          </form>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          {loading && <div className="text-[#86868b] py-10 text-center">Buscando…</div>}
          {!loading && q && results.length === 0 && (
            <div className="text-center py-20" data-testid="buscar-empty">
              <h3 className="h-display text-2xl mb-2">Sin resultados para "{q}"</h3>
              <Link to="/explorar" className="btn-ghost mt-4 inline-flex">Ver todo el archivo</Link>
            </div>
          )}
          {!loading && results.length > 0 && (
            <>
              <p className="text-sm text-[#86868b] mb-10">{results.length} resultado{results.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12" data-testid="buscar-results">
                {results.map((a) => <ArticleCard key={a.slug} article={a} />)}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
