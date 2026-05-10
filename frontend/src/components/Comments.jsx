import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Trash2, MessageSquare } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function timeAgo(iso) {
  if (!iso) return "";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((now - then) / 1000));
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24); if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default function Comments({ slug }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/articles/${slug}/comments`);
      setComments(data || []);
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setError(""); setSubmitting(true);
    try {
      await api.post(`/articles/${slug}/comments`, { body });
      setBody(""); await load();
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setSubmitting(false); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/comments/${id}`);
      await load();
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <section className="max-w-2xl mx-auto px-5 lg:px-0 mt-16" data-testid="comments-section">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare size={20} strokeWidth={1.5} />
        <h3 className="h-display text-2xl md:text-3xl">Comentarios <span className="text-[#86868b] font-sans text-base font-normal ml-2">{comments.length}</span></h3>
      </div>

      {/* Form */}
      {user && user.email ? (
        <form onSubmit={submit} className="mb-12" data-testid="comment-form">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Comparte tu lectura, contraste o pregunta…"
                rows={3}
                className="w-full px-5 py-4 rounded-2xl bg-[#f5f5f7] border border-transparent focus:bg-white focus:border-black/15 outline-none resize-none text-[15px]"
                data-testid="comment-textarea"
              />
              {error && <p className="text-xs text-red-600 mt-2" data-testid="comment-error">{error}</p>}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-[#86868b]">Como {user.name || user.email}</span>
                <button type="submit" disabled={submitting || !body.trim()} className="btn-primary" data-testid="comment-submit">
                  {submitting ? "Publicando…" : "Publicar"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-12 p-6 rounded-2xl bg-[#f5f5f7] text-center" data-testid="comment-login-cta">
          <p className="text-[15px] text-[#424245] mb-3">Inicia sesión para participar en la conversación.</p>
          <Link to="/entrar" className="btn-secondary">Entrar a Noxeal</Link>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-[#86868b]">Cargando comentarios…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#86868b] italic" data-testid="comments-empty">Sé el primero en comentar.</p>
      ) : (
        <ul className="space-y-7" data-testid="comments-list">
          {comments.map((c) => {
            const canDelete = user && user.email && (user.role === "admin" || user.id === c.user_id);
            return (
              <li key={c.id} className="flex gap-3" data-testid={`comment-${c.id}`}>
                <div className="w-10 h-10 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {(c.user_name || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{c.user_name}</span>
                    {c.user_role === "admin" && (
                      <span className="text-[10px] uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-full">Editor</span>
                    )}
                    <span className="text-xs text-[#86868b]">· {timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-[15px] text-[#1a1a1a] mt-1 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                  {canDelete && (
                    <button
                      onClick={() => remove(c.id)}
                      className="text-xs text-[#86868b] hover:text-red-600 mt-2 inline-flex items-center gap-1"
                      data-testid={`delete-comment-${c.id}`}
                    >
                      <Trash2 size={12} /> {user.role === "admin" && c.user_id !== user.id ? "Moderar" : "Eliminar"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
