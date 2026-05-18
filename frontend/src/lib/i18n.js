/**
 * Lightweight i18n for Noxeal UI.
 *
 * Why no React Context: the language selector affects only static UI labels
 * (navigation, CTAs) — content stays in Spanish for now. Translating editorial
 * content is delegated to Make.com / Claude in a future iteration.
 *
 * Persistence: localStorage key `noxeal_lang` + URL ?lang= override.
 * Accessible languages: es (default), en, fr, nl.
 */

import { useEffect, useState, useCallback } from "react";

export const LANGUAGES = [
  { code: "es", label: "Español", flag: "ES" },
  { code: "en", label: "English", flag: "EN" },
  { code: "fr", label: "Français", flag: "FR" },
  { code: "nl", label: "Nederlands", flag: "NL" },
];

const DICT = {
  es: {
    "nav.home": "Inicio",
    "nav.trends": "Tendencias",
    "nav.topics": "Temas",
    "nav.categories": "Categorías",
    "nav.explore": "Explorar",
    "nav.search": "Buscar",
    "nav.saved": "Tu lista de lectura",
    "nav.notes": "Tus subrayados",
    "nav.signin": "Entrar",
    "nav.subscribe": "Suscribirse",
    "nav.signout": "Salir",
    "lang.choose": "Idioma",
    "lang.notice": "El contenido editorial sigue en español por ahora. La interfaz cambia inmediatamente.",
  },
  en: {
    "nav.home": "Home",
    "nav.trends": "Trends",
    "nav.topics": "Topics",
    "nav.categories": "Categories",
    "nav.explore": "Explore",
    "nav.search": "Search",
    "nav.saved": "Reading list",
    "nav.notes": "Highlights",
    "nav.signin": "Sign in",
    "nav.subscribe": "Subscribe",
    "nav.signout": "Sign out",
    "lang.choose": "Language",
    "lang.notice": "Editorial content stays in Spanish for now. UI switches immediately.",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.trends": "Tendances",
    "nav.topics": "Thèmes",
    "nav.categories": "Catégories",
    "nav.explore": "Explorer",
    "nav.search": "Rechercher",
    "nav.saved": "Liste de lecture",
    "nav.notes": "Surlignages",
    "nav.signin": "Connexion",
    "nav.subscribe": "S'abonner",
    "nav.signout": "Déconnexion",
    "lang.choose": "Langue",
    "lang.notice": "Le contenu éditorial reste en espagnol. L'interface change immédiatement.",
  },
  nl: {
    "nav.home": "Home",
    "nav.trends": "Trends",
    "nav.topics": "Onderwerpen",
    "nav.categories": "Categorieën",
    "nav.explore": "Verkennen",
    "nav.search": "Zoeken",
    "nav.saved": "Leeslijst",
    "nav.notes": "Markeringen",
    "nav.signin": "Aanmelden",
    "nav.subscribe": "Abonneren",
    "nav.signout": "Afmelden",
    "lang.choose": "Taal",
    "lang.notice": "De redactionele inhoud blijft voorlopig in het Spaans. Interface wijzigt direct.",
  },
};

const LS_KEY = "noxeal_lang";

function detectInitial() {
  try {
    const urlLang = new URLSearchParams(window.location.search).get("lang");
    if (urlLang && DICT[urlLang]) return urlLang;
    const stored = localStorage.getItem(LS_KEY);
    if (stored && DICT[stored]) return stored;
  } catch { /* ignore */ }
  return "es";
}

export function useLang() {
  const [lang, setLangState] = useState(() => detectInitial());

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
    // Notify any listener (e.g. SEO component) so hreflang re-renders
    window.dispatchEvent(new CustomEvent("noxeal:lang-change", { detail: { lang } }));
  }, [lang]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e) => { if (e.key === LS_KEY && e.newValue && DICT[e.newValue]) setLangState(e.newValue); };
    const onCustom = (e) => { if (e.detail?.lang && DICT[e.detail.lang]) setLangState(e.detail.lang); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("noxeal:lang-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("noxeal:lang-change", onCustom);
    };
  }, []);

  const t = useCallback((key) => DICT[lang]?.[key] ?? DICT.es[key] ?? key, [lang]);
  const setLang = (next) => { if (DICT[next]) setLangState(next); };
  return { lang, setLang, t };
}

export function getCurrentLang() {
  try {
    return localStorage.getItem(LS_KEY) || "es";
  } catch { return "es"; }
}
