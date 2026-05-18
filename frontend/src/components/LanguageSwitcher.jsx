import { useEffect, useRef, useState } from "react";
import { Languages, Check } from "lucide-react";
import { LANGUAGES, useLang } from "@/lib/i18n";

/** Compact pill dropdown for desktop, used in Header. */
export default function LanguageSwitcher({ compact = true }) {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div ref={ref} className="relative inline-block" data-testid="lang-switcher">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="nav-link inline-flex items-center gap-1.5 text-xs uppercase tracking-widest"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.choose")}
        data-testid="lang-switcher-button"
      >
        <Languages size={13} strokeWidth={1.6} />
        <span className="font-semibold">{active.flag}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 z-50 w-56 rounded-xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1.5"
          data-testid="lang-switcher-menu"
        >
          {!compact && (
            <li className="px-3 py-2 text-[11px] uppercase tracking-widest text-[#86868b] border-b border-black/5">
              {t("lang.choose")}
            </li>
          )}
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                  // Soft full reload to pick up cached translations for all server-rendered content
                  if (typeof window !== "undefined") {
                    setTimeout(() => window.location.reload(), 80);
                  }
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-black/[0.04] ${
                  l.code === lang ? "text-black font-semibold" : "text-[#1a1a1a]"
                }`}
                data-testid={`lang-option-${l.code}`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#86868b] w-7">{l.flag}</span>
                  <span>{l.label}</span>
                </span>
                {l.code === lang && <Check size={13} className="text-[var(--nx-blue)]" />}
              </button>
            </li>
          ))}
          <li className="px-3 py-2 text-[11px] text-[#86868b] border-t border-black/5 leading-relaxed">
            {t("lang.notice")}
          </li>
        </ul>
      )}
    </div>
  );
}
