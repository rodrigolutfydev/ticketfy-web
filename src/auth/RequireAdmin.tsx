import type { ReactNode } from "react";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { Card } from "../components/ui";
import { useMe } from "./useMe";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoading, isAdmin, error } = useMe();

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Área restrita</h1>
        <p className="mt-2 text-muted">Esta área é exclusiva da equipe de administração do Ticketfy.</p>
      </Card>
    );
  }
  return <>{children}</>;
}
