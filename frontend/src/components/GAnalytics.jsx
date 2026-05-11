import { useEffect } from "react";

/**
 * Loads Google Analytics 4 if REACT_APP_GA_ID is set.
 * Falls back to nothing in dev when env var is missing.
 */
export default function GAnalytics() {
  useEffect(() => {
    const gaId = process.env.REACT_APP_GA_ID;
    if (!gaId) return;
    if (window.__ga_loaded) return;
    window.__ga_loaded = true;

    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(s1);

    const s2 = document.createElement("script");
    s2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', { anonymize_ip: true });
    `;
    document.head.appendChild(s2);
  }, []);
  return null;
}
