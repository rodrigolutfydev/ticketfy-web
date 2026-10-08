import type { ReactNode } from "react";
import BackendNotice, { Code } from "../components/BackendNotice";
import BecomeOrganizer from "../components/BecomeOrganizer";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { Card } from "../components/ui";
import { useMe } from "./useMe";

// Só deixa passar quem a API diz que é ORGANIZER ou ADMIN.
// Quem não é vê o convite para virar organizador.
export default function RequireOrganizer({ children }: { children: ReactNode }) {
  const { isLoading, isOrganizer, endpointMissing, error } = useMe();

  if (isLoading) return <Loading />;

  if (endpointMissing) {
    return (
      <BackendNotice title="A API ainda não informa quem está logado">
        <p>
          A área do organizador depende da rota <Code>GET /users/me</Code>, que devolve <Code>id</Code>, <Code>name</Code>,{" "}
          <Code>email</Code> e <Code>role</Code>. Sem ela, o frontend não sabe se você é organizador.
        </p>
      </BackendNotice>
    );
  }
  if (error) return <ErrorMessage message={error.message} />;

  if (!isOrganizer) {
    return (
      <Card className="mx-auto max-w-xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Venda ingressos com o Ticketfy</h1>
        <p className="mb-6 mt-2 text-muted">A área do organizador é liberada para contas organizadoras.</p>
        <BecomeOrganizer />
      </Card>
    );
  }
  return <>{children}</>;
}
