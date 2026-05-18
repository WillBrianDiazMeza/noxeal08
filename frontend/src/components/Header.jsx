import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="nx-header" data-testid="site-header">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-20 flex items-center justify-between gap-6">
        {/* Logo (icon + wordmark) */}
        <Link to="/" className="flex items-center gap-2.5 group" data-testid="site-logo" aria-label="Noxeal — inicio">
          <img
            src="/noxeal-mark.png"
            alt=""
            aria-hidden="true"
            width={26}
            height={26}
            className="transition-transform duration-300 group-hover:scale-105"
            style={{ filter: "drop-shadow(0 0 0 transparent)" }}
          />
          <span className="nx-logo">NOXEAL</span>
        </Link>

        {/* Primary nav (simplified Noxeal IA: Inicio · Tendencias · Historias · Análisis · Explorar) */}
        <nav className="hidden md:flex items-center gap-7" data-testid="primary-nav">
          <NavLink end to="/" className={({isActive})=>`nav-link ${isActive?"active":""}`} data-testid="nav-inicio">Inicio</NavLink>
          <NavLink to="/tendencias" className={({isActive})=>`nav-link ${isActive?"active":""}`} data-testid="nav-tendencias">Tendencias</NavLink>
          <NavLink to="/categorias" className={({isActive})=>`nav-link ${isActive?"active":""}`} data-testid="nav-categorias">Categorías</NavLink>
          <NavLink to="/explorar" className={({isActive})=>`nav-link ${isActive?"active":""}`} data-testid="nav-explorar">Explorar</NavLink>
        </nav>

        {/* Right cluster */}
        <div className="hidden md:flex items-center gap-5">
          <button
            onClick={() => navigate("/buscar")}
            className="nav-link inline-flex items-center gap-2"
            data-testid="nav-buscar"
            aria-label="Buscar"
          >
            <Search size={16} strokeWidth={1.5} />
          </button>

          {user && user.email ? (
            <div className="flex items-center gap-3">
              {user.role === "admin" && (
                <NavLink to="/admin" className="nav-link inline-flex items-center gap-1 text-xs uppercase tracking-widest" data-testid="nav-admin">
                  Admin
                </NavLink>
              )}
              <span className="text-sm text-[#111] font-medium" data-testid="user-name">{user.name}</span>
              <button onClick={logout} className="nav-link inline-flex items-center gap-1" data-testid="nav-logout" aria-label="Salir">
                <LogOut size={15} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <NavLink to="/entrar" className="nav-link inline-flex items-center gap-2" data-testid="nav-entrar">
              <User size={16} strokeWidth={1.5} /> Entrar
            </NavLink>
          )}

          <Link to="/suscribirse" className="btn-primary" style={{ padding: "10px 22px", fontSize: 14 }} data-testid="nav-suscribirse">
            Suscribirse
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden nav-link"
          onClick={() => setMobileOpen(o => !o)}
          data-testid="mobile-menu-toggle"
          aria-label="Menú"
        >
          {mobileOpen ? "Cerrar" : "Menú"}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-black/5 bg-white" data-testid="mobile-menu">
          <div className="px-5 py-4 flex flex-col gap-3">
            <NavLink end to="/" onClick={()=>setMobileOpen(false)} className="nav-link" data-testid="m-nav-inicio">Inicio</NavLink>
            <NavLink to="/tendencias" onClick={()=>setMobileOpen(false)} className="nav-link" data-testid="m-nav-tendencias">Tendencias</NavLink>
            <NavLink to="/categorias" onClick={()=>setMobileOpen(false)} className="nav-link" data-testid="m-nav-categorias">Categorías</NavLink>
            <NavLink to="/explorar" onClick={()=>setMobileOpen(false)} className="nav-link" data-testid="m-nav-explorar">Explorar</NavLink>
            <NavLink to="/buscar" onClick={()=>setMobileOpen(false)} className="nav-link" data-testid="m-nav-buscar">Buscar</NavLink>
            {user && user.email ? (
              <button onClick={()=>{ logout(); setMobileOpen(false); }} className="nav-link text-left" data-testid="m-nav-logout">Salir</button>
            ) : (
              <NavLink to="/entrar" onClick={()=>setMobileOpen(false)} className="nav-link" data-testid="m-nav-entrar">Entrar</NavLink>
            )}
            <Link to="/suscribirse" onClick={()=>setMobileOpen(false)} className="btn-primary mt-2" data-testid="m-nav-suscribirse">Suscribirse</Link>
          </div>
        </div>
      )}
    </header>
  );
}
