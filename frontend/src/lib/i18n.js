/**
 * Noxeal i18n — 2-layer system:
 *
 *  1. **Static dictionary** (DICT) covers all known UI labels in 4 languages.
 *     Synchronous, instant, no network. Fall-back to es when key not found.
 *
 *  2. **Dynamic translation** via `translateOnDemand()`:
 *     Any string not present in DICT gets translated via Claude (backend
 *     /api/translate/strings) and cached forever in localStorage + server.
 *     This lets us i18n-ify the whole frontend incrementally — just wrap
 *     any literal string with `t("free form text in Spanish")` and it works.
 */

import { useEffect, useState, useCallback } from "react";
import axios from "axios";

export const LANGUAGES = [
  { code: "es", label: "Español", flag: "ES", htmlLang: "es-ES" },
  { code: "en", label: "English", flag: "EN", htmlLang: "en" },
  { code: "fr", label: "Français", flag: "FR", htmlLang: "fr" },
  { code: "nl", label: "Nederlands", flag: "NL", htmlLang: "nl" },
];

/* Static dictionary — only short, high-traffic strings.
   Everything else is translated dynamically and cached. */
const DICT = {
  es: {
    "nav.home": "Inicio", "nav.trends": "Tendencias", "nav.topics": "Temas",
    "nav.categories": "Categorías", "nav.explore": "Explorar", "nav.search": "Buscar",
    "nav.saved": "Tu lista de lectura", "nav.notes": "Tus subrayados",
    "nav.signin": "Entrar", "nav.subscribe": "Suscribirse", "nav.signout": "Salir",
    "nav.profile": "Tu perfil",
    "lang.choose": "Idioma",
    "lang.notice": "La interfaz cambia al instante. El contenido editorial se traduce automáticamente.",
    "common.loading": "Cargando…",
    "common.error": "Algo salió mal",
    "common.retry": "Reintentar",
    "common.cancel": "Cancelar", "common.save": "Guardar", "common.delete": "Eliminar",
    "common.share": "Compartir", "common.back": "Volver",
    "article.see_original": "Ver original (español)",
    "article.translated_notice": "Traducción automática · El original está en español.",
    "footer.tagline": "Periodismo lento. Cultura digital. Verificación editorial.",
  },
  en: {
    "nav.home": "Home", "nav.trends": "Trends", "nav.topics": "Topics",
    "nav.categories": "Categories", "nav.explore": "Explore", "nav.search": "Search",
    "nav.saved": "Reading list", "nav.notes": "Highlights",
    "nav.signin": "Sign in", "nav.subscribe": "Subscribe", "nav.signout": "Sign out",
    "nav.profile": "Your profile",
    "lang.choose": "Language",
    "lang.notice": "The interface switches instantly. Editorial content is auto-translated.",
    "common.loading": "Loading…",
    "common.error": "Something went wrong",
    "common.retry": "Retry",
    "common.cancel": "Cancel", "common.save": "Save", "common.delete": "Delete",
    "common.share": "Share", "common.back": "Back",
    "article.see_original": "See original (Spanish)",
    "article.translated_notice": "Machine translation · The original is in Spanish.",
    "footer.tagline": "Slow journalism. Digital culture. Editorial verification.",
  },
  fr: {
    "nav.home": "Accueil", "nav.trends": "Tendances", "nav.topics": "Thèmes",
    "nav.categories": "Catégories", "nav.explore": "Explorer", "nav.search": "Rechercher",
    "nav.saved": "Liste de lecture", "nav.notes": "Surlignages",
    "nav.signin": "Connexion", "nav.subscribe": "S'abonner", "nav.signout": "Déconnexion",
    "nav.profile": "Votre profil",
    "lang.choose": "Langue",
    "lang.notice": "L'interface change immédiatement. Le contenu éditorial est traduit automatiquement.",
    "common.loading": "Chargement…",
    "common.error": "Une erreur est survenue",
    "common.retry": "Réessayer",
    "common.cancel": "Annuler", "common.save": "Enregistrer", "common.delete": "Supprimer",
    "common.share": "Partager", "common.back": "Retour",
    "article.see_original": "Voir l'original (espagnol)",
    "article.translated_notice": "Traduction automatique · L'original est en espagnol.",
    "footer.tagline": "Journalisme lent. Culture numérique. Vérification éditoriale.",
  },
  nl: {
    "nav.home": "Home", "nav.trends": "Trends", "nav.topics": "Onderwerpen",
    "nav.categories": "Categorieën", "nav.explore": "Verkennen", "nav.search": "Zoeken",
    "nav.saved": "Leeslijst", "nav.notes": "Markeringen",
    "nav.signin": "Aanmelden", "nav.subscribe": "Abonneren", "nav.signout": "Afmelden",
    "nav.profile": "Je profiel",
    "lang.choose": "Taal",
    "lang.notice": "De interface schakelt direct over. Redactionele inhoud wordt automatisch vertaald.",
    "common.loading": "Laden…",
    "common.error": "Er ging iets mis",
    "common.retry": "Opnieuw proberen",
    "common.cancel": "Annuleren", "common.save": "Opslaan", "common.delete": "Verwijderen",
    "common.share": "Delen", "common.back": "Terug",
    "article.see_original": "Origineel bekijken (Spaans)",
    "article.translated_notice": "Machinevertaling · Het origineel is in het Spaans.",
    "footer.tagline": "Trage journalistiek. Digitale cultuur. Redactionele verificatie.",
  },
};

