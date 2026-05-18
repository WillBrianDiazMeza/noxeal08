/**
 * Editorial fact levels — Noxeal classification system.
 * Each piece declares its epistemic status. Bloomberg/NYT-style transparency.
 *
 * - confirmed:     hechos verificados con fuentes primarias múltiples
 * - analysis:      lectura / interpretación editorial (estado más frecuente)
 * - opinion:       posición editorial declarada del autor
 * - investigation: trabajo de archivo, cross-referencing, premium / exclusive
 * - rumor:         circulando virtualmente pero SIN confirmación — banner amarillo
 * - story:         narrativa humana / cinematográfica (tono emocional)
 */

export const FACT_LEVELS = {
  confirmed: {
    key: "confirmed",
    label: "Confirmado",
    short: "Confirmado",
    description: "Hechos verificados con fuentes primarias contrastadas.",
    dotColor: "#0a7c2f",
    bg: "#ecfdf3",
    border: "#a7e7c2",
    text: "#055527",
    icon: "check",
  },
  analysis: {
    key: "analysis",
    label: "Análisis",
    short: "Análisis",
    description: "Lectura editorial sobre un tema o tendencia. Mezcla hechos verificados con interpretación.",
    dotColor: "#3B82F6",
    bg: "#eff6ff",
    border: "#bfdbfe",
    text: "#1e3a8a",
    icon: "compass",
  },
  opinion: {
    key: "opinion",
    label: "Opinión",
    short: "Opinión",
    description: "Punto de vista editorial declarado del autor. No es noticia.",
    dotColor: "#6E6E73",
    bg: "#f5f5f7",
    border: "#d2d2d7",
    text: "#1d1d1f",
    icon: "quote",
  },
  investigation: {
    key: "investigation",
    label: "Investigación",
    short: "Investigación",
    description: "Trabajo de archivo y cross-referencing. Cobertura premium con fuentes citadas.",
    dotColor: "#b08900",
    bg: "#fffbeb",
    border: "#fde68a",
    text: "#713f12",
    icon: "search",
    premium: true,
  },
  rumor: {
    key: "rumor",
    label: "Rumor",
    short: "Rumor circulando",
    description: "Información viral SIN confirmar. Lee con criterio.",
    dotColor: "#b91c1c",
    bg: "#fff5f5",
    border: "#fecaca",
    text: "#7f1d1d",
    icon: "alert",
    warning: true,
  },
  story: {
    key: "story",
    label: "Historia",
    short: "Historia",
    description: "Narrativa humana, contexto y emoción. Lectura larga.",
    dotColor: "#7c3aed",
    bg: "#faf5ff",
    border: "#e9d5ff",
    text: "#4c1d95",
    icon: "book",
    italic: true,
  },
};

export function getFactLevel(key) {
  return FACT_LEVELS[key] || FACT_LEVELS.analysis;
}

export function verificationColor(value) {
  const v = Math.max(0, Math.min(100, value || 0));
  if (v >= 75) return { color: "#0a7c2f", bg: "#ecfdf3", label: "Alta" };
  if (v >= 50) return { color: "#3B82F6", bg: "#eff6ff", label: "Media" };
  if (v >= 30) return { color: "#b08900", bg: "#fffbeb", label: "Baja" };
  return { color: "#b91c1c", bg: "#fff5f5", label: "Muy baja" };
}
