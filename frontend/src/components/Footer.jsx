import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Instagram, Send } from "lucide-react";
import { api } from "@/lib/api";

export default function Footer() {
  const [cfg, setCfg] = useState({ contact_email: "hola@noxeal.com", social: {} });
  useEffect(() => {
    api.get("/public-config").then(({ data }) => setCfg(data)).catch(() => {});
  }, []);

  const socialItems = [
    { key: "instagram", label: "Instagram", url: cfg.social?.instagram, icon: Instagram },
    { key: "x", label: "X / Twitter", url: cfg.social?.x, icon: TwitterX },
    { key: "tiktok", label: "TikTok", url: cfg.social?.tiktok, icon: TikTokGlyph },
    { key: "youtube", label: "YouTube", url: cfg.social?.youtube, icon: YouTubeGlyph },
  ].filter((s) => s.url);

  return (
    <footer className="bg-[#0d0d0f] text-white mt-24" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="nx-logo mb-4" style={{ color: "#fff" }}>NOXEAL</div>
          <p className="text-[15px] text-white/60 leading-relaxed max-w-md mb-6">
            Periodismo lento sobre la cultura digital. Transformamos tendencias, historias virales y
            temas complejos en contenido claro, verificable e inteligente.
          </p>
          <a
            href={`mailto:${cfg.contact_email}`}
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
            data-testid="footer-contact-email"
          >
            <Mail size={14} /> {cfg.contact_email}
          </a>
          <div className="flex gap-2 mt-5">
            {socialItems.map((s) => (
              <a
                key={s.key}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-10 h-10 rounded-full border border-white/15 hover:bg-white hover:text-black transition-colors flex items-center justify-center"
                data-testid={`footer-social-${s.key}`}
              >
                <s.icon size={15} />
              </a>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="label-eyebrow-dark mb-4">Navegar</div>
          <ul className="space-y-2 text-[14px] text-white/70">
            <li><Link to="/" className="hover:text-white" data-testid="footer-link-inicio">Inicio</Link></li>
            <li><Link to="/explorar" className="hover:text-white" data-testid="footer-link-explorar">Explorar</Link></li>
            <li><Link to="/tendencias" className="hover:text-white" data-testid="footer-link-tendencias">Tendencias</Link></li>
            <li><Link to="/categorias" className="hover:text-white" data-testid="footer-link-categorias">Categorías</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-2">
          <div className="label-eyebrow-dark mb-4">Editorial</div>
          <ul className="space-y-2 text-[14px] text-white/70">
            <li><Link to="/editorial" className="hover:text-white" data-testid="footer-link-editorial">Política editorial</Link></li>
            <li><Link to="/transparencia-ia" className="hover:text-white" data-testid="footer-link-transparency">Transparencia IA</Link></li>
            <li><Link to="/correcciones" className="hover:text-white" data-testid="footer-link-corrections">Correcciones</Link></li>
            <li><Link to="/disclaimer" className="hover:text-white" data-testid="footer-link-disclaimer">Aviso editorial</Link></li>
            <li><Link to="/about" className="hover:text-white" data-testid="footer-link-about">Sobre Noxeal</Link></li>
            <li><Link to="/contact" className="hover:text-white" data-testid="footer-link-contacto">Contacto</Link></li>
          </ul>
        </div>
        <div className="lg:col-span-2">
          <div className="label-eyebrow-dark mb-4">Legal</div>
          <ul className="space-y-2 text-[14px] text-white/70">
            <li><Link to="/privacy" className="hover:text-white" data-testid="footer-link-privacidad">Privacidad</Link></li>
            <li><Link to="/cookies" className="hover:text-white" data-testid="footer-link-cookies">Cookies</Link></li>
            <li><Link to="/terms" className="hover:text-white" data-testid="footer-link-terminos">Términos</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <div className="label-eyebrow-dark mb-4">Newsletter</div>
          <p className="text-[14px] text-white/60 mb-4">
            Análisis semanal directo a tu correo. Sin spam.
          </p>
          <Link
            to="/suscribirse"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90"
            data-testid="footer-cta-newsletter"
          >
            Suscribirme <Send size={14} />
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6 flex flex-col md:flex-row md:justify-between text-xs text-white/50 gap-2">
          <span>© {new Date().getFullYear()} Noxeal. Todos los derechos reservados.</span>
          <span>Hecho con criterio editorial.</span>
        </div>
      </div>
    </footer>
  );
}

function TwitterX({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}
function TikTokGlyph({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52V6.73a4.85 4.85 0 0 1-1.84-.04Z"/>
    </svg>
  );
}
function YouTubeGlyph({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}
