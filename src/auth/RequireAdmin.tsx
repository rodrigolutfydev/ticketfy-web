import type { ReactNode } from "react";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { Card } from "../components/ui";
import { useMe } from "./useMe";
import { errorMessage } from "../api/client";
import { useI18n } from "../i18n/LocaleContext";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoading, isAdmin, error } = useMe();
  const { t } = useI18n();

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={errorMessage(error) ?? ""} />;
  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t.admin.guard.title}</h1>
        <p className="mt-2 text-muted">{t.admin.guard.text}</p>
      </Card>
    );
  }
  return <>{children}</>;
}
