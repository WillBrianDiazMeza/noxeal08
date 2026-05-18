import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

const PHRASES = [
  "Analizando narrativas…",
  "Verificando fuentes…",
  "Mapeando tendencias…",
  "Detectando patrones…",
  "Preparando lectura editorial…",
];

export default function LoadingScreen() {
  const { t } = useLang();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setIdx((i) => (i + 1) % PHRASES.length), 1400);
    return () => clearInterval(tick);
  }, []);
  return (
    <div className="nx-loading-screen" data-testid="loading-screen">
      <div className="nx-loading-inner">
        <div className="nx-loading-pulse-dot" aria-hidden="true" />
        <div className="nx-logo nx-loading-wordmark">NOXEAL</div>
        <div className="nx-loading-phrase" aria-live="polite">{t(PHRASES[idx])}</div>
      </div>
    </div>
  );
}
