import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Trash2, MessageSquare, Heart, Flag, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const LS_COMMENT_LIKES = "noxeal_liked_comments";
const LS_COMMENT_REPORTS = "noxeal_reported_comments";

const readSet = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
};
const writeSet = (key, set) => {
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
};

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
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyBody, setReplyBody] = useState("");

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

  const submitReply = async (parentId) => {
    if (!replyBody.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/articles/${slug}/comments`, { body: replyBody, parent_id: parentId });
      setReplyBody(""); setReplyingTo(null);
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
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

  const toggleLikeComment = async (id) => {
    const set = readSet(LS_COMMENT_LIKES);
    if (set.has(id)) {
      // can't unlike on server in this version; just local toggle visual
      return;
    }
    set.add(id); writeSet(LS_COMMENT_LIKES, set);
    setComments((cs) => cs.map((c) => c.id === id ? { ...c, likes: (c.likes || 0) + 1 } : c));
    api.post(`/comments/${id}/like`).catch(() => {});
  };

  const reportComment = async (id) => {
    const set = readSet(LS_COMMENT_REPORTS);
    if (set.has(id)) { toast.info("Ya reportaste este comentario"); return; }
    if (!window.confirm("¿Reportar este comentario por contenido inapropiado o spam?")) return;
    set.add(id); writeSet(LS_COMMENT_REPORTS, set);
    try {
      await api.post(`/comments/${id}/report`);
      toast.success("Reporte enviado a moderación");
    } catch {
      toast.error("No se pudo reportar");
    }
  };

  // Build tree: top-level + replies grouped by parent_id
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parent_id) {
      (acc[c.parent_id] = acc[c.parent_id] || []).push(c);
    }
    return acc;
  }, {});

  const renderComment = (c, isReply = false) => {
    const canDelete = user && user.email && (user.role === "admin" || user.id === c.user_id);
    const liked = readSet(LS_COMMENT_LIKES).has(c.id);
    return (
      <li key={c.id} className={`flex gap-3 ${isReply ? "ml-12 pl-4 border-l-2 border-black/10" : ""}`} data-testid={`comment-${c.id}`}>
        <div className={`${isReply ? "w-8 h-8 text-[11px]" : "w-10 h-10 text-xs"} rounded-full bg-[#1d1d1f] text-white flex items-center justify-center font-semibold flex-shrink-0`}>
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
          <p className="text-[15px] text-[#1a1a1a] mt-1 whitespace-pre-wrap leading-relaxed break-words">{c.body}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-[#86868b]">
            <button
              onClick={() => toggleLikeComment(c.id)}
              className={`inline-flex items-center gap-1 hover:text-black ${liked ? "text-rose-600" : ""}`}
              data-testid={`comment-like-${c.id}`}
            >
              <Heart size={12} fill={liked ? "currentColor" : "none"} /> {c.likes || 0}
            </button>
            {!isReply && user && user.email && (
              <button
                onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyBody(""); }}
                className="inline-flex items-center gap-1 hover:text-black"
                data-testid={`comment-reply-${c.id}`}
              >
                <CornerDownRight size={12} /> Responder
              </button>
            )}
            <button
              onClick={() => reportComment(c.id)}
              className="inline-flex items-center gap-1 hover:text-red-600"
              data-testid={`comment-report-${c.id}`}
            >
              <Flag size={12} /> Reportar
            </button>
            {canDelete && (
              <button
                onClick={() => remove(c.id)}
                className="inline-flex items-center gap-1 hover:text-red-600"
                data-testid={`delete-comment-${c.id}`}
              >
                <Trash2 size={12} /> {user.role === "admin" && c.user_id !== user.id ? "Moderar" : "Eliminar"}
              </button>
            )}
          </div>

          {replyingTo === c.id && (
            <div className="mt-3 flex gap-2" data-testid={`reply-form-${c.id}`}>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={`Responder a ${c.user_name}…`}
                rows={2}
                className="flex-1 px-4 py-3 rounded-xl bg-[#f5f5f7] border border-transparent focus:bg-white focus:border-black/15 outline-none resize-none text-sm"
                data-testid={`reply-textarea-${c.id}`}
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => submitReply(c.id)}
                  disabled={submitting || !replyBody.trim()}
                  className="btn-primary text-xs px-3 py-1.5"
                  data-testid={`reply-submit-${c.id}`}
                >Enviar</button>
                <button
                  onClick={() => { setReplyingTo(null); setReplyBody(""); }}
                  className="text-xs text-[#86868b] hover:text-black"
                >Cancelar</button>
              </div>
            </div>
          )}

          {/* Replies */}
          {!isReply && (repliesByParent[c.id] || []).length > 0 && (
            <ul className="mt-5 space-y-5">
              {repliesByParent[c.id].map((r) => renderComment(r, true))}
            </ul>
          )}
        </div>
      </li>
    );
  };

  return (
    <section className="max-w-3xl mx-auto px-5 lg:px-0 mt-16" data-testid="comments-section">
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
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-[#86868b] italic" data-testid="comments-empty">Sé el primero en comentar.</p>
      ) : (
        <ul className="space-y-7" data-testid="comments-list">
          {topLevel.map((c) => renderComment(c, false))}
        </ul>
      )}
    </section>
  );
}