const LS_KEY = "noxeal_lang";
const LS_CACHE = "noxeal_i18n_cache";
const PENDING = new Map(); // lang -> {promise, batch:[]}

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

function detectInitial() {
  try {
    const urlLang = new URLSearchParams(window.location.search).get("lang");
    if (urlLang && DICT[urlLang]) return urlLang;
    const stored = localStorage.getItem(LS_KEY);
    if (stored && DICT[stored]) return stored;
    // Detect from navigator
    const nav = (navigator.language || "es").slice(0, 2).toLowerCase();
    if (DICT[nav]) return nav;
  } catch { /* ignore */ }
  return "es";
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(LS_CACHE) || "{}"); }
  catch { return {}; }
}
function writeCache(obj) {
  try { localStorage.setItem(LS_CACHE, JSON.stringify(obj)); } catch { /* ignore */ }
}

/* ───── Dynamic translation: batches multiple t() calls in 80ms windows ───── */
async function flushBatch(lang) {
  const slot = PENDING.get(lang);
  if (!slot || !slot.batch.length) { PENDING.delete(lang); return; }
  const batch = slot.batch.slice();
  slot.batch = [];
  try {
    const { data } = await axios.post(`${API_BASE}/api/translate/strings`, {
      strings: batch.map((b) => b.src),
      lang,
    }, { timeout: 25000 });
    const arr = (data && data.translations) || batch.map((b) => b.src);
    const cache = readCache();
    cache[lang] = cache[lang] || {};
    batch.forEach((b, i) => {
      const tr = arr[i] || b.src;
      cache[lang][b.src] = tr;
      b.resolve(tr);
    });
    writeCache(cache);
  } catch {
    batch.forEach((b) => b.resolve(b.src));
  } finally {
    PENDING.delete(lang);
  }
}

function requestTranslation(lang, src) {
  return new Promise((resolve) => {
    let slot = PENDING.get(lang);
    if (!slot) {
      slot = { batch: [], timer: null };
      PENDING.set(lang, slot);
    }
    slot.batch.push({ src, resolve });
    if (slot.timer) clearTimeout(slot.timer);
    slot.timer = setTimeout(() => flushBatch(lang), 80);
  });
}

/* ───── Hook ───── */
export function useLang() {
  const [lang, setLangState] = useState(() => detectInitial());
  const [, force] = useState(0);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, lang); } catch { /* ignore */ }
    const meta = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = meta?.htmlLang || lang;
    window.dispatchEvent(new CustomEvent("noxeal:lang-change", { detail: { lang } }));
  }, [lang]);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === LS_KEY && e.newValue && DICT[e.newValue]) setLangState(e.newValue); };
    const onCustom = (e) => { if (e.detail?.lang && DICT[e.detail.lang]) setLangState(e.detail.lang); };
    const onCacheUpdate = () => force((n) => n + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("noxeal:lang-change", onCustom);
    window.addEventListener("noxeal:i18n-cache-update", onCacheUpdate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("noxeal:lang-change", onCustom);
      window.removeEventListener("noxeal:i18n-cache-update", onCacheUpdate);
    };
  }, []);

  /** Translate any string. Synchronous fast-path via dictionary or cache; async fallback to Claude. */
  const t = useCallback((textOrKey, defaultText) => {
    if (textOrKey == null) return "";
    // Static dictionary key path
    if (DICT[lang]?.[textOrKey] !== undefined) return DICT[lang][textOrKey];
    // Spanish original = no translation needed
    if (lang === "es") return defaultText ?? textOrKey;
    // Cache hit
    const cache = readCache();
    if (cache[lang]?.[textOrKey] !== undefined) return cache[lang][textOrKey];
    // Cache miss: trigger async fetch, return Spanish as immediate fallback
    requestTranslation(lang, textOrKey).then((tr) => {
      const c = readCache();
      c[lang] = c[lang] || {};
      c[lang][textOrKey] = tr;
      writeCache(c);
      window.dispatchEvent(new Event("noxeal:i18n-cache-update"));
    });
    return defaultText ?? textOrKey;
  }, [lang]);

  const setLang = (next) => { if (DICT[next]) setLangState(next); };
  return { lang, setLang, t };
}

export function getCurrentLang() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && DICT[stored]) return stored;
  } catch { /* ignore */ }
  return "es";
}
