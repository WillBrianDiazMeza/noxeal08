import { useEffect, useState } from "react";
import { Heart, Bookmark, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const LS_LIKE = "noxeal_liked_articles";
const LS_SAVE = "noxeal_saved_articles";

const readSet = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
};
const writeSet = (key, set) => {
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
};

export default function ArticleEngagement({ slug, initialLikes = 0, views = 0, commentsCount = 0 }) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLiked(readSet(LS_LIKE).has(slug));
    setSaved(readSet(LS_SAVE).has(slug));
    setLikes(initialLikes);
  }, [slug, initialLikes]);

  const toggleLike = async () => {
    const set = readSet(LS_LIKE);
    if (liked) {
      set.delete(slug); writeSet(LS_LIKE, set); setLiked(false);
      setLikes((n) => Math.max(0, n - 1));
      api.post(`/articles/${slug}/unlike`).catch(() => {});
    } else {
      set.add(slug); writeSet(LS_LIKE, set); setLiked(true);
      setLikes((n) => n + 1);
      api.post(`/articles/${slug}/like`).catch(() => {});
    }
  };

  const toggleSave = () => {
    const set = readSet(LS_SAVE);
    if (saved) {
      set.delete(slug); writeSet(LS_SAVE, set); setSaved(false);
      toast.success("Eliminado de tu lista");
    } else {
      set.add(slug); writeSet(LS_SAVE, set); setSaved(true);
      toast.success("Guardado en tu lista (local)");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="article-engagement">
      <button
        onClick={toggleLike}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
          liked ? "bg-rose-50 border-rose-300 text-rose-700" : "border-black/15 hover:bg-black/5"
        }`}
        data-testid="article-like-btn"
        aria-pressed={liked}
      >
        <Heart size={15} fill={liked ? "currentColor" : "none"} strokeWidth={1.7} />
        <span className="text-sm font-medium tabular-nums">{likes.toLocaleString("es-ES")}</span>
      </button>

      <button
        onClick={toggleSave}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
          saved ? "bg-amber-50 border-amber-300 text-amber-800" : "border-black/15 hover:bg-black/5"
        }`}
        data-testid="article-save-btn"
        aria-pressed={saved}
        title="Guardar para leer luego (solo en este navegador)"
      >
        <Bookmark size={15} fill={saved ? "currentColor" : "none"} strokeWidth={1.7} />
        <span className="text-sm font-medium">{saved ? "Guardado" : "Guardar"}</span>
      </button>

      <span className="inline-flex items-center gap-1.5 text-sm text-[#86868b] ml-2" data-testid="article-views-pill">
        <Eye size={14} strokeWidth={1.7} /> <span className="tabular-nums">{(views || 0).toLocaleString("es-ES")}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-sm text-[#86868b]" data-testid="article-comments-pill">
        <MessageSquare size={14} strokeWidth={1.7} /> <span className="tabular-nums">{(commentsCount || 0).toLocaleString("es-ES")}</span>
      </span>
    </div>
  );
}
