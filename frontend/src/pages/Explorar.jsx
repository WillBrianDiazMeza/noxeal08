import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { ArticleCard } from "@/components/ArticleCard";

export default function Explorar() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/articles"),
      api.get("/categories"),
    ]).then(([a, c]) => {
      setArticles(a.data || []);
      setCategories(c.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = articles;
    if (activeCat !== "all") list = list.filter((a) => a.category_slug === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        (a.title || "").toLowerCase().includes(q) ||
        (a.excerpt || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [articles, activeCat, search]);

  return (
    <main data-testid="explorar-page">
      <section className="pt-20 md:pt-28 pb-12">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="label-eyebrow mb-4">Explorar</div>
          <h1 className="h-display text-5xl md:text-6xl lg:text-7xl mb-8">
            Todo el archivo de Noxeal
          </h1>
          <p className="text-lg text-[#424245] max-w-2xl mb-10">
            Filtra por categoría o busca por palabra clave para encontrar exactamente lo que necesitas leer.
          </p>

          <div className="relative max-w-2xl">
            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#86868b]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por tema, tendencia o palabra clave…"
              className="input-pill pl-14"
              data-testid="explorar-search-input"
              aria-label="Buscar"
            />
          </div>

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
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          {loading ? (
            <div className="text-center text-[#86868b] py-16">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-black/10 rounded-3xl" data-testid="explorar-empty">
              <h3 className="h-display text-2xl mb-2">Sin resultados</h3>
              <p className="text-[#86868b]">Intenta con otra palabra o cambia de categoría.</p>
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
