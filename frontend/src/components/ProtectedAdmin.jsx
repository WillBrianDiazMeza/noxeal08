import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedAdmin({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (user === null) return; // still loading
    if (!user || !user.email) {
      navigate("/entrar?next=/admin", { replace: true });
      return;
    }
    if (user.role !== "admin") {
      navigate("/", { replace: true });
      return;
    }
    setReady(true);
  }, [user, navigate]);

  if (!ready) return <div className="py-32 text-center text-[#86868b]">Verificando acceso…</div>;
  return children;
}
