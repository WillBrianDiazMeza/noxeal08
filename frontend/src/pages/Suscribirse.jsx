import NewsletterSection from "@/components/NewsletterSection";

export default function Suscribirse() {
  return (
    <main data-testid="suscribirse-page">
      <section className="pt-20 pb-6">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 text-center">
          <div className="label-eyebrow mb-4">Suscríbete</div>
          <h1 className="h-display text-5xl md:text-7xl mb-6">El próximo capítulo de lo viral, en tu correo.</h1>
          <p className="text-lg text-[#424245] max-w-xl mx-auto">
            Cada semana, una selección curada con los análisis más leídos, las tendencias que importan
            y un editorial corto que conecta los puntos.
          </p>
        </div>
      </section>
      <NewsletterSection compact />

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {[
            { t: "Sin spam", d: "Solo lo que vale la pena leer. Cero ruido." },
            { t: "Una vez por semana", d: "Llega los domingos a primera hora." },
            { t: "Cancela cuando quieras", d: "Un click y listo. Tu correo es tuyo." },
          ].map((it) => (
            <div key={it.t}>
              <div className="h-display text-2xl mb-2">{it.t}</div>
              <p className="text-sm text-[#424245]">{it.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
