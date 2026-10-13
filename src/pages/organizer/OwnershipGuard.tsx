import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import type { EventDetails } from "../../api/types";
import { canManage, useMe } from "../../auth/useMe";
import BackendNotice from "../../components/BackendNotice";
import { useI18n } from "../../i18n/LocaleContext";
import { ButtonLink, Card } from "../../components/ui";

// Só mostra os controles se o evento for do usuário logado (ou se ele for ADMIN).
// A API confere de novo em cada ação (autorização por propriedade);
// isto aqui evita mostrar botões que só dariam erro 403.
export default function OwnershipGuard({ event, children }: { event: EventDetails; children: ReactNode }) {
  const { me } = useMe();
  const { t } = useI18n();
  const g = t.organizer.guard;

  if (canManage(event, me)) return <>{children}</>;

  if (!event.organizerId && me?.role !== "ADMIN") {
    return (
      <BackendNotice title={g.ownerMissingTitle}>
        <p>{g.ownerMissingText}</p>
      </BackendNotice>
    );
  }

  return (
    <Card className="text-center">
      <Lock size={28} className="mx-auto text-subtle" aria-hidden />
      <p className="mt-3 font-bold text-ink">{g.notYoursTitle}</p>
      <p className="mt-1 text-sm text-muted">{g.notYoursText}</p>
      <ButtonLink to="/organizer/events" variant="secondary" className="mt-5">
        {g.seeMyEvents}
      </ButtonLink>
    </Card>
  );
}
