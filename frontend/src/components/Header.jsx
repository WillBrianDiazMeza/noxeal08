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
        {/* Left nav */}
        <nav className="hidden md:flex items-center gap-7" data-testid="primary-nav">
          <NavLink to="/explorar" className={({isActive})=>`nav-link ${isActive?"active":""}`} data-testid="nav-explorar">Explorar</NavLink>
          <NavLink to="/tendencias" className={({isActive})=>`nav-link ${isActive?"active":""}`} data-testid="nav-tendencias">Tendencias</NavLink>
          <NavLink to="/categorias" className={({isActive})=>`nav-link ${isActive?"active":""}`} data-testid="nav-categorias">Categorías</NavLink>
        </nav>

        {/* Center logo */}
        <Link to="/" className="nx-logo" data-testid="site-logo">NOXEAL</Link>

        {/* Right nav */}
        <div className="hidden md:flex items-center gap-5">
          <button
            onClick={() => navigate("/buscar")}
            className="nav-link inline-flex items-center gap-2"
            data-testid="nav-buscar"
            aria-label="Buscar"
          >
            <Search size={16} strokeWidth={1.5} />
            <span>Buscar</span>
          </button>

          {user && user.email ? (
            <div className="flex items-center gap-3">
              {user.role === "admin" && (
                <NavLink to="/admin" className="nav-link inline-flex items-center gap-1 text-xs uppercase tracking-widest" data-testid="nav-admin">
                  Admin
                </NavLink>
              )}
              <span className="text-sm text-[#111] font-medium" data-testid="user-name">{user.name}</span>
              <span className="text-xs text-[#86868b] hidden lg:inline" data-testid="user-email">{user.email}</span>
              <button onClick={logout} className="nav-link inline-flex items-center gap-1" data-testid="nav-logout">
                <LogOut size={15} strokeWidth={1.5} /> Salir
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
            <NavLink to="/explorar" onClick={()=>setMobileOpen(false)} className="nav-link" data-testid="m-nav-explorar">Explorar</NavLink>
            <NavLink to="/tendencias" onClick={()=>setMobileOpen(false)} className="nav-link" data-testid="m-nav-tendencias">Tendencias</NavLink>
            <NavLink to="/categorias" onClick={()=>setMobileOpen(false)} className="nav-link" data-testid="m-nav-categorias">Categorías</NavLink>
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
