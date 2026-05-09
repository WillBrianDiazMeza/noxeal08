import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#fafafa] border-t border-black/5 mt-24" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="nx-logo mb-4">NOXEAL</div>
          <p className="text-[15px] text-[#424245] leading-relaxed max-w-md">
            Periodismo lento sobre la cultura digital. Transformamos tendencias, historias virales y temas
            complejos en contenido claro, verificable e inteligente.
          </p>
        </div>

        <div className="lg:col-span-3">
          <div className="label-eyebrow mb-4">Navegar</div>
          <ul className="space-y-2 text-[14px]">
            <li><Link to="/" className="hover:underline" data-testid="footer-link-inicio">Inicio</Link></li>
            <li><Link to="/explorar" className="hover:underline" data-testid="footer-link-explorar">Explorar</Link></li>
            <li><Link to="/tendencias" className="hover:underline" data-testid="footer-link-tendencias">Tendencias</Link></li>
            <li><Link to="/categorias" className="hover:underline" data-testid="footer-link-categorias">Categorías</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-2">
          <div className="label-eyebrow mb-4">Empresa</div>
          <ul className="space-y-2 text-[14px]">
            <li><Link to="/contacto" className="hover:underline" data-testid="footer-link-contacto">Contacto</Link></li>
            <li><Link to="/privacidad" className="hover:underline" data-testid="footer-link-privacidad">Privacidad</Link></li>
            <li><Link to="/terminos" className="hover:underline" data-testid="footer-link-terminos">Términos</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-2">
          <div className="label-eyebrow mb-4">Síguenos</div>
          <ul className="space-y-2 text-[14px]">
            <li><a href="#" className="hover:underline" data-testid="footer-social-x">X / Twitter</a></li>
            <li><a href="#" className="hover:underline" data-testid="footer-social-instagram">Instagram</a></li>
            <li><a href="#" className="hover:underline" data-testid="footer-social-youtube">YouTube</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6 flex flex-col md:flex-row md:justify-between text-xs text-[#86868b] gap-2">
          <span>© {new Date().getFullYear()} Noxeal. Todos los derechos reservados.</span>
          <span>Hecho con criterio editorial.</span>
        </div>
      </div>
    </footer>
  );
}
