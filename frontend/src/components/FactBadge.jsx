import { Check, Compass, Quote, Search, AlertTriangle, BookOpen } from "lucide-react";
import { getFactLevel } from "@/lib/factLevels";

const ICONS = {
  check: Check,
  compass: Compass,
  quote: Quote,
  search: Search,
  alert: AlertTriangle,
  book: BookOpen,
};

export default function FactBadge({ level = "analysis", size = "sm" }) {
  const fl = getFactLevel(level);
  const Icon = ICONS[fl.icon] || Compass;
  const isSmall = size === "sm";
  return (
    <span
      data-testid={`fact-badge-${fl.key}`}
      className="inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide"
      style={{
        backgroundColor: fl.bg,
        color: fl.text,
        border: `1px solid ${fl.border}`,
        padding: isSmall ? "3px 10px 3px 8px" : "5px 14px 5px 11px",
        fontSize: isSmall ? "11px" : "13px",
        fontStyle: fl.italic ? "italic" : "normal",
        letterSpacing: "0.01em",
      }}
    >
      <Icon size={isSmall ? 11 : 13} strokeWidth={2} style={{ color: fl.dotColor }} />
      <span style={{ fontWeight: fl.premium ? 600 : 500 }}>
        {fl.label}
      </span>
    </span>
  );
}
