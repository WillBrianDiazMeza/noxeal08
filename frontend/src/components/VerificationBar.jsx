import { ShieldCheck } from "lucide-react";
import { verificationColor, getFactLevel } from "@/lib/factLevels";

/**
 * Editorial verification confidence indicator. 0-100.
 * Bloomberg/NYT-style transparency layer.
 */
export default function VerificationBar({ level = 0, factLevel = "analysis", compact = false }) {
  const v = Math.max(0, Math.min(100, level || 0));
  const c = verificationColor(v);
  const fl = getFactLevel(factLevel);

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium"
        style={{ color: c.color }}
        data-testid="verification-compact"
      >
        <ShieldCheck size={12} strokeWidth={2} />
        <span className="tabular-nums">{v}%</span>
      </span>
    );
  }

  return (
    <div className="border border-black/10 rounded-2xl p-5" data-testid="verification-bar">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} strokeWidth={1.8} style={{ color: c.color }} />
          <span className="text-sm font-semibold text-[#1d1d1f]">Nivel de verificación</span>
        </div>
        <span className="text-sm font-semibold tabular-nums" style={{ color: c.color }}>
          {v}% <span className="text-[#86868b] font-normal ml-1">({c.label})</span>
        </span>
      </div>
      <div className="relative w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#f5f5f7" }}>
        <div
          className="absolute top-0 left-0 h-full transition-all duration-700 ease-out"
          style={{ width: `${v}%`, backgroundColor: c.color }}
        />
      </div>
      <p className="mt-3 text-xs text-[#6E6E73] leading-relaxed">{fl.description}</p>
    </div>
  );
}
