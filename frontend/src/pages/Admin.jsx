import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, FileText, Eye, EyeOff, Trash2, RefreshCw, Image as ImageIcon, X, Lightbulb, Edit3, Star, Zap, Webhook, Copy } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import SEO from "@/components/SEO";

const TABS = [
  { key: "articles", label: "Artículos" },
  { key: "ai", label: "Generar con IA" },
  { key: "comments", label: "Comentarios" },
  { key: "subscribers", label: "Suscriptores" },
  { key: "users", label: "Usuarios" },
  { key: "make", label: "Make.com" },
];

export default function Admin() {
  const [tab, setTab] = useState("articles");
  const [stats, setStats] = useState(null);

  const loadStats = () => api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
  useEffect(() => { loadStats(); }, []);

  return (
    <main className="bg-[#fafafa] min-h-screen" data-testid="admin-page">
      <SEO title="Panel admin" path="/admin" />

      <section className="border-b border-black/10 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-12 pb-8">
          <div className="label-eyebrow mb-3">Noxeal · CEO</div>
          <h1 className="h-display text-4xl md:text-5xl mb-6">Centro de control</h1>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-8">
              {[
                { k: "articles", l: "Artículos" },
                { k: "published", l: "Publicados" },
                { k: "drafts", l: "Borradores" },
                { k: "comments", l: "Comentarios" },
                { k: "subscribers", l: "Suscriptores" },
                { k: "users", l: "Usuarios" },
              ].map((s) => (
                <div key={s.k} className="border border-black/10 rounded-2xl p-5" data-testid={`stat-${s.k}`}>
                  <div className="text-3xl font-semibold tracking-tight">{stats[s.k]}</div>
                  <div className="text-xs text-[#86868b] uppercase tracking-widest mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-10" data-testid="admin-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-2 rounded-full text-sm border transition ${tab === t.key ? "bg-black text-white border-black" : "border-black/10 hover:bg-black/5"}`}
                data-testid={`admin-tab-${t.key}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-12">
        {tab === "articles" && <ArticlesPanel onMutate={loadStats} />}
        {tab === "ai" && <AIPanel onCreated={() => { loadStats(); setTab("articles"); }} />}
        {tab === "comments" && <CommentsPanel onMutate={loadStats} />}
        {tab === "subscribers" && <SubscribersPanel />}
        {tab === "users" && <UsersPanel />}
        {tab === "make" && <MakeDocsPanel />}
      </section>
    </main>
  );
}

/* ============== ARTICLES PANEL ============== */
function ArticlesPanel({ onMutate }) {
  const [articles, setArticles] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busySlug, setBusySlug] = useState("");

  const load = async () => {
    setLoading(true);
    const params = filter === "all" ? {} : { status: filter };
    try {
      const { data } = await api.get("/admin/articles", { params });
      setArticles(data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (slug, action) => {
    setBusySlug(slug);
    try {
      await api.post(`/admin/articles/${slug}/${action}`);
      await load(); onMutate();
      toast.success(action === "publish" ? "Artículo publicado" : "Movido a borradores");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Error");
    } finally { setBusySlug(""); }
  };

  const remove = async (slug) => {
    if (!window.confirm("¿Eliminar este artículo? No se puede deshacer.")) return;
    setBusySlug(slug);
    try {
      await api.delete(`/admin/articles/${slug}`);
      await load(); onMutate();
      toast.success("Artículo eliminado");
    } catch (e) {
      toast.error("No se pudo eliminar");
    } finally { setBusySlug(""); }
  };

  const regenerateImage = async (slug) => {
    setBusySlug(slug);
    toast.info("Generando imagen con IA…", { duration: 4000 });
    try {
      await api.post(`/admin/articles/${slug}/regenerate-image`);
      await load();
      toast.success("Imagen generada");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Error generando imagen");
    } finally { setBusySlug(""); }
  };

  const toggleFlag = async (slug, flag, current) => {
    try {
      await api.put(`/admin/articles/${slug}`, { [flag]: !current });
      await load();
      toast.success(`${flag} ${!current ? "activado" : "desactivado"}`);
    } catch (e) {
      toast.error("No se pudo actualizar");
    }
  };

  return (
    <div data-testid="articles-panel">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {["all", "draft", "published"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs border ${filter === f ? "bg-black text-white border-black" : "border-black/10"}`}
              data-testid={`filter-${f}`}>
              {f === "all" ? "Todos" : f === "draft" ? "Borradores" : "Publicados"}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-[#86868b]">Cargando…</p> : (
        <div className="space-y-3">
          {articles.map((a) => (
            <div key={a.slug} className="border border-black/10 rounded-2xl p-5 bg-white flex gap-5 items-start" data-testid={`admin-article-${a.slug}`}>
              <div className="w-24 h-24 rounded-xl bg-[#f5f5f7] overflow-hidden flex-shrink-0">
                {a.image ? <img src={resolveImage(a.image)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#86868b]"><ImageIcon size={20}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${a.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{a.status}</span>
                  <span className="text-xs text-[#86868b]">{a.category}</span>
                  {a.author === "Noxeal AI" && <span className="text-[10px] uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-full">IA</span>}
                </div>
                <h3 className="font-semibold text-[17px] leading-snug mb-1 truncate">{a.title}</h3>
                <p className="text-[13px] text-[#424245] line-clamp-2 mb-3">{a.excerpt}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setEditing(a)} className="text-xs px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 inline-flex items-center gap-1" data-testid={`edit-${a.slug}`}>
                    <Edit3 size={12} /> Editar
                  </button>
                  {a.status === "draft" ? (
                    <button onClick={() => setStatus(a.slug, "publish")} disabled={busySlug === a.slug} className="text-xs px-3 py-1.5 rounded-full bg-black text-white inline-flex items-center gap-1" data-testid={`publish-${a.slug}`}>
                      <Eye size={12} /> {busySlug === a.slug ? "..." : "Publicar"}
                    </button>
                  ) : (
                    <button onClick={() => setStatus(a.slug, "unpublish")} disabled={busySlug === a.slug} className="text-xs px-3 py-1.5 rounded-full border border-black/10 inline-flex items-center gap-1" data-testid={`unpublish-${a.slug}`}>
                      <EyeOff size={12} /> Despublicar
                    </button>
                  )}
                  <button onClick={() => regenerateImage(a.slug)} disabled={busySlug === a.slug} className="text-xs px-3 py-1.5 rounded-full border border-black/10 inline-flex items-center gap-1" data-testid={`regen-image-${a.slug}`}>
                    <RefreshCw size={12} className={busySlug === a.slug ? "animate-spin" : ""} /> {busySlug === a.slug ? "Generando…" : "Regenerar imagen IA"}
                  </button>
                  <button onClick={() => toggleFlag(a.slug, "hero", a.hero)} className={`text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1 ${a.hero ? "bg-amber-100 border border-amber-300 text-amber-900" : "border border-black/10"}`} data-testid={`toggle-hero-${a.slug}`}>
                    <Star size={12} /> {a.hero ? "Hero" : "Marcar hero"}
                  </button>
                  <button onClick={() => toggleFlag(a.slug, "trending", a.trending)} className={`text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1 ${a.trending ? "bg-rose-100 border border-rose-300 text-rose-900" : "border border-black/10"}`} data-testid={`toggle-trending-${a.slug}`}>
                    <Zap size={12} /> {a.trending ? "Trending" : "Marcar trending"}
                  </button>
                  <Link to={`/articulo/${a.slug}`} target="_blank" className="text-xs px-3 py-1.5 rounded-full border border-black/10 inline-flex items-center gap-1" data-testid={`view-${a.slug}`}>
                    <FileText size={12} /> Ver
                  </Link>
                  <button onClick={() => remove(a.slug)} disabled={busySlug === a.slug} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1 ml-auto" data-testid={`delete-${a.slug}`}>
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
          {articles.length === 0 && <p className="text-[#86868b] text-center py-12">No hay artículos.</p>}
        </div>
      )}

      {editing && <EditArticleModal article={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); onMutate(); }} />}
    </div>
  );
}

/* ============== AI PANEL ============== */
function AIPanel({ onCreated }) {
  const [topic, setTopic] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [focus, setFocus] = useState("");
  const [topics, setTopics] = useState([]);
  const [suggesting, setSuggesting] = useState(false);

  const generate = async (e) => {
    e?.preventDefault();
    if (!topic.trim()) return;
    setError(""); setSuccess(""); setGenerating(true);
    try {
      const { data } = await api.post("/admin/articles/generate", { topic, publish: publishNow });
      setSuccess(`✓ Borrador creado: "${data.title}"`);
      setTopic("");
      onCreated();
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setGenerating(false); }
  };

  const suggest = async () => {
    setSuggesting(true); setError("");
    try {
      const { data } = await api.post("/admin/ai/suggest-topics", { focus });
      setTopics(data.topics || []);
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setSuggesting(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" data-testid="ai-panel">
      <div className="border border-black/10 rounded-3xl p-8 bg-white">
        <div className="flex items-center gap-2 mb-2"><Sparkles size={18} /><h2 className="h-display text-2xl">Generar borrador con Claude</h2></div>
        <p className="text-sm text-[#86868b] mb-6">Escribe un tema y la IA crea: título SEO, extracto, cuerpo, categoría, tags y meta description. Por defecto se guarda como borrador para que lo revises.</p>

        <form onSubmit={generate} className="space-y-4">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: ¿Por qué Mistral está ganando terreno frente a OpenAI en Europa?"
            rows={3}
            className="w-full px-5 py-4 rounded-2xl bg-[#f5f5f7] border border-transparent focus:bg-white focus:border-black/15 outline-none resize-none text-[15px]"
            data-testid="ai-topic-input"
          />
          <label className="flex items-center gap-2 text-sm text-[#424245]">
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} data-testid="ai-publish-now" />
            Publicar directamente (no recomendado para temas delicados)
          </label>
          <button type="submit" disabled={generating || !topic.trim()} className="btn-primary w-full justify-center" data-testid="ai-generate-submit">
            {generating ? "Generando con Claude Sonnet 4.5…" : "Generar borrador"}
          </button>
          {error && <p className="text-sm text-red-600" data-testid="ai-error">{error}</p>}
          {success && <p className="text-sm text-emerald-700" data-testid="ai-success">{success}</p>}
        </form>
      </div>

      <div className="border border-black/10 rounded-3xl p-8 bg-white">
        <div className="flex items-center gap-2 mb-2"><Lightbulb size={18} /><h2 className="h-display text-2xl">Sugerir temas virales</h2></div>
        <p className="text-sm text-[#86868b] mb-6">Pide a la IA 5 ideas relevantes esta semana. Click en cualquiera para autocompletar el campo de generación.</p>
        <div className="flex gap-2 mb-4">
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Enfoque (opcional): ej. IA, política, salud digital…"
            className="input-pill flex-1"
            style={{ paddingTop: "12px", paddingBottom: "12px" }}
            data-testid="ai-focus-input"
          />
          <button onClick={suggest} disabled={suggesting} className="btn-secondary" data-testid="ai-suggest-btn">
            {suggesting ? "Pensando…" : "Sugerir"}
          </button>
        </div>
        <ul className="space-y-2" data-testid="ai-topic-suggestions">
          {topics.map((t, i) => (
            <li key={i}>
              <button onClick={() => setTopic(t.title + (t.angle ? ` — ${t.angle}` : ""))}
                className="w-full text-left p-4 rounded-2xl border border-black/10 hover:bg-[#f5f5f7] transition"
                data-testid={`ai-topic-suggestion-${i}`}>
                <div className="text-xs text-[#86868b] uppercase tracking-widest mb-1">{t.category}</div>
                <div className="font-medium text-[15px]">{t.title}</div>
                {t.angle && <div className="text-xs text-[#424245] mt-1">{t.angle}</div>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ============== EDIT MODAL ============== */
function EditArticleModal({ article, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: article.title || "",
    excerpt: article.excerpt || "",
    body: (article.body || []).join("\n\n"),
    category: article.category || "Cultura digital",
    tags: (article.tags || []).join(", "),
    image: article.image || "",
    meta_description: article.meta_description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true); setError("");
    try {
      await api.put(`/admin/articles/${article.slug}`, {
        title: form.title,
        excerpt: form.excerpt,
        body: form.body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
        category: form.category,
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        image: form.image,
        meta_description: form.meta_description,
      });
      toast.success("Cambios guardados");
      onSaved();
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      setError(msg); toast.error(msg);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="edit-modal">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-8 py-5 border-b border-black/10 flex items-center justify-between">
          <h2 className="h-display text-2xl">Editar artículo</h2>
          <button onClick={onClose} className="text-[#86868b] hover:text-black" data-testid="modal-close"><X /></button>
        </div>
        <div className="p-8 space-y-4">
          <Field label="Título"><input className="input-pill" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="edit-title" /></Field>
          <Field label="Extracto"><textarea rows={2} className="w-full px-5 py-3 rounded-2xl bg-[#f5f5f7] outline-none resize-none" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} data-testid="edit-excerpt" /></Field>
          <Field label="Categoría">
            <select className="input-pill" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="edit-category">
              {["Tecnología","Investigación","Salud y redes","Cultura digital","IA"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Tags (separados por coma)"><input className="input-pill" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} data-testid="edit-tags" /></Field>
          <Field label="Imagen (URL o ruta /api/static/...)"><input className="input-pill" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} data-testid="edit-image" /></Field>
          <Field label="Meta description (SEO)"><textarea rows={2} className="w-full px-5 py-3 rounded-2xl bg-[#f5f5f7] outline-none resize-none" value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} data-testid="edit-meta" /></Field>
          <Field label="Cuerpo (separa párrafos con línea en blanco)"><textarea rows={14} className="w-full px-5 py-3 rounded-2xl bg-[#f5f5f7] outline-none resize-none font-mono text-[13px]" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} data-testid="edit-body" /></Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary" data-testid="edit-cancel">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn-primary" data-testid="edit-save">{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div>
    <label className="label-eyebrow block mb-2">{label}</label>
    {children}
  </div>
);

/* ============== COMMENTS PANEL ============== */
function CommentsPanel({ onMutate }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/admin/comments");
    setComments(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar comentario?")) return;
    await api.delete(`/comments/${id}`); await load(); onMutate();
  };

  if (loading) return <p className="text-[#86868b]">Cargando…</p>;
  if (!comments.length) return <p className="text-[#86868b] text-center py-12">No hay comentarios.</p>;

  return (
    <ul className="space-y-3" data-testid="admin-comments-list">
      {comments.map((c) => (
        <li key={c.id} className="border border-black/10 rounded-2xl p-5 bg-white flex gap-4">
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {(c.user_name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-semibold">{c.user_name}</span>
              {c.user_role === "admin" && <span className="text-[10px] uppercase bg-black text-white px-2 py-0.5 rounded-full">Editor</span>}
              <span className="text-xs text-[#86868b]">en /{c.article_slug}</span>
            </div>
            <p className="text-[14px] text-[#1a1a1a] mb-2 whitespace-pre-wrap">{c.body}</p>
            <button onClick={() => remove(c.id)} className="text-xs text-red-600 hover:underline inline-flex items-center gap-1" data-testid={`admin-delete-comment-${c.id}`}>
              <Trash2 size={12} /> Moderar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============== SUBSCRIBERS PANEL ============== */
function SubscribersPanel() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/newsletter/list").then(({ data }) => setSubs(data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[#86868b]">Cargando…</p>;
  if (!subs.length) return <p className="text-[#86868b] text-center py-12">Sin suscriptores aún.</p>;

  return (
    <div data-testid="subscribers-panel">
      <div className="mb-4 text-sm text-[#86868b]">{subs.length} suscriptor{subs.length !== 1 ? "es" : ""}</div>
      <ul className="space-y-2 bg-white rounded-2xl border border-black/10 divide-y divide-black/5">
        {subs.map((s) => (
          <li key={s.email} className="px-5 py-3 flex justify-between items-center text-sm">
            <span className="font-mono">{s.email}</span>
            <span className="text-xs text-[#86868b]">{new Date(s.subscribed_at).toLocaleDateString("es-ES")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============== USERS PANEL ============== */
function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/admin/users");
    setUsers(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setRole = async (id, role) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      await load();
    } catch (e) { alert(formatApiError(e.response?.data?.detail) || "Error"); }
  };

  if (loading) return <p className="text-[#86868b]">Cargando…</p>;

  return (
    <div data-testid="users-panel">
      <div className="mb-4 text-sm text-[#86868b]">{users.length} usuario{users.length !== 1 ? "s" : ""}</div>
      <ul className="space-y-2 bg-white rounded-2xl border border-black/10 divide-y divide-black/5">
        {users.map((u) => (
          <li key={u.id} className="px-5 py-4 flex flex-wrap gap-3 justify-between items-center">
            <div>
              <div className="font-medium">{u.name}</div>
              <div className="text-xs text-[#86868b]">{u.email}</div>
            </div>
            <select
              value={u.role}
              onChange={(e) => setRole(u.id, e.target.value)}
              className="px-4 py-2 rounded-full border border-black/10 text-sm bg-white"
              data-testid={`user-role-${u.id}`}
            >
              <option value="user">Suscriptor</option>
              <option value="author">Autor IA</option>
              <option value="admin">Admin / CEO</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Resolve image src — API returns "/api/static/..." or full URLs. */
function resolveImage(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return `${process.env.REACT_APP_BACKEND_URL || ""}${src}`;
}

/* ============== MAKE.COM DOCS PANEL ============== */
function MakeDocsPanel() {
  const base = process.env.REACT_APP_BACKEND_URL || "";
  const apiKey = "noxeal-make-7f3a9b2c8d4e5f6a1b9c3d8e7f2a5b6c";

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const generateUrl = `${base}/api/automation/articles/generate`;
  const publishUrl = `${base}/api/automation/articles/{slug}/publish`;
  const generateBody = JSON.stringify({ topic: "Tema detectado en Google Trends", publish: false, generate_image: false }, null, 2);

  return (
    <div className="space-y-8 max-w-4xl" data-testid="make-docs-panel">
      <div className="border border-black/10 rounded-3xl p-8 bg-white">
        <div className="flex items-center gap-2 mb-3"><Webhook size={20} /><h2 className="h-display text-2xl">Conexión Make.com / Zapier</h2></div>
        <p className="text-[15px] text-[#424245] leading-relaxed mb-6">
          Tienes un endpoint listo para que Make.com detecte una tendencia (Google Trends RSS, X, etc.),
          envíe el tema a Noxeal, Claude Sonnet 4.5 lo convierta en un borrador y aparezca aquí en
          /admin para que tú lo revises y publiques.
        </p>

        <div className="space-y-5">
          <KV label="Endpoint generación" value={generateUrl} onCopy={(v) => copy(v, "URL")} testid="make-url-generate" />
          <KV label="Endpoint publicar" value={publishUrl} onCopy={(v) => copy(v, "URL")} testid="make-url-publish" />
          <KV label="Header de autenticación" value={`X-API-Key: ${apiKey}`} onCopy={(v) => copy(v, "API key")} testid="make-api-key" sensitive />
          <KV label="Método" value="POST" testid="make-method" />
        </div>
      </div>

      <div className="border border-black/10 rounded-3xl p-8 bg-white">
        <h3 className="h-display text-xl mb-4">Body JSON (request)</h3>
        <pre className="bg-[#0d0d0f] text-emerald-300 p-5 rounded-2xl text-xs font-mono overflow-x-auto" data-testid="make-body-example">{generateBody}</pre>
        <button onClick={() => copy(generateBody, "Body JSON")} className="mt-3 btn-secondary inline-flex items-center gap-2" data-testid="copy-body">
          <Copy size={14} /> Copiar body
        </button>
        <p className="text-xs text-[#86868b] mt-4">
          <strong>topic</strong> · el tema/título a redactar (string, requerido).<br/>
          <strong>publish</strong> · si <code>true</code> se publica directo, si <code>false</code> queda como borrador (recomendado).<br/>
          <strong>generate_image</strong> · si <code>true</code> Nano Banana genera la imagen también (más lento, ~30-60s extra).
        </p>
      </div>

      <div className="border border-black/10 rounded-3xl p-8 bg-white">
        <h3 className="h-display text-xl mb-4">Flujo recomendado en Make.com</h3>
        <ol className="space-y-3 text-[15px] text-[#1a1a1a]">
          <li><strong>1.</strong> Trigger: <em>RSS &gt; Watch RSS feed</em> apuntando a Google Trends RSS de tu país (ej. <code>https://trends.google.com/trending/rss?geo=ES</code>).</li>
          <li><strong>2.</strong> Filtro: solo temas que matchean ciertas palabras clave (IA, política, redes, deepfakes, etc.).</li>
          <li><strong>3.</strong> HTTP Request → POST al endpoint de arriba con el header X-API-Key y el body JSON.</li>
          <li><strong>4.</strong> Telegram/Email → notificarte que llegó un borrador nuevo a revisar.</li>
          <li><strong>5.</strong> Tú entras a /admin → Artículos → revisas → click "Publicar".</li>
        </ol>
      </div>

      <div className="border border-amber-200 bg-amber-50 rounded-3xl p-6 text-[14px] text-amber-900">
        <strong>⚠️ Mantén segura tu API key.</strong> Cualquiera con esta key puede crear borradores en tu sitio.
        Si se filtra, cambia el valor de <code>MAKE_API_KEY</code> en <code>/app/backend/.env</code>.
      </div>
    </div>
  );
}

function KV({ label, value, onCopy, testid, sensitive }) {
  const [shown, setShown] = useState(!sensitive);
  return (
    <div data-testid={testid}>
      <div className="label-eyebrow mb-2">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-4 py-3 bg-[#f5f5f7] rounded-2xl text-[13px] font-mono break-all">
          {sensitive && !shown ? "•".repeat(Math.min(40, value.length)) : value}
        </code>
        {sensitive && (
          <button onClick={() => setShown((s) => !s)} className="text-xs px-3 py-2 rounded-full border border-black/10 hover:bg-black/5" data-testid={`${testid}-toggle`}>
            {shown ? "Ocultar" : "Mostrar"}
          </button>
        )}
        {onCopy && (
          <button onClick={() => onCopy(value)} className="text-xs px-3 py-2 rounded-full border border-black/10 hover:bg-black/5 inline-flex items-center gap-1" data-testid={`${testid}-copy`}>
            <Copy size={12} /> Copiar
          </button>
        )}
      </div>
    </div>
  );
}
