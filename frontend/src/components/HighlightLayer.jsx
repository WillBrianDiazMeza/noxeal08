import { useEffect, useRef, useState, useCallback } from "react";
import { Highlighter as HighlighterIcon, MessageSquarePlus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const LS_KEY = "noxeal_highlights";
const COLORS = [
  { key: "yellow", label: "Amarillo", bg: "#fef9c3", text: "#78350f" },
  { key: "green",  label: "Verde",    bg: "#d1fae5", text: "#065f46" },
  { key: "blue",   label: "Azul",     bg: "#dbeafe", text: "#1e3a8a" },
];

function readLocal(slug) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    return all[slug] || [];
  } catch { return []; }
}
function writeLocal(slug, list) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    all[slug] = list;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore quota */ }
}

/**
 * Wraps an article body and lets the reader select text to:
 *   - choose a color (yellow/green/blue)
 *   - optionally add a personal note
 *   - persist in localStorage (and server if logged in)
 *
 * Renders existing highlights as soft-colored markers on a stable list below
 * the article (we don't try to DOM-mutate paragraphs to avoid breaking layout).
 */
export default function HighlightLayer({ slug, paragraphs, articleTitle }) {
  const { user } = useAuth();
  const rootRef = useRef(null);
  const [popover, setPopover] = useState(null); // {x,y,text,paragraphIndex}
  const [highlights, setHighlights] = useState([]);
  const [editingNoteFor, setEditingNoteFor] = useState(null); // highlight id
  const [draftNote, setDraftNote] = useState("");

  /* ------- load (server first when logged-in, else localStorage) ------- */
  const load = useCallback(async () => {
    if (user?.email) {
      try {
        const { data } = await api.get(`/me/highlights/${slug}`);
        setHighlights(data || []);
        writeLocal(slug, data || []);
        return;
      } catch { /* fall back to local */ }
    }
    setHighlights(readLocal(slug));
  }, [slug, user?.email]);

  useEffect(() => { load(); }, [load]);

  /* ------- selection listener ------- */
  useEffect(() => {
    const onMouseUp = () => {
      const sel = window.getSelection();
      const text = (sel?.toString() || "").trim();
      if (!text || text.length < 3) { setPopover(null); return; }
      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      if (!range || !rootRef.current?.contains(range.commonAncestorContainer)) {
        setPopover(null); return;
      }
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) { setPopover(null); return; }
      // Try to detect which paragraph index we're in
      let paragraphIndex = 0;
      let node = range.commonAncestorContainer;
      while (node && node !== rootRef.current) {
        if (node.dataset && node.dataset.paragraphIndex) {
          paragraphIndex = parseInt(node.dataset.paragraphIndex, 10) || 0;
          break;
        }
        node = node.parentNode;
      }
      setPopover({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY - 10,
        text: text.slice(0, 600),
        paragraphIndex,
      });
    };
    const onScrollOrClickAway = (e) => {
      if (popover && !e.target.closest?.(".nx-highlight-popover")) setPopover(null);
    };
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onScrollOrClickAway);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousedown", onScrollOrClickAway);
    };
  }, [popover]);

  /* ------- create highlight ------- */
  const create = async (color) => {
    if (!popover) return;
    const payload = {
      slug,
      text: popover.text,
      color,
      note: "",
      paragraph_index: popover.paragraphIndex,
    };
    if (user?.email) {
      try {
        const { data } = await api.post("/me/highlights", payload);
        const next = [...highlights, data];
        setHighlights(next); writeLocal(slug, next);
        toast.success("Subrayado guardado en tu cuenta");
      } catch (e) {
        toast.error("No se pudo guardar el subrayado");
      }
    } else {
      const local = {
        ...payload,
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: new Date().toISOString(),
        article_title: articleTitle,
      };
      const next = [...highlights, local];
      setHighlights(next); writeLocal(slug, next);
      toast.success("Subrayado guardado (local) · Inicia sesión para sincronizar");
    }
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  /* ------- remove ------- */
  const remove = async (h) => {
    if (!window.confirm("¿Eliminar este subrayado?")) return;
    const next = highlights.filter((x) => x.id !== h.id);
    setHighlights(next); writeLocal(slug, next);
    if (user?.email && !h.id.startsWith("local-")) {
      api.delete(`/me/highlights/${h.id}`).catch(() => {});
    }
    toast.success("Eliminado");
  };

  /* ------- save note ------- */
  const saveNote = async (h) => {
    const next = highlights.map((x) => x.id === h.id ? { ...x, note: draftNote } : x);
    setHighlights(next); writeLocal(slug, next);
    setEditingNoteFor(null); setDraftNote("");
    if (user?.email && !h.id.startsWith("local-")) {
      api.patch(`/me/highlights/${h.id}`, { note: draftNote }).catch(() => {});
    }
    toast.success("Nota guardada");
  };

  const colorBg = (c) => COLORS.find((x) => x.key === c)?.bg || COLORS[0].bg;
  const colorText = (c) => COLORS.find((x) => x.key === c)?.text || COLORS[0].text;

  return (
    <>
      {/* Article body — paragraphs receive data-paragraph-index for tracking */}
      <div ref={rootRef} className="prose-noxeal max-w-3xl mx-auto px-5 lg:px-0" data-testid="article-body-highlightable">
        {paragraphs.map((p, i) => (
          <p key={i} data-paragraph-index={i}>{p}</p>
        ))}
      </div>

      {/* Floating popover near selection */}
      {popover && (
        <div
          className="nx-highlight-popover fixed z-50"
          style={{ left: popover.x, top: popover.y, transform: "translate(-50%, -100%)" }}
          data-testid="highlight-popover"
        >
          <div className="nx-hp-inner">
            <HighlighterIcon size={14} strokeWidth={1.6} className="text-[#86868b]" />
            {COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => create(c.key)}
                className="nx-hp-color"
                style={{ background: c.bg, borderColor: c.bg }}
                title={`Subrayar en ${c.label}`}
                data-testid={`highlight-color-${c.key}`}
                aria-label={`Subrayar en ${c.label}`}
              />
            ))}
            <button
              type="button"
              onClick={() => setPopover(null)}
              className="nx-hp-close"
              title="Cancelar"
              data-testid="highlight-cancel"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Highlights drawer below the body */}
      {highlights.length > 0 && (
        <aside className="max-w-3xl mx-auto px-5 lg:px-0 mt-12" data-testid="highlights-list">
          <div className="flex items-center gap-2 mb-4">
            <HighlighterIcon size={14} className="text-[var(--nx-blue)]" strokeWidth={2} />
            <span className="label-eyebrow" style={{ color: "var(--nx-blue)" }}>
              Tus subrayados ({highlights.length})
            </span>
            {!user?.email && (
              <span className="text-[11px] text-[#86868b]">· solo en este navegador</span>
            )}
          </div>
          <ul className="space-y-3">
            {highlights.map((h) => (
              <li key={h.id} className="nx-highlight-card group" data-testid={`highlight-item-${h.id}`}>
                <blockquote
                  className="text-[15px] leading-relaxed"
                  style={{ background: colorBg(h.color), color: colorText(h.color), padding: "12px 16px", borderRadius: 10 }}
                >
                  {h.text}
                </blockquote>
                {editingNoteFor === h.id ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveNote(h); }}
                      placeholder="Una nota personal sobre este pasaje…"
                      className="flex-1 px-3 py-2 rounded-lg border border-black/10 text-sm"
                      data-testid={`highlight-note-input-${h.id}`}
                    />
                    <button onClick={() => saveNote(h)} className="text-xs px-3 py-2 rounded-full bg-black text-white" data-testid={`highlight-note-save-${h.id}`}>Guardar</button>
                  </div>
                ) : h.note ? (
                  <p
                    className="mt-2 text-[14px] text-[#1a1a1a] italic cursor-pointer hover:opacity-80"
                    onClick={() => { setEditingNoteFor(h.id); setDraftNote(h.note); }}
                    data-testid={`highlight-note-${h.id}`}
                  >
                    “{h.note}”
                  </p>
                ) : (
                  <button
                    onClick={() => { setEditingNoteFor(h.id); setDraftNote(""); }}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-[#86868b] hover:text-black"
                    data-testid={`highlight-add-note-${h.id}`}
                  >
                    <MessageSquarePlus size={12} /> Añadir nota
                  </button>
                )}
                <button
                  onClick={() => remove(h)}
                  className="absolute top-2 right-2 p-1.5 text-[#86868b] hover:text-[#b91c1c] opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Eliminar subrayado"
                  data-testid={`highlight-remove-${h.id}`}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </>
  );
}
