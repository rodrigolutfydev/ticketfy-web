import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, ScanLine, Layers } from "lucide-react";
import { becomeOrganizer } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Alert, Button } from "./ui";

// Promove a conta a organizador. A API devolve um token novo (com o papel
// ORGANIZER dentro), que substitui o atual; o signIn limpa o cache e o
// perfil (GET /users/me) é buscado de novo.
export default function BecomeOrganizer() {
  const { signIn } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: becomeOrganizer,
    onSuccess: (data) => signIn(data.token),
    onError: (error) => {
      // 409 = a conta já é organizadora: só recarrega o perfil.
      if (error instanceof ApiError && error.status === 409) {
        queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    },
  });

  const perks = [
    { icon: <CalendarPlus size={18} />, text: "Crie eventos com foto, local e horário" },
    { icon: <Layers size={18} />, text: "Cadastre lotes com preço e quantidade" },
    { icon: <ScanLine size={18} />, text: "Valide ingressos na entrada" },
  ];

  return (
    <div className="space-y-5">
      <ul className="space-y-2.5">
        {perks.map((perk) => (
          <li key={perk.text} className="flex items-center gap-3 text-sm text-muted">
            <span className="text-accent-text">{perk.icon}</span>
            {perk.text}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">Qualquer conta pode virar organizadora, sem aprovação.</p>
      <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
        Tornar-me organizador
      </Button>
      {mutation.error && <Alert>{mutation.error.message}</Alert>}
    </div>
  );
}
