import { useEffect, useRef, useState } from "react";

/**
 * Defers rendering of below-the-fold content until it enters the viewport.
 * Improves LCP and perceived performance: home above-the-fold finishes painting
 * before heavy sections (debate, viral, latest) mount.
 */
export default function LazySection({ children, rootMargin = "300px", minHeight = 0, testId }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={ref}
      className={`nx-lazy-section ${visible ? "is-visible" : ""}`}
      style={{ minHeight: visible ? undefined : minHeight }}
      data-testid={testId}
    >
      {visible ? children : null}
    </div>
  );
}
