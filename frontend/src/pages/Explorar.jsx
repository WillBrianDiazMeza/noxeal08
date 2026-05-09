import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { ArticleCard } from "@/components/ArticleCard";
import SEO from "@/components/SEO";

export default function Explorar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [activeCat, setActiveCat] = useState(searchParams.get("cat") || "all");
  const [activeTag, setActiveTag] = useState(searchParams.get("tag") || "");
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/articles"),
      api.get("/categories"),
      api.get("/tags"),
    ]).then(([a, c, t]) => {
      setArticles(a.data || []);
      setCategories(c.data || []);
      setTags(t.data || []);
    }).finally(() => setLoading(false));
  }, []);

  // Sync URL when filters change
  useEffect(() => {
    const next = {};
    if (activeCat !== "all") next.cat = activeCat;
    if (activeTag) next.tag = activeTag;
    if (search.trim()) next.q = search.trim();
    setSearchParams(next, { replace: true });
  }, [activeCat, activeTag, search, setSearchParams]);

  const filtered = useMemo(() => {
    let list = articles;
    if (activeCat !== "all") list = list.filter((a) => a.category_slug === activeCat);
    if (activeTag) list = list.filter((a) => (a.tags || []).includes(activeTag));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        (a.title || "").toLowerCase().includes(q) ||
        (a.excerpt || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [articles, activeCat, activeTag, search]);

  const clearFilters = () => { setActiveCat("all"); setActiveTag(""); setSearch(""); };
  const hasFilters = activeCat !== "all" || activeTag || search.trim();

  return (
    <main data-testid="explorar-page">
      <SEO title="Explorar el archivo" description="Todos los artículos de Noxeal: filtra por categoría, tag o palabra clave." path="/explorar" />

      <section className="pt-20 md:pt-28 pb-12">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="label-eyebrow mb-4">Explorar</div>
          <h1 className="h-display text-5xl md:text-6xl lg:text-7xl mb-8">
            Todo el archivo de Noxeal
          </h1>
          <p className="text-lg text-[#424245] max-w-2xl mb-10">
            Filtra por categoría, tag o busca por palabra clave para encontrar exactamente lo que necesitas leer.
          </p>

          <div className="relative max-w-2xl">
            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none z-10" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por tema, tendencia o palabra clave…"
              className="input-pill"
              style={{ paddingLeft: "3.5rem", paddingRight: "1.5rem" }}
              data-testid="explorar-search-input"
              aria-label="Buscar"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mt-8" data-testid="explorar-categories">
            <button
              onClick={() => setActiveCat("all")}
              className={`px-4 py-2 rounded-full text-sm border transition ${activeCat === "all" ? "bg-black text-white border-black" : "border-black/10 hover:bg-black/5"}`}
              data-testid="cat-filter-all"
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActiveCat(c.slug)}
                className={`px-4 py-2 rounded-full text-sm border transition ${activeCat === c.slug ? "bg-black text-white border-black" : "border-black/10 hover:bg-black/5"}`}
                data-testid={`cat-filter-${c.slug}`}
              >
                {c.name} <span className="opacity-60">({c.count})</span>
              </button>
            ))}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-6" data-testid="explorar-tags">
              <div className="label-eyebrow mb-3">Tags populares</div>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 14).map((t) => (
                  <button
                    key={t.slug}
                    onClick={() => setActiveTag(activeTag === t.slug ? "" : t.slug)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${activeTag === t.slug ? "bg-black text-white border-black" : "border-black/10 hover:bg-black/5 text-[#424245]"}`}
                    data-testid={`tag-filter-${t.slug}`}
                  >
                    #{t.slug} <span className="opacity-60">({t.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active filters bar */}
          {hasFilters && (
            <div className="mt-6 flex items-center gap-3 text-sm text-[#86868b] flex-wrap" data-testid="active-filters">
              <span>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
              <button onClick={clearFilters} className="inline-flex items-center gap-1 underline hover:text-black" data-testid="clear-filters">
                <X size={12} /> Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          {loading ? (
            <div className="text-center text-[#86868b] py-16">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-black/10 rounded-3xl" data-testid="explorar-empty">
              <h3 className="h-display text-2xl mb-2">Sin resultados</h3>
              <p className="text-[#86868b] mb-6">Intenta con otra palabra o cambia de filtro.</p>
              <button onClick={clearFilters} className="btn-secondary">Limpiar filtros</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12" data-testid="explorar-grid">
              {filtered.map((a) => <ArticleCard key={a.slug} article={a} />)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
