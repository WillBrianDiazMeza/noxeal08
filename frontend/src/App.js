import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

function App() {
  return (
    <div className="App">
      <HelmetProvider>
        <AuthProvider>
          <Toaster position="bottom-right" richColors closeButton />
          <BrowserRouter>
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
            <Route path="/contacto" element={
              <Static title="Contacto" body={[
                "Para colaboraciones editoriales, prensa o sugerencias de temas: hola@noxeal.com.",
                "Respondemos en menos de 48 horas hábiles. Si tu mensaje es sobre un artículo específico, incluye el enlace.",
              ]} />
            } />
            <Route path="/privacidad" element={
              <Static title="Política de privacidad" body={[
                "En Noxeal solo guardamos los datos estrictamente necesarios para que el servicio funcione: tu correo si te suscribes a la newsletter, y tu cuenta si decides registrarte.",
                "No vendemos datos a terceros. No usamos cookies de seguimiento de redes publicitarias. Si quieres ejercer tus derechos de acceso, rectificación o eliminación, escríbenos.",
              ]} />
            } />
            <Route path="/terminos" element={
              <Static title="Términos de uso" body={[
                "Al usar Noxeal aceptas leer críticamente. El contenido publicado es trabajo editorial original o debidamente citado y se ofrece con fines informativos.",
                "Está prohibido reproducir artículos completos sin permiso por escrito. Citar fragmentos con atribución y enlace está expresamente permitido.",
              ]} />
            } />
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
