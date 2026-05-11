import { useEffect } from "react";

/**
 * Loads Google AdSense script if REACT_APP_ADSENSE_CLIENT_ID is set.
 * Mount once in App (e.g., inside <BrowserRouter>). Does nothing in dev/no-id.
 */
export default function AdSenseLoader() {
  useEffect(() => {
    const clientId = process.env.REACT_APP_ADSENSE_CLIENT_ID;
    if (!clientId) return;
    if (document.querySelector('script[data-ad-client]')) return;
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    s.setAttribute("data-ad-client", clientId);
    document.head.appendChild(s);
  }, []);
  return null;
}
