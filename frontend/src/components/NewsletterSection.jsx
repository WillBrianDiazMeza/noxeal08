import { useState } from "react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

export default function NewsletterSection({ compact = false }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ kind: "idle", msg: "" });

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus({ kind: "loading", msg: "" });
    try {
      const { data } = await api.post("/newsletter/subscribe", { email });
      const msg = data.already_subscribed ? "Ya estabas suscrito. ¡Gracias!" : "¡Suscripción confirmada!";
      setStatus({ kind: "success", msg });
      toast.success(msg);
      setEmail("");
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      setStatus({ kind: "error", msg });
      toast.error(msg);
    }
  };

  return (
    <section
      className={compact ? "py-16" : "py-28"}
      data-testid="newsletter-section"
    >
      <div className="max-w-3xl mx-auto px-5 lg:px-8 text-center">
        <div className="label-eyebrow mb-5">Newsletter Noxeal</div>
        <h2 className="h-display text-3xl md:text-5xl mb-5">Recibe actualizaciones</h2>
        <p className="text-[17px] text-[#424245] leading-relaxed mb-10 max-w-xl mx-auto">
          Suscríbete para recibir nuevos artículos, tendencias y análisis directamente en tu correo.
          Sin ruido, sin spam.
        </p>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto" data-testid="newsletter-form">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="input-pill flex-1"
            data-testid="newsletter-email-input"
            aria-label="Email"
          />
          <button
            type="submit"
            className="btn-primary justify-center"
            disabled={status.kind === "loading"}
            data-testid="newsletter-submit"
          >
            {status.kind === "loading" ? "Enviando..." : "Suscribirse"}
          </button>
        </form>
        {status.msg && (
          <p
            className={`mt-5 text-sm ${status.kind === "success" ? "text-emerald-700" : status.kind === "error" ? "text-red-600" : "text-[#86868b]"}`}
            data-testid={status.kind === "success" ? "newsletter-success" : status.kind === "error" ? "newsletter-error" : "newsletter-status"}
          >
            {status.msg}
          </p>
        )}
      </div>
    </section>
  );
}
