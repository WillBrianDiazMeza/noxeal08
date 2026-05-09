import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Entrar() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = mode === "login"
      ? await login(form.email, form.password)
      : await register(form.name, form.email, form.password);
    setLoading(false);
    if (res.ok) navigate("/");
    else setError(res.error || "Error");
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-5 py-16" data-testid="entrar-page">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="label-eyebrow mb-3">Acceso</div>
          <h1 className="h-display text-4xl md:text-5xl">
            {mode === "login" ? "Entrar a Noxeal" : "Crear cuenta"}
          </h1>
        </div>

        <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
          {mode === "register" && (
            <input
              required
              type="text"
              placeholder="Tu nombre"
              value={form.name}
              onChange={update("name")}
              className="input-pill"
              data-testid="auth-name-input"
            />
          )}
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={update("email")}
            className="input-pill"
            data-testid="auth-email-input"
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder="Contraseña"
            value={form.password}
            onChange={update("password")}
            className="input-pill"
            data-testid="auth-password-input"
          />
          {error && <p className="text-sm text-red-600" data-testid="auth-error">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center" data-testid="auth-submit">
            {loading ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <div className="text-center mt-8 text-sm text-[#86868b]">
          {mode === "login" ? (
            <>¿No tienes cuenta?{" "}
              <button onClick={() => setMode("register")} className="text-black underline" data-testid="switch-to-register">Regístrate</button>
            </>
          ) : (
            <>¿Ya tienes cuenta?{" "}
              <button onClick={() => setMode("login")} className="text-black underline" data-testid="switch-to-login">Entrar</button>
            </>
          )}
        </div>

        <div className="text-center mt-12">
          <Link to="/" className="text-xs uppercase tracking-widest text-[#86868b] hover:text-black">
            Volver a Noxeal
          </Link>
        </div>
      </div>
    </main>
  );
}
