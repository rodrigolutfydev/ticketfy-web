import { TicketX } from "lucide-react";
import { ButtonLink } from "../components/ui";
import { usePageTitle } from "../hooks/usePageTitle";

export default function NotFoundPage() {
  usePageTitle("Página não encontrada");
  return (
    <div className="py-24 text-center">
      <TicketX size={48} className="mx-auto text-accent-text" aria-hidden />
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">Página não encontrada</h1>
      <p className="mt-2 text-muted">O endereço pode estar errado ou o conteúdo foi removido.</p>
      <ButtonLink to="/" className="mt-8">
        Ver eventos
      </ButtonLink>
    </div>
  );
}
