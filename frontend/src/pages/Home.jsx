import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import SEO from "@/components/SEO";
import { ArticleCard, HeroEditorialCard } from "@/components/ArticleCard";
import ViralCard from "@/components/ViralCard";
import NewsletterSection from "@/components/NewsletterSection";

export default function Home() {
  const [data, setData] = useState({ hero: null, side: [], viral: [], latest: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/articles/featured")
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main data-testid="home-page">
      <SEO path="/" />

      {/* ========== HERO ========== */}
      <section className="pt-20 md:pt-28 pb-24 md:pb-32" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="label-eyebrow nx-fade-up">N°01 · Edición continua</div>
          <h1 className="h-display text-[44px] sm:text-6xl md:text-7xl lg:text-[96px] mt-6 max-w-5xl nx-fade-up nx-delay-100">
            Descubre la <em className="font-serif italic">verdad</em> antes de que el algoritmo la distorsione.
          </h1>
          <p className="text-lg md:text-xl text-[#424245] leading-relaxed max-w-2xl mt-8 nx-fade-up nx-delay-200">
            Noxeal transforma tendencias, historias virales y temas complejos en contenido claro,
            verificable e inteligente.
          </p>
          <div className="flex flex-wrap gap-3 mt-10 nx-fade-up nx-delay-300">
            <Link to="/explorar" className="btn-primary" data-testid="hero-cta-explorar">
              Explorar artículos <ArrowUpRight size={16} />
            </Link>
            <Link to="/tendencias" className="btn-secondary" data-testid="hero-cta-tendencias">
              Ver tendencias
            </Link>
          </div>
        </div>
      </section>

      <div className="nx-divider max-w-7xl mx-auto" />

      {/* ========== MANIFESTO STRIP ========== */}
      <section className="py-14 border-b border-black/5" data-testid="manifesto-strip">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
          {[
            { n: "01", t: "Verificable", d: "Cada afirmación lleva fuente, fecha y enlace. Si no se puede comprobar, no se publica." },
            { n: "02", t: "Sin ruido", d: "Una historia bien contada vale más que diez titulares de impacto." },
            { n: "03", t: "Contexto primero", d: "Antes del veredicto, el mapa. De dónde viene, qué cambia y por qué importa." },
          ].map((it) => (
            <div key={it.n}>
              <div className="label-eyebrow mb-3">{it.n} · Principio</div>
              <h3 className="h-display text-2xl mb-2">{it.t}</h3>
              <p className="text-[15px] text-[#424245] leading-relaxed">{it.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== EDITORIAL COVER ========== */}
      <section className="py-20 md:py-28" data-testid="editorial-cover-section">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="label-eyebrow mb-3">Portada editorial</div>
              <h2 className="h-display text-3xl md:text-4xl">La historia que estamos siguiendo</h2>
            </div>
            <Link to="/explorar" className="btn-ghost hidden md:inline-flex" data-testid="cover-see-all">
              Ver todo
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            <div className="lg:col-span-7">
              {loading ? (
                <SkeletonHero />
              ) : (
                <HeroEditorialCard article={data.hero} />
              )}
            </div>
            <div className="lg:col-span-5 flex flex-col gap-10">
              {(data.side || []).slice(0, 3).map((a, i) => (
                <ArticleCard key={a.slug} article={a} size={i === 0 ? "default" : "small"} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== VIRAL TOPICS (DARK) ========== */}
      <section className="py-20 bg-[#0d0d0f]" data-testid="viral-section">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <div className="label-eyebrow-dark mb-3">Temas virales</div>
              <h2 className="h-display text-3xl md:text-5xl text-white">Lo que circula esta semana</h2>
            </div>
            <Link to="/tendencias" className="text-white/70 hover:text-white text-sm uppercase tracking-widest" data-testid="viral-see-all">
              Ver todas las tendencias →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(data.viral || []).map((a) => (
              <ViralCard key={a.slug} topic={a.title} image={a.image} slug={a.slug} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== LATEST ARTICLES ========== */}
      <section className="py-24" data-testid="latest-section">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="label-eyebrow mb-3">Últimos artículos</div>
              <h2 className="h-display text-3xl md:text-4xl">Recién publicado</h2>
            </div>
            <Link to="/explorar" className="btn-ghost hidden md:inline-flex" data-testid="latest-see-all">
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {(data.latest || []).map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </div>
      </section>

      <NewsletterSection />
    </main>
  );
}

function SkeletonHero() {
  return (
    <div className="animate-pulse">
      <div className="card-image-wrap aspect-[16/11] mb-7 bg-[#eaeaee]" />
      <div className="h-3 w-32 bg-[#eaeaee] mb-4 rounded" />
      <div className="h-10 w-3/4 bg-[#eaeaee] mb-3 rounded" />
      <div className="h-10 w-1/2 bg-[#eaeaee] mb-6 rounded" />
      <div className="h-4 w-full bg-[#eaeaee] mb-2 rounded" />
      <div className="h-4 w-5/6 bg-[#eaeaee] rounded" />
    </div>
  );
}
