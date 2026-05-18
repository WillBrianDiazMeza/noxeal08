import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Share2, ArrowRight, Sparkles, Clock, ScrollText, GitBranch, Layers } from "lucide-react";
import { api } from "@/lib/api";
import FactBadge from "@/components/FactBadge";

function ActionTile({ icon: Icon, eyebrow, title, description, to, onClick, accent, testid }) {
  const Wrapper = to ? Link : "button";
  const props = to ? { to } : { onClick, type: "button" };
  return (
    <Wrapper
      {...props}
      data-testid={testid}
      className={`nx-post-tile group ${accent ? "nx-post-tile--accent" : ""}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} strokeWidth={1.6} className={accent ? "text-[var(--nx-blue)]" : "text-[#1a1a1a]"} />
        <span className="label-eyebrow" style={accent ? { color: "var(--nx-blue)" } : undefined}>{eyebrow}</span>
      </div>
      <h4 className="h-display text-[20px] leading-[1.2] mb-2">{title}</h4>
      <p className="text-[13.5px] text-[#424245] leading-relaxed mb-3">{description}</p>
      <span className="inline-flex items-center gap-1 text-xs font-medium">
        {to ? "Abrir" : "Hacer ahora"} <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
      </span>
    </Wrapper>
  );
}

export default function PostReadingActions({ article, onSaveToggle, isSaved, onShare }) {
  const [data, setData] = useState({ similar: [], contradiction: null, topic: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/articles/${article.slug}/post-reading`)
      .then(({ data }) => setData(data || {}))
      .catch(() => setData({ similar: [], contradiction: null, topic: null }))
      .finally(() => setLoading(false));
  }, [article.slug]);

  return (
    <section className="nx-post-reading" data-testid="post-reading">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
        <div>
          <div className="label-eyebrow mb-2" style={{ color: "var(--nx-blue)" }}>Has terminado de leer</div>
          <h3 className="h-display text-3xl md:text-[36px] leading-[1.05]">
            ¿Qué quieres hacer ahora?
          </h3>
        </div>
        <p className="text-sm text-[#86868b] max-w-md">
          Periodismo lento: el final de un artículo es el principio de una narrativa.
        </p>
      </div>

      <div className="nx-divider my-7" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ActionTile
          icon={Bookmark}
          eyebrow={isSaved ? "Ya guardado" : "Guardar"}
          title={isSaved ? "Quitar de tu lista" : "Guardar para leer luego"}
          description="Sin tracking. Tu lista vive en este navegador o en tu cuenta si inicias sesión."
          onClick={onSaveToggle}
          testid="post-reading-save"
        />

        {data.topic && (
          <ActionTile
            icon={Layers}
            eyebrow="Seguir narrativa"
            title={`Tema: ${data.topic.name}`}
            description="Ve el contexto, el timeline editorial y todos los artículos publicados en torno a esta historia."
            to={`/temas/${data.topic.slug}`}
            accent
            testid="post-reading-follow-narrative"
          />
        )}

        {data.contradiction && (
          <ActionTile
            icon={GitBranch}
            eyebrow="Leer contradicción"
            title={data.contradiction.title}
            description={`Una pieza con fact level distinto (${data.contradiction.fact_level}) sobre el mismo tema. Lee las dos versiones antes de decidir.`}
            to={`/articulo/${data.contradiction.slug}`}
            accent
            testid="post-reading-contradiction"
          />
        )}

        <ActionTile
          icon={ScrollText}
          eyebrow="Tu archivo"
          title="Ver tu lista de lectura"
          description="Todo lo que guardaste, ordenado por fecha. Notas y subrayados incluidos."
          to="/guardados"
          testid="post-reading-saved"
        />

        <ActionTile
          icon={Share2}
          eyebrow="Compartir"
          title="Pásaselo a alguien que piensa diferente"
          description="Las conversaciones serias empiezan compartiendo contexto, no titulares."
          onClick={onShare}
          testid="post-reading-share"
        />
      </div>

      {/* Similar narratives */}
      {!loading && data.similar && data.similar.length > 0 && (
        <div className="mt-12" data-testid="post-reading-similar">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-[#86868b]" />
            <span className="label-eyebrow">Narrativas similares</span>
          </div>
          <ul className="divide-y divide-black/8">
            {data.similar.map((s) => (
              <li key={s.slug} className="py-4">
                <Link to={`/articulo/${s.slug}`} className="block group" data-testid={`post-similar-${s.slug}`}>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="label-eyebrow">{s.category}</span>
                    {s.fact_level && <FactBadge level={s.fact_level} size="sm" />}
                    {s.read_time && <span className="text-xs text-[#86868b]"><Clock size={11} className="inline -mt-0.5 mr-1" />{s.read_time} min</span>}
                  </div>
                  <h5 className="h-display text-[19px] leading-[1.25] group-hover:text-[var(--nx-blue)] transition-colors">
                    {s.title}
                  </h5>
                  <p className="text-[14px] text-[#424245] mt-1 line-clamp-2 max-w-3xl">{s.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
