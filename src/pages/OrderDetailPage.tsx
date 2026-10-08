import { useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrder, cancelOrder, refundOrder } from "../api/endpoints";
import type { OrderDetails } from "../api/types";
import { ConfirmButton } from "../components/ConfirmDialog";
import StatusBadge from "../components/StatusBadge";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { Alert, BackLink, ButtonLink, Card } from "../components/ui";
import { formatPrice, formatShortDate, shortId } from "../utils/format";
import { isValidId } from "../utils/security";
import NotFoundPage from "./NotFoundPage";
import { usePageTitle } from "../hooks/usePageTitle";

// Detalhe de um pedido em qualquer status, com as ações que fazem sentido em cada um.
// Os botões aparecem conforme o status, mas quem decide se a ação é
// permitida é a API (ex.: reembolso fora do prazo devolve erro).
export default function OrderDetailPage() {
  usePageTitle("Pedido");
  const { id = "" } = useParams();
  const validId = isValidId(id);
  const queryClient = useQueryClient();
  const { data: order, isLoading, error } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id), enabled: validId });

  const afterChange = () => {
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
    queryClient.invalidateQueries({ queryKey: ["ticket-types"] });
  };

  const cancel = useMutation({ mutationFn: () => cancelOrder(id), onSuccess: afterChange });
  const refund = useMutation({ mutationFn: () => refundOrder(id), onSuccess: afterChange });

  if (!validId) return <NotFoundPage />;
  if (isLoading) return <Loading text="Carregando pedido..." />;
  if (error) return <ErrorMessage message={error.message} />;
  const o = order!;
  const actionError = cancel.error ?? refund.error;
  const free = o.totalAmount === 0;
  const hasTransferred = (o.tickets ?? []).some((t) => t.transferred);

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink to="/orders">Meus pedidos</BackLink>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Recibo</p>
          <h1 className="tabular mt-2 text-4xl font-semibold tracking-tight text-ink">Pedido #{shortId(o.id)}</h1>
          {o.createdAt && <p className="mt-1 text-muted">Criado em {formatShortDate(o.createdAt)}</p>}
        </div>
        <StatusBadge status={o.status} />
      </div>

      {o.eventCancelled && (
        <div className="mt-6">
          <Alert type="info">
            O evento deste pedido foi cancelado pelo organizador.
            {o.status === "REFUNDED" && " O valor foi reembolsado e os ingressos foram cancelados."}
            {o.status === "PAID" && " O reembolso está sendo processado."}
            {o.status === "CANCELLED" && " O pedido foi cancelado sem cobrança."}
          </Alert>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
      <Card>
        {/* overflow-x-auto: no celular, a tabela rola de lado em vez de quebrar a página. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 font-medium">Lote</th>
                <th className="py-2 text-right font-medium">Preço</th>
                <th className="py-2 text-right font-medium">Qtd.</th>
                <th className="py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {o.items.map((item) => (
                <tr key={item.ticketTypeId} className="border-b border-line">
                  <td className="py-3 font-medium">{item.ticketTypeName}</td>
                  <td className="py-3 text-right">{formatPrice(item.unitPrice)}</td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right">{formatPrice(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {o.couponCode && (
                <>
                  <tr>
                    <td colSpan={3} className="pt-4 text-right text-muted">
                      Subtotal
                    </td>
                    <td className="pt-4 text-right text-ink">{formatPrice(o.subtotalAmount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="pt-2 text-right text-muted">
                      Desconto <span className="font-semibold text-success">{o.couponCode}</span>
                    </td>
                    <td className="pt-2 text-right text-success">−{formatPrice(o.discountAmount)}</td>
                  </tr>
                </>
              )}
              <tr>
                <td colSpan={3} className="pt-4 text-right font-semibold text-muted">
                  Total
                </td>
                <td className="pt-4 text-right text-xl font-extrabold text-ink">{formatPrice(o.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-4 text-xs text-subtle">O preço de cada lote fica registrado no momento da compra e não muda depois.</p>

        {(o.tickets ?? []).length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-ink">Ingressos</h2>
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {o.tickets.map((ticket) => (
                <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{ticket.ticketTypeName}</p>
                    {ticket.transferred ? (
                      <p className="text-xs text-muted">Transferido para outra pessoa. O código fica só com quem recebeu.</p>
                    ) : (
                      <p className="tabular font-mono text-xs tracking-[0.12em] text-muted">{ticket.code}</p>
                    )}
                  </div>
                  {ticket.transferred ? (
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-muted">Transferido</span>
                  ) : (
                    <StatusBadge status={ticket.status} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {actionError && <Alert>{actionError.message}</Alert>}
          {refund.isSuccess && <Alert type="success">{free ? "Ingressos cancelados." : "Reembolso feito. Os ingressos foram cancelados."}</Alert>}
          {o.status === "EXPIRED" && <Alert type="info">A reserva expirou e os ingressos voltaram à venda.</Alert>}
          {o.status === "PAID" && !o.eventCancelled && hasTransferred && (
            <Alert type="info">Este pedido tem ingresso transferido e não pode mais ser reembolsado.</Alert>
          )}

          <div className="flex flex-wrap gap-3">
            {o.status === "PENDING" && (
              <>
                {!o.eventCancelled && <ButtonLink to={`/orders/${o.id}/payment`}>Ir para o pagamento</ButtonLink>}
                <ConfirmButton
                  title="Cancelar este pedido?"
                  description="Os ingressos reservados voltam à venda."
                  confirmLabel="Cancelar pedido"
                  cancelLabel="Manter pedido"
                  danger
                  loading={cancel.isPending}
                  onConfirm={() => cancel.mutate()}
                >
                  Cancelar pedido
                </ConfirmButton>
              </>
            )}
            {o.status === "PAID" && (
              <>
                <ButtonLink to="/tickets">Ver meus ingressos</ButtonLink>
                {!o.eventCancelled && !hasTransferred && (
                  <ConfirmButton
                    title={free ? "Cancelar os ingressos?" : "Pedir reembolso?"}
                    description={`Os ${o.items.reduce((s, i) => s + i.quantity, 0)} ingresso(s) deste pedido serão cancelados e não poderão mais ser usados na entrada.`}
                    confirmLabel={free ? "Cancelar ingressos" : "Pedir reembolso"}
                    danger
                    loading={refund.isPending}
                    onConfirm={() => refund.mutate()}
                  >
                    {free ? "Cancelar ingressos" : "Pedir reembolso"}
                  </ConfirmButton>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
      <aside className="elevated self-start rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold text-ink">Andamento</h2>
        <StatusTrack order={o} />
      </aside>
      </div>
    </div>
  );
}

// Linha do tempo do pedido: criado -> pago -> (reembolsado), ou o final alternativo.
// Linha do tempo vertical do pedido: cada etapa com bolinha e traço até a próxima.
function StatusTrack({ order }: { order: OrderDetails }) {
  type Step = { label: string; done: boolean; tone?: "danger" | "muted" };
  const created: Step = { label: "Pedido criado", done: true };
  const free = order.totalAmount === 0;
  const steps: Step[] =
    order.status === "PENDING"
      ? [created, { label: "Aguardando pagamento", done: false }, { label: "Ingressos emitidos", done: false }]
      : order.status === "PAID"
        ? [created, { label: free ? "Pedido confirmado" : "Pagamento aprovado", done: true }, { label: "Ingressos emitidos", done: true }]
        : order.status === "REFUNDED"
          ? [created, { label: free ? "Pedido confirmado" : "Pagamento aprovado", done: true }, { label: free ? "Ingressos cancelados" : "Reembolsado, ingressos cancelados", done: true, tone: "muted" }]
          : [created, { label: order.status === "EXPIRED" ? "Reserva expirada" : "Pedido cancelado", done: true, tone: "danger" }];
  return (
    <ol className="mt-5" aria-label="Andamento do pedido">
      {steps.map((step, index) => {
        const dot = !step.done ? "border-2 border-line-strong bg-surface" : step.tone === "danger" ? "bg-danger" : step.tone === "muted" ? "bg-subtle" : "bg-accent";
        return (
          <li key={step.label} className="relative flex gap-3 pb-6 last:pb-0">
            {index < steps.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-line-strong" aria-hidden />}
            <span className={`relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full ${dot}`} aria-hidden />
            <div>
              <p className={`text-sm font-semibold ${step.done ? "text-ink" : "text-subtle"}`}>{step.label}</p>
              {index === 0 && order.createdAt && <p className="text-xs text-muted">{formatShortDate(order.createdAt)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
