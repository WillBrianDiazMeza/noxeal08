import "@/App.css";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdSenseLoader from "@/components/AdSenseLoader";
import GAnalytics from "@/components/GAnalytics";
import Home from "@/pages/Home";
import Articulo from "@/pages/Articulo";
import Static from "@/pages/Static";
import TrendingTicker from "@/components/TrendingTicker";
import LoadingScreen from "@/components/LoadingScreen";
import { About, Privacy, Terms, Cookies, Disclaimer, Contact, Editorial, TransparencyAI, Corrections } from "@/pages/Legal";

// Code-split below-the-fold / admin routes — they don't load until the user navigates
const Explorar = lazy(() => import("@/pages/Explorar"));
const Tendencias = lazy(() => import("@/pages/Tendencias"));
const Categorias = lazy(() => import("@/pages/Categorias"));
const Buscar = lazy(() => import("@/pages/Buscar"));
const Entrar = lazy(() => import("@/pages/Entrar"));
const Suscribirse = lazy(() => import("@/pages/Suscribirse"));
const Admin = lazy(() => import("@/pages/Admin"));
const ProtectedAdmin = lazy(() => import("@/components/ProtectedAdmin"));

const PageFallback = () => <LoadingScreen />;

function App() {
  return (
    <div className="App">
      <HelmetProvider>
        <AuthProvider>
          <Toaster position="bottom-right" richColors closeButton />
          <BrowserRouter>
          <AdSenseLoader />
          <GAnalytics />
          <Header />
          <TrendingTicker />
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explorar" element={<Explorar />} />
            <Route path="/tendencias" element={<Tendencias />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/buscar" element={<Buscar />} />
            <Route path="/articulo/:slug" element={<Articulo />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/suscribirse" element={<Suscribirse />} />
            <Route path="/admin" element={<ProtectedAdmin><Admin /></ProtectedAdmin>} />

            {/* Legal pages — EN and ES routes both supported */}
            <Route path="/about" element={<About />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/privacidad" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/terminos" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/aviso" element={<Disclaimer />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/contacto" element={<Contact />} />

            {/* Editorial transparency pages (NEW) */}
            <Route path="/editorial" element={<Editorial />} />
            <Route path="/transparencia-ia" element={<TransparencyAI />} />
            <Route path="/transparencia" element={<TransparencyAI />} />
            <Route path="/correcciones" element={<Corrections />} />
            <Route path="/corrections" element={<Corrections />} />

            <Route path="*" element={
              <Static title="Página no encontrada" body={["La URL que buscas no existe. Vuelve al inicio o explora el archivo."]} />
            } />
          </Routes>
          </Suspense>
          <Footer />
          </BrowserRouter>
        </AuthProvider>
      </HelmetProvider>
    </div>
  );
}

export default App;
