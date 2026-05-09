import { useState } from "react";
import { Link2, Check, Twitter, Facebook, Instagram, MessageCircle, Send } from "lucide-react";

export default function SocialShare({ url, title, excerpt = "" }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = typeof window !== "undefined"
    ? new URL(url, window.location.origin).toString()
    : url;
  const text = encodeURIComponent(`${title} — Noxeal`);
  const u = encodeURIComponent(fullUrl);
  const q = encodeURIComponent(`${title}\n${excerpt}\n${fullUrl}`);

  const items = [
    { key: "x", label: "X / Twitter", href: `https://twitter.com/intent/tweet?text=${text}&url=${u}`, Icon: Twitter },
    { key: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: Facebook },
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${q}`, Icon: MessageCircle },
    { key: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${text}`, Icon: Send },
    { key: "instagram", label: "Instagram", href: "https://instagram.com/", Icon: Instagram, brand: true },
    { key: "tiktok", label: "TikTok", href: "https://tiktok.com/", Icon: TikTokGlyph, brand: true },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="border-t border-b border-black/10 py-8 my-12" data-testid="social-share">
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        <div>
          <div className="label-eyebrow mb-1">Compartir</div>
          <p className="text-sm text-[#86868b]">Si te ha hecho pensar, hazlo circular.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:ml-auto">
          {items.map(({ key, label, href, Icon, brand }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={brand ? `${label} (perfil de marca)` : `Compartir en ${label}`}
              aria-label={label}
              className="w-11 h-11 rounded-full border border-black/10 hover:bg-black hover:text-white transition-colors flex items-center justify-center"
              data-testid={`share-${key}`}
            >
              <Icon size={16} strokeWidth={1.6} />
            </a>
          ))}
          <button
            onClick={copy}
            className="w-11 h-11 rounded-full border border-black/10 hover:bg-black hover:text-white transition-colors flex items-center justify-center"
            data-testid="share-copy-link"
            title="Copiar enlace"
            aria-label="Copiar enlace"
          >
            {copied ? <Check size={16} /> : <Link2 size={16} strokeWidth={1.6} />}
          </button>
        </div>
      </div>
      {copied && <p className="text-xs text-emerald-700 mt-3" data-testid="share-copied">Enlace copiado</p>}
    </div>
  );
}

function TikTokGlyph({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4c.5 2.5 2.5 4.5 5 5" />
    </svg>
  );
}
