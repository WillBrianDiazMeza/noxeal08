import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function ViralCard({ topic, slug }) {
  return (
    <Link
      to={slug ? `/articulo/${slug}` : "/tendencias"}
      className="viral-card group"
      data-testid={`viral-card-${(slug || topic).toString().toLowerCase().replace(/\s+/g, "-")}`}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      <div>
        <div className="label-eyebrow-dark mb-4">Tema viral</div>
        <h3 className="h-display text-2xl md:text-[26px] text-white leading-tight">{topic}</h3>
      </div>
      <div className="flex items-center justify-between mt-6">
        <span className="text-xs text-white/55">Explorar</span>
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/8 border border-white/15 group-hover:bg-white group-hover:text-black transition-colors">
          <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
