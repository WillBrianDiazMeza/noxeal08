import { useEffect, useRef, useState } from "react";

/**
 * Animated counter that smoothly tweens between value changes.
 * Used to make stats feel alive when polled values update.
 */
export default function LiveCounter({ value, duration = 900, formatter, className, testid }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    fromRef.current = display;
    startRef.current = performance.now();
    const target = value;
    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;
    const step = (t) => {
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(from + delta * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatted = formatter ? formatter(display) : display.toLocaleString("es-ES");
  return <span className={className} data-testid={testid}>{formatted}</span>;
}
