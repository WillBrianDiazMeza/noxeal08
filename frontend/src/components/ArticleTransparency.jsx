import { CheckCircle2, HelpCircle, Eye, Library } from "lucide-react";
import { Helmet } from "react-helmet-async";

/* ─────── "Qué se sabe" — confirmed facts (green-ish) ─────── */
export function WhatIsKnownBlock({ items }) {
  if (!items || !items.length) return null;
  return (
    <aside className="nx-transparency-block nx-known" data-testid="article-what-is-known">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 size={16} className="text-emerald-700" strokeWidth={2} />
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-900">
          Qué se sabe
        </h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-[#1a3b1f]">
            <span className="text-emerald-700 mt-1 select-none flex-shrink-0">✓</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/* ─────── "Qué falta por verificar" — gaps (amber) ─────── */
export function WhatIsMissingBlock({ items }) {
  if (!items || !items.length) return null;
  return (
    <aside className="nx-transparency-block nx-missing" data-testid="article-what-is-missing">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle size={16} className="text-amber-700" strokeWidth={2} />
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-900">
          Qué falta por verificar
        </h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-[#5a3e0f]">
            <span className="text-amber-700 mt-1 select-none flex-shrink-0">?</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/* ─────── "Realidad vs Viralidad" — 2-column comparison ─────── */
export function RealityVsViralityBlock({ items }) {
  if (!items || !items.length) return null;
  return (
    <section className="nx-rvv-block" data-testid="article-reality-vs-virality">
      <div className="flex items-center gap-2 mb-5">
        <Eye size={16} className="text-[var(--nx-blue)]" strokeWidth={2} />
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--nx-blue)" }}>
          Realidad vs Viralidad
        </h3>
      </div>
      <p className="text-sm text-[#86868b] mb-6 max-w-2xl">
        Lo que circula en redes vs lo que dicen las fuentes verificadas. Donde la narrativa diverge de la evidencia.
      </p>
      <div className="nx-rvv-grid">
        <div className="nx-rvv-header nx-rvv-virality">
          <span className="label-eyebrow text-rose-800">Lo que se dice / viraliza</span>
        </div>
        <div className="nx-rvv-header nx-rvv-reality">
          <span className="label-eyebrow" style={{ color: "var(--nx-blue)" }}>Lo que está documentado</span>
        </div>
        {items.map((row, i) => (
          <div key={i} className="contents" data-testid={`rvv-row-${i}`}>
            <div className="nx-rvv-cell nx-rvv-virality-cell">{row.virality}</div>
            <div className="nx-rvv-cell nx-rvv-reality-cell">{row.reality}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────── FAQ accordion + FAQPage JSON-LD ─────── */
export function ArticleFAQ({ faqs, articleTitle }) {
  if (!faqs || !faqs.length) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section className="nx-faq-block" data-testid="article-faq">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <div className="flex items-center gap-2 mb-3">
        <Library size={16} className="text-black" strokeWidth={2} />
        <span className="label-eyebrow">Preguntas frecuentes</span>
      </div>
      <h3 className="h-display text-3xl mb-6">Lo que más se busca sobre {articleTitle ? articleTitle.split(" ").slice(0,4).join(" ") + "…" : "este tema"}</h3>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <details key={i} className="nx-faq-item group" data-testid={`article-faq-${i}`}>
            <summary className="cursor-pointer list-none flex justify-between items-start gap-4 py-3">
              <span className="font-semibold text-[17px] leading-snug">{f.q}</span>
              <span className="text-[#86868b] mt-1 group-open:rotate-45 transition-transform select-none text-xl leading-none">+</span>
            </summary>
            <p className="text-[15px] text-[#424245] leading-relaxed pb-4 max-w-3xl">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
