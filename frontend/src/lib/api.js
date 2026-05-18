import axios from "axios";
import { getCurrentLang } from "@/lib/i18n";

// Defensive normalization: strip trailing /api and trailing slash so that
// REACT_APP_BACKEND_URL can be set as either "https://noxeal.com" OR
// "https://noxeal.com/api" without ever producing /api/api/... URLs.
function normalizeBackend(url) {
  if (!url) return "";
  let u = String(url).trim();
  u = u.replace(/\/+$/, "");          // trim trailing /
  u = u.replace(/\/api$/i, "");       // strip trailing /api (case-insensitive)
  return u;
}

const BACKEND_URL = normalizeBackend(process.env.REACT_APP_BACKEND_URL);

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Auto-inject ?lang= on every GET so listings/articles return cached translations.
// Skips: /translate/*, /admin/* (admin always sees Spanish source of truth),
//        and requests that already set their own lang param.
api.interceptors.request.use((cfg) => {
  if (cfg.method && cfg.method.toLowerCase() === "get") {
    const url = String(cfg.url || "");
    if (url.startsWith("/translate") || url.startsWith("/admin")) return cfg;
    const lang = getCurrentLang();
    if (lang && lang !== "es") {
      cfg.params = cfg.params || {};
      if (cfg.params.lang === undefined) cfg.params.lang = lang;
    }
  }
  return cfg;
});

export function formatApiError(detail) {
  if (detail == null) return "Algo salió mal. Intenta de nuevo.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
