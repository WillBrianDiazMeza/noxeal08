import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdSenseLoader from "@/components/AdSenseLoader";
import GAnalytics from "@/components/GAnalytics";
import Home from "@/pages/Home";
import Explorar from "@/pages/Explorar";
import Tendencias from "@/pages/Tendencias";
import Categorias from "@/pages/Categorias";
import Articulo from "@/pages/Articulo";
import Buscar from "@/pages/Buscar";
import Entrar from "@/pages/Entrar";
import Suscribirse from "@/pages/Suscribirse";
import Static from "@/pages/Static";
import Admin from "@/pages/Admin";
import ProtectedAdmin from "@/components/ProtectedAdmin";
import { About, Privacy, Terms, Cookies, Disclaimer, Contact } from "@/pages/Legal";

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

            <Route path="*" element={
              <Static title="Página no encontrada" body={["La URL que buscas no existe. Vuelve al inicio o explora el archivo."]} />
            } />
          </Routes>
          <Footer />
          </BrowserRouter>
        </AuthProvider>
      </HelmetProvider>
    </div>
  );
}

export default App;
