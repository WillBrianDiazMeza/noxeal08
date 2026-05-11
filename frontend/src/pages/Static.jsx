import SEO from "@/components/SEO";

export default function Static({ title, body, path = "" }) {
  return (
    <main className="pt-24 pb-32" data-testid="static-page">
      <SEO title={title} path={path} description={typeof body[0] === "string" ? body[0].slice(0, 160) : undefined} />
      <div className="max-w-3xl mx-auto px-5 lg:px-8">
        <div className="label-eyebrow mb-4">Noxeal</div>
        <h1 className="h-display text-5xl md:text-6xl mb-10">{title}</h1>
        <div className="prose-noxeal">
          {body.map((p, i) =>
            typeof p === "string" ? <p key={i}>{p}</p> : <div key={i}>{p}</div>
          )}
        </div>
      </div>
    </main>
  );
}
