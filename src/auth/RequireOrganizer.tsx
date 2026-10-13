import type { ReactNode } from "react";
import { errorMessage } from "../api/client";
import BackendNotice from "../components/BackendNotice";
import { useI18n } from "../i18n/LocaleContext";
import BecomeOrganizer from "../components/BecomeOrganizer";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { Card } from "../components/ui";
import { useMe } from "./useMe";

// Só deixa passar quem a API diz que é ORGANIZER ou ADMIN.
// Quem não é vê o convite para virar organizador.
export default function RequireOrganizer({ children }: { children: ReactNode }) {
  const { isLoading, isOrganizer, endpointMissing, error } = useMe();
  const { t } = useI18n();
  const g = t.organizer.guard;

  if (isLoading) return <Loading />;

  if (endpointMissing) {
    return (
      <BackendNotice title={g.meMissingTitle}>
        <p>{g.meMissingText}</p>
      </BackendNotice>
    );
  }
  if (error) return <ErrorMessage message={errorMessage(error) ?? ""} />;

  if (!isOrganizer) {
    return (
      <Card className="mx-auto max-w-xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{g.inviteTitle}</h1>
        <p className="mb-6 mt-2 text-muted">{g.inviteText}</p>
        <BecomeOrganizer />
      </Card>
    );
  }
  return <>{children}</>;
}
