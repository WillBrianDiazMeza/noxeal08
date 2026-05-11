import axios from "axios";

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
