import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, CircleAlert } from "lucide-react";
import { getOrder } from "../api/endpoints";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { ButtonLink } from "../components/ui";
import { formatPrice, plural, shortId } from "../utils/format";
import { isValidId } from "../utils/security";
import NotFoundPage from "./NotFoundPage";
import { usePageTitle } from "../hooks/usePageTitle";

export default function OrderConfirmationPage() {
  usePageTitle("Pedido confirmado");
  const { id = "" } = useParams();
  const validId = isValidId(id);
  const { data: order, isLoading, error } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id), enabled: validId });

  if (!validId) return <NotFoundPage />;
  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={error.message} />;
  const o = order!;
  const paid = o.status === "PAID";
  const totalTickets = o.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="mx-auto max-w-md pt-4 text-center">
      {paid ? <TicketOut /> : (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-raised text-muted">
          <CircleAlert size={32} aria-hidden />
        </div>
      )}

      {paid && <p className="mt-8 inline-block rounded-md bg-success/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-success">PAGAMENTO APROVADO</p>}
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">{paid ? "Seu lugar está garantido" : "Este pedido não está pago"}</h1>
      <p className="mt-3 text-muted">
        {paid ? `${plural(totalTickets, "ingresso emitido", "ingressos emitidos")}. Eles já estão na sua conta, com QR code para a entrada.` : "Abra o pedido para ver o que aconteceu com ele."}
      </p>

      <div className="mt-8 rounded-xl border border-line bg-surface px-4 py-4">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-subtle">NÚMERO DO PEDIDO</p>
        <p className="tabular mt-1 text-lg font-bold text-ink">
          #{shortId(o.id)} · {formatPrice(o.totalAmount)}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {paid ? (
          <ButtonLink to="/tickets" size="lg" className="w-full">
            Ver meus ingressos <ArrowRight size={17} aria-hidden />
          </ButtonLink>
        ) : (
          <ButtonLink to={`/orders/${o.id}`} size="lg" className="w-full">
            Ver pedido
          </ButtonLink>
        )}
        <div className="flex justify-center gap-6 text-sm font-semibold text-muted">
          {paid && (
            <Link to={`/orders/${o.id}`} className="hover:text-ink">
              Detalhes do pedido
            </Link>
          )}
          <Link to="/" className="hover:text-ink">
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

// Celebração contida: o ingresso "saindo" da fenda, com o visto de aprovado.
function TicketOut() {
  return (
    <div className="relative mx-auto h-40 w-56" aria-hidden>
      <div className="absolute inset-x-0 bottom-0 h-16 rounded-xl border border-line bg-surface" />
      <div className="animate-ticket-out absolute bottom-8 left-1/2 flex h-32 w-28 -translate-x-1/2 rotate-[-4deg] flex-col items-center justify-center rounded-lg bg-[#f4efe6] shadow-xl">
        <Check size={22} strokeWidth={3} className="text-[#12754a]" />
        <span className="font-display mt-2 text-sm font-bold leading-tight text-[#12161c]">INGRESSO</span>
        <span className="font-display text-sm font-bold leading-tight text-[#12161c]">EMITIDO</span>
      </div>
      <div className="absolute inset-x-6 bottom-12 h-1.5 rounded-full bg-canvas" />
    </div>
  );
}
