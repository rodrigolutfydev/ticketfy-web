import { useQuery } from "@tanstack/react-query";
import { ApiError } from "../api/client";
import { getMe } from "../api/endpoints";
import type { EventDetails } from "../api/types";
import { useAuth } from "./AuthContext";

// Quem está logado, direto da API. O papel vem do banco a cada consulta,
// então ninguém vira organizador editando algo no navegador.
// Hook = função que começa com "use" e pode usar outros hooks do React.
export function useMe() {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: isAuthenticated, // deslogado não chama a API
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const me = query.data ?? null;
  // 404 ou 405: a rota GET /users/me ainda não existe na API.
  const endpointMissing = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 405);

  return {
    me,
    isLoading: isAuthenticated && query.isLoading,
    error: query.error,
    endpointMissing,
    isOrganizer: me?.role === "ORGANIZER" || me?.role === "ADMIN",
    isAdmin: me?.role === "ADMIN",
  };
}

// Pode gerenciar o evento: é ADMIN ou é o organizador dono dele.
// Sem o organizerId na resposta da API, a resposta é "não": nada de adivinhar.
// (Isto só decide o que MOSTRAR. A API confere de novo em cada ação.)
export function canManage(event: EventDetails, me: { id: string; role: string } | null) {
  if (!me) return false;
  if (me.role === "ADMIN") return true;
  return Boolean(event.organizerId) && event.organizerId === me.id;
}
