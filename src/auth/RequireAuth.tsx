import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

// Guarda de rota: sem login, manda para /login e guarda de onde veio,
// para voltar depois. É só conveniência de navegação: esconder uma tela
// não protege nada. A proteção real está na API, que recusa (401/403)
// qualquer requisição sem token válido ou sem permissão.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}
