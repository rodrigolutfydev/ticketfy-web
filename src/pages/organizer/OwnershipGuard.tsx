import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import type { EventDetails } from "../../api/types";
import { canManage, useMe } from "../../auth/useMe";
import BackendNotice, { Code } from "../../components/BackendNotice";
import { ButtonLink, Card } from "../../components/ui";

// Só mostra os controles se o evento for do usuário logado (ou se ele for ADMIN).
// A API confere de novo em cada ação (autorização por propriedade);
// isto aqui evita mostrar botões que só dariam erro 403.
export default function OwnershipGuard({ event, children }: { event: EventDetails; children: ReactNode }) {
  const { me } = useMe();

  if (canManage(event, me)) return <>{children}</>;

  if (!event.organizerId && me?.role !== "ADMIN") {
    return (
      <BackendNotice title="Não dá para confirmar quem é o dono deste evento">
        <p>
          A resposta de <Code>GET /events/{"{id}"}</Code> precisa trazer o campo <Code>organizerId</Code>. Sem ele, o
          frontend não mostra os controles de gestão para ninguém.
        </p>
      </BackendNotice>
    );
  }

  return (
    <Card className="text-center">
      <Lock size={28} className="mx-auto text-subtle" aria-hidden />
      <p className="mt-3 font-bold text-ink">Este evento não é seu</p>
      <p className="mt-1 text-sm text-muted">Só o organizador que criou o evento pode gerenciá-lo.</p>
      <ButtonLink to="/organizer/events" variant="secondary" className="mt-5">
        Ver meus eventos
      </ButtonLink>
    </Card>
  );
}
