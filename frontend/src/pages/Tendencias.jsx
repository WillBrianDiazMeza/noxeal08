import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import ViralCard from "@/components/ViralCard";
import { ArticleCard } from "@/components/ArticleCard";
import SEO from "@/components/SEO";

export default function Tendencias() {
  const { slug } = useParams();
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // If /tendencias/:slug → filter by tag; otherwise show global trending
    const params = slug ? { tag: slug } : { trending: true };
    api.get("/articles", { params })
      .then(({ data }) => setTrending(data || []))
      .finally(() => setLoading(false));
  }, [slug]);

  const tagTitle = slug ? slug.replace(/-/g, " ") : null;

  return (
    <main data-testid="tendencias-page">
      <SEO
        title={slug ? `Tendencia: ${tagTitle}` : "Tendencias"}
        description={slug
          ? `Todos los artículos de Noxeal sobre ${tagTitle}. Análisis editorial sobre lo que está viralizando alrededor de este tema.`
          : "Lo viral, decodificado. Tecnología, rumores, cultura digital, política, IA — explicado con contexto."}
        path={slug ? `/tendencias/${slug}` : "/tendencias"}
        breadcrumbs={[
          { name: "Inicio", url: "/" },
          { name: "Tendencias", url: "/tendencias" },
          ...(slug ? [{ name: tagTitle, url: `/tendencias/${slug}` }] : []),
        ]}
      />
      <section className="bg-[#0d0d0f] text-white pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="label-eyebrow-dark mb-4">{slug ? `Tendencia · #${tagTitle}` : "Tendencias"}</div>
          <h1 className="h-display text-5xl md:text-7xl mb-6 max-w-4xl">
            {slug ? `${tagTitle}, decodificado.` : "Lo viral, decodificado."}
          </h1>
          <p className="text-lg text-white/65 max-w-2xl">
            {slug
              ? `Artículos de Noxeal sobre ${tagTitle}. Periodismo lento, sin clickbait.`
              : "Tecnología, rumores, cultura digital, política, IA. Lo que está moviendo conversaciones esta semana — explicado con contexto."}
          </p>
        </div>
      </section>

      <section className="bg-[#0d0d0f] pb-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          {loading ? (
            <div className="text-white/50 py-16 text-center">Cargando tendencias…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trending.map((a) => (
                <ViralCard key={a.slug} topic={a.title} image={a.image} slug={a.slug} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="label-eyebrow mb-3">También en tendencia</div>
          <h2 className="h-display text-3xl md:text-4xl mb-12">Análisis recientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {trending.slice(0, 6).map((a) => <ArticleCard key={a.slug} article={a} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
