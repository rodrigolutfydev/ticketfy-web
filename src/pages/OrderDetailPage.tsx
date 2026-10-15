import { CalendarDays, Timer } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrder, cancelOrder, refundOrder } from "../api/endpoints";
import type { OrderDetails } from "../api/types";
import { ConfirmButton } from "../components/ConfirmDialog";
import StatusBadge from "../components/StatusBadge";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { Link, useParams } from "react-router";
import { Alert, BackLink, ButtonLink, Card } from "../components/ui";
import { formatDate, formatPrice, formatShortDate, shortId } from "../utils/format";
import { cancelledEventNote, orderEvent, orderSteps } from "../utils/orders";
import { isValidId } from "../utils/security";
import NotFoundPage from "./NotFoundPage";
import { usePageTitle } from "../hooks/usePageTitle";
import { errorMessage } from "../api/client";
import { useI18n } from "../i18n/LocaleContext";

// Detalhe de um pedido em qualquer status, com as ações que fazem sentido em cada um.
// Os botões aparecem conforme o status, mas quem decide se a ação é
// permitida é a API (ex.: reembolso fora do prazo devolve erro).
export default function OrderDetailPage() {
  const { t, locale } = useI18n();
  const d = t.buyer.orderDetail;
  usePageTitle(d.pageTitle);
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
  if (isLoading) return <Loading text={d.loading} />;
  if (error) return <ErrorMessage message={errorMessage(error) ?? ""} />;
  const o = order!;
  const actionError = cancel.error ?? refund.error;
  const free = o.totalAmount === 0;
  const hasTransferred = (o.tickets ?? []).some((t) => t.transferred);
  const event = orderEvent(o);
  const note = cancelledEventNote(o);

  return (
    <div>
      <BackLink to="/orders">{d.myOrders}</BackLink>

      {o.status === "EXPIRED" && (
        <section className="flex flex-col items-center gap-[18px] py-10 text-center" aria-labelledby="reserva-expirada">
          <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-accent-soft text-accent-text shadow-[0_0_0_10px_color-mix(in_srgb,var(--accent)_6%,transparent)]">
            <Timer size={40} strokeWidth={2} aria-hidden />
          </span>
          <p className="eyebrow">{t.look.expired.eyebrow}</p>
          <h2 id="reserva-expirada" className="max-w-[760px] text-[clamp(1.875rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink">
            {t.look.expired.title}
          </h2>
          <p className="max-w-[520px] text-[1.0625rem] text-muted">{t.look.expired.text}</p>
          <ButtonLink to="/" size="lg">
            {t.common.seeEvents}
          </ButtonLink>
        </section>
      )}

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{d.receipt}</p>
          <h1 className="tabular mt-2 text-[clamp(1.875rem,3.4vw,2.75rem)] font-extrabold tracking-[-0.045em] text-ink">{d.title(shortId(o.id))}</h1>
          {o.createdAt && <p className="mt-1 text-muted">{d.createdAt(formatShortDate(o.createdAt, locale))}</p>}
          {event && (
            <div className="mt-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                <CalendarDays size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{d.event}</p>
                <Link to={`/events/${event.id}`} className="font-bold text-ink underline-offset-4 hover:text-accent-text hover:underline" data-testid="order-event">
                  {event.name}
                </Link>
                {event.startsAt && (
                  <p className="tabular text-sm text-muted">
                    <time dateTime={event.startsAt}>{formatDate(event.startsAt, locale)}</time>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <StatusBadge status={o.status} />
      </div>

      {o.eventCancelled && (
        <div className="mt-6">
          <Alert type="info">
            {d.eventCancelled}
            {note && d.eventCancelledNotes[note]}
          </Alert>
        </div>
      )}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card>
        {/* overflow-x-auto: no celular, a tabela rola de lado em vez de quebrar a página. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 font-medium">{d.lot}</th>
                <th className="py-2 text-right font-medium">{d.price}</th>
                <th className="py-2 text-right font-medium">{d.quantity}</th>
                <th className="py-2 text-right font-medium">{d.subtotal}</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {o.items.map((item) => (
                <tr key={item.ticketTypeId} className="border-b border-line">
                  <td className="py-3 font-medium">{item.ticketTypeName}</td>
                  <td className="py-3 text-right">{formatPrice(item.unitPrice, locale)}</td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right">{formatPrice(item.subtotal, locale)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {o.couponCode && (
                <>
                  <tr>
                    <td colSpan={3} className="pt-4 text-right text-muted">
                      {d.subtotal}
                    </td>
                    <td className="pt-4 text-right text-ink">{formatPrice(o.subtotalAmount, locale)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="pt-2 text-right text-muted">
                      {d.discount} <span className="font-semibold text-success">{o.couponCode}</span>
                    </td>
                    <td className="pt-2 text-right text-success">−{formatPrice(o.discountAmount, locale)}</td>
                  </tr>
                </>
              )}
              <tr>
                <td colSpan={3} className="pt-4 text-right font-semibold text-muted">
                  {d.total}
                </td>
                <td className="pt-4 text-right text-xl font-extrabold text-ink">{formatPrice(o.totalAmount, locale)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-4 text-xs text-subtle">{d.frozenPrice}</p>

        {(o.tickets ?? []).length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-ink">{d.tickets}</h2>
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {o.tickets.map((ticket) => (
                <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{ticket.ticketTypeName}</p>
                    {ticket.transferred ? (
                      <p className="text-xs text-muted">{d.transferredHint}</p>
                    ) : (
                      <p className="tabular font-mono text-xs tracking-[0.12em] text-muted">{ticket.code}</p>
                    )}
                  </div>
                  {ticket.transferred ? (
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-muted">{d.transferred}</span>
                  ) : (
                    <StatusBadge status={ticket.status} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {actionError && <Alert>{errorMessage(actionError)}</Alert>}
          {refund.isSuccess && <Alert type="success">{free ? d.ticketsCancelled : d.refunded}</Alert>}
          {o.status === "EXPIRED" && <Alert type="info">{d.expired}</Alert>}
          {o.status === "PAID" && !o.eventCancelled && hasTransferred && (
            <Alert type="info">{d.hasTransferred}</Alert>
          )}

          <div className="flex flex-wrap gap-3">
            {o.status === "PENDING" && (
              <>
                {!o.eventCancelled && <ButtonLink to={`/orders/${o.id}/payment`}>{d.goToPayment}</ButtonLink>}
                <ConfirmButton
                  title={d.cancelTitle}
                  description={d.cancelText}
                  confirmLabel={d.cancelOrder}
                  cancelLabel={d.keepOrder}
                  danger
                  loading={cancel.isPending}
                  onConfirm={() => cancel.mutate()}
                >
                  {d.cancelOrder}
                </ConfirmButton>
              </>
            )}
            {o.status === "PAID" && (
              <>
                <ButtonLink to="/tickets">{d.seeTickets}</ButtonLink>
                {!o.eventCancelled && !hasTransferred && (
                  <ConfirmButton
                    title={free ? d.cancelTicketsTitle : d.refundTitle}
                    description={d.refundText(o.items.reduce((s, i) => s + i.quantity, 0))}
                    confirmLabel={free ? d.cancelTickets : d.refund}
                    danger
                    loading={refund.isPending}
                    onConfirm={() => refund.mutate()}
                  >
                    {free ? d.cancelTickets : d.refund}
                  </ConfirmButton>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
      <aside className="tf-panel self-start p-6">
        <h2 className="text-lg font-semibold text-ink">{d.progress}</h2>
        <StatusTrack order={o} />
      </aside>
      </div>
    </div>
  );
}

// Linha do tempo vertical do pedido: cada etapa com bolinha e traço até a próxima.
function StatusTrack({ order }: { order: OrderDetails }) {
  const { t, locale } = useI18n();
  const s = t.buyer.orderDetail.steps;
  const steps = orderSteps(order);
  return (
    <ol className="mt-5" aria-label={t.buyer.orderDetail.progressLabel}>
      {steps.map((step, index) => {
        const dot = !step.done ? "border-2 border-line-strong bg-surface" : step.tone === "danger" ? "bg-danger" : step.tone === "muted" ? "bg-subtle" : "bg-accent";
        return (
          <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
            {index < steps.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-line-strong" aria-hidden />}
            <span className={`relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full ${dot}`} aria-hidden />
            <div>
              <p className={`text-sm font-semibold ${step.done ? "text-ink" : "text-subtle"}`}>{s[step.key]}</p>
              {index === 0 && order.createdAt && <p className="text-xs text-muted">{formatShortDate(order.createdAt, locale)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
