import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Layers } from "lucide-react";
import { api } from "@/lib/api";
import SEO from "@/components/SEO";
import FactBadge from "@/components/FactBadge";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

/* ------- Topic index: /temas ------- */
export function TemasIndex() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/topics").then(({ data }) => setTopics(data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-[70vh]" data-testid="temas-index">
      <SEO
        title="Temas en profundidad"
        description="Páginas pilar de Noxeal: agrupamos artículos, contexto, preguntas frecuentes y enlaces internos sobre los temas que más buscas — Epstein, IA, deepfakes, CBDC, salud mental y redes."
        path="/temas"
        breadcrumbs={[{ name: "Inicio", url: "/" }, { name: "Temas", url: "/temas" }]}
      />
      <section className="max-w-6xl mx-auto px-5 lg:px-8 pt-16 md:pt-24 pb-12">
        <div className="label-eyebrow mb-3" style={{ color: "var(--nx-blue)" }}>Páginas pilar</div>
        <h1 className="h-display text-4xl md:text-5xl lg:text-[56px] leading-[1.02] mb-5">
          Temas en profundidad
        </h1>
        <p className="text-[17px] text-[#424245] max-w-2xl">
          Cada tema reúne lo verificado, las teorías virales, el contexto necesario y las preguntas más buscadas.
          Periodismo lento, sin clickbait.
        </p>
      </section>
      <section className="max-w-6xl mx-auto px-5 lg:px-8 pb-24">
        {loading ? (
          <p className="text-[#86868b]">Cargando…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {topics.map((t) => (
              <Link
                key={t.slug}
                to={`/temas/${t.slug}`}
                className="block border border-black/10 rounded-3xl p-7 bg-white hover:border-[var(--nx-blue)] transition-colors group"
                data-testid={`tema-card-${t.slug}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={14} className="text-[var(--nx-blue)]" />
                  <span className="label-eyebrow" style={{ color: "var(--nx-blue)" }}>Tema</span>
                  <span className="text-xs text-[#86868b]">· {t.article_count} artículo{t.article_count !== 1 ? "s" : ""}</span>
                </div>
                <h2 className="h-display text-3xl mb-3 group-hover:text-[var(--nx-blue)] transition-colors">{t.name}</h2>
                <p className="text-[15px] text-[#424245] leading-relaxed mb-4 line-clamp-3">{t.description}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  Explorar tema <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/* ------- Topic detail: /temas/:slug ------- */
export default function TemaDetalle() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/topics/${slug}`)
      .then(({ data }) => setData(data))
      .catch(() => setError("Tema no encontrado"))
      .finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) return <div className="max-w-3xl mx-auto px-5 py-32 text-[#86868b]" data-testid="tema-loading">Cargando…</div>;
  if (error || !data) return (
    <div className="max-w-3xl mx-auto px-5 py-32 text-center" data-testid="tema-not-found">
      <h1 className="h-display text-4xl mb-4">Tema no encontrado</h1>
      <Link to="/temas" className="btn-secondary">Volver a temas</Link>
    </div>
  );

  const articles = data.articles || [];
  const faqs = [
    { q: `¿Qué hay de cierto en ${data.name}?`,
      a: `Noxeal separa lo verificado por fuentes primarias de lo que circula como rumor en redes. Cada artículo lleva un Fact Level (confirmado, investigación, análisis, opinión, rumor) y un nivel de verificación 0–100.` },
    { q: `¿Por qué este tema importa ahora?`,
      a: `Porque es uno de los temas donde más diverge la narrativa viral de la realidad documentada. Aquí encuentras los dos lados y las evidencias.` },
    { q: `¿Cómo elige Noxeal qué publicar sobre ${data.name}?`,
      a: `Combinamos detección automática de tendencias (Make.com + Google Trends), redacción editorial con IA supervisada y revisión humana antes de publicar. Nunca publicamos rumores como si fueran hechos.` },
  ];

  return (
    <main className="min-h-[70vh]" data-testid="tema-page">
      <SEO
        title={`${data.name} — Tema en profundidad`}
        description={data.description}
        path={`/temas/${data.slug}`}
        breadcrumbs={[
          { name: "Inicio", url: "/" },
          { name: "Temas", url: "/temas" },
          { name: data.name, url: `/temas/${data.slug}` },
        ]}
      />
      {/* JSON-LD: CollectionPage + FAQPage */}
      <CollectionAndFAQLd topic={data} faqs={faqs} />

      <section className="max-w-5xl mx-auto px-5 lg:px-8 pt-16 md:pt-24 pb-12">
        <div className="text-sm text-[#86868b] mb-4">
          <Link to="/" className="hover:text-black">Inicio</Link> <span className="mx-2">·</span>
          <Link to="/temas" className="hover:text-black">Temas</Link> <span className="mx-2">·</span>
          <span className="text-black">{data.name}</span>
        </div>
        <div className="label-eyebrow mb-3" style={{ color: "var(--nx-blue)" }}>Tema · {articles.length} artículo{articles.length !== 1 ? "s" : ""}</div>
        <h1 className="h-display text-4xl md:text-5xl lg:text-[64px] leading-[1.02] mb-6">{data.name}</h1>
        <p className="text-xl text-[#1a1a1a] leading-relaxed max-w-3xl">{data.description}</p>
      </section>

      <div className="nx-divider max-w-5xl mx-auto" />

      {/* Articles list */}
      <section className="max-w-5xl mx-auto px-5 lg:px-8 py-14">
        <h2 className="h-display text-3xl mb-8">Artículos sobre {data.name}</h2>
        {articles.length === 0 ? (
          <p className="text-[#86868b]">Aún no hay artículos publicados en este tema. Vuelve pronto.</p>
        ) : (
          <ul className="divide-y divide-black/10" data-testid="tema-articles">
            {articles.map((a) => (
              <li key={a.slug} className="py-7 group" data-testid={`tema-article-${a.slug}`}>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="label-eyebrow">{a.category}</span>
                  {a.fact_level && <FactBadge level={a.fact_level} size="sm" />}
                  <span className="text-xs text-[#86868b]">{formatDate(a.published_at)}</span>
                  {a.read_time && <span className="text-xs text-[#86868b]">· {a.read_time} min</span>}
                </div>
                <Link to={`/articulo/${a.slug}`} className="block group-hover:opacity-80 transition-opacity">
                  <h3 className="h-display text-2xl md:text-[28px] leading-[1.15] mb-2">{a.title}</h3>
                  <p className="text-[15px] text-[#424245] leading-relaxed line-clamp-2 max-w-3xl">{a.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="nx-divider max-w-5xl mx-auto" />

      {/* FAQ block */}
      <section className="max-w-5xl mx-auto px-5 lg:px-8 py-14" data-testid="tema-faq">
        <div className="label-eyebrow mb-3" style={{ color: "var(--nx-blue)" }}>Preguntas frecuentes</div>
        <h2 className="h-display text-3xl mb-8">Lo que la gente busca sobre {data.name}</h2>
        <div className="space-y-5">
          {faqs.map((f, i) => (
            <details key={i} className="group border-b border-black/10 pb-5" data-testid={`tema-faq-${i}`}>
              <summary className="cursor-pointer list-none flex justify-between items-start gap-4">
                <span className="font-semibold text-[17px] leading-snug">{f.q}</span>
                <span className="text-[#86868b] mt-1 group-open:rotate-45 transition-transform select-none">+</span>
              </summary>
              <p className="text-[15px] text-[#424245] leading-relaxed mt-3 max-w-3xl">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Related topics */}
      <section className="bg-[#f5f5f7] py-16 mt-8">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <div className="label-eyebrow mb-4">Temas conectados</div>
          <Link to="/temas" className="btn-secondary inline-flex items-center gap-2">
            Ver todos los temas <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function CollectionAndFAQLd({ topic, faqs }) {
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${topic.name} — Tema en profundidad`,
    description: topic.description,
    url: `https://noxeal.com/temas/${topic.slug}`,
    inLanguage: "es",
    isPartOf: { "@type": "WebSite", name: "Noxeal", url: "https://noxeal.com" },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: (topic.articles || []).slice(0, 20).map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://noxeal.com/articulo/${a.slug}`,
        name: a.title,
      })),
    },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(collection)}</script>
      <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
    </Helmet>
  );
}
