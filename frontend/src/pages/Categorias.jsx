import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { api } from "@/lib/api";
import SEO from "@/components/SEO";

export default function Categorias() {
  const { slug } = useParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/categories")
      .then(({ data }) => setCategories(data || []))
      .finally(() => setLoading(false));
  }, []);

  // /categoria/:slug → SEO-friendly URL that redirects to filtered Explorar
  if (slug) {
    return <Navigate to={`/explorar?cat=${slug}`} replace />;
  }

  return (
    <main data-testid="categorias-page">
      <SEO
        title="Categorías"
        description="Tecnología, Investigación, Salud y redes, Cultura digital, IA. Explora Noxeal por tema editorial."
        path="/categorias"
        breadcrumbs={[{ name: "Inicio", url: "/" }, { name: "Categorías", url: "/categorias" }]}
      />
      <section className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="label-eyebrow mb-4">Categorías</div>
          <h1 className="h-display text-5xl md:text-7xl mb-6">Todo, ordenado por tema</h1>
          <p className="text-lg text-[#424245] max-w-2xl">
            Tecnología, Investigación, Salud y redes, Cultura digital, IA. Elige el universo que te
            interesa y entra de lleno.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          {loading ? (
            <div className="text-[#86868b] py-12 text-center">Cargando…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/explorar?cat=${c.slug}`}
                  className="group block rounded-3xl border border-black/10 p-10 hover:bg-black hover:text-white transition-colors"
                  data-testid={`category-card-${c.slug}`}
                >
                  <div className="label-eyebrow group-hover:text-white/55 mb-4">{c.count} artículos</div>
                  <h3 className="h-display text-3xl md:text-4xl mb-6">{c.name}</h3>
                  <span className="btn-ghost group-hover:text-white">Explorar →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
