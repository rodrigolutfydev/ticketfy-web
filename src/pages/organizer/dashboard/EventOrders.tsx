import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Receipt, Search } from "lucide-react";
import { listEventOrders } from "../../../api/endpoints";
import type { OrderStatus } from "../../../api/types";
import Pagination from "../../../components/Pagination";
import StatusBadge from "../../../components/StatusBadge";
import { Empty, ErrorMessage } from "../../../components/StateMessage";
import { Button, Form, Input, Select, Skeleton } from "../../../components/ui";
import { formatPrice, formatShortDate, shortId } from "../../../utils/format";
import { errorMessage } from "../../../api/client";
import { useI18n } from "../../../i18n/LocaleContext";

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "CANCELLED", "EXPIRED", "REFUNDED"];

// Aba "Pedidos": GET /events/{id}/orders. Cada linha mostra só os itens deste
// evento (um pedido pode ter ingressos de outros eventos, que não aparecem).
export default function EventOrders({ eventId }: { eventId: string }) {
  const { t, locale } = useI18n();
  const o = t.organizer.orders;
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => setPage(0), [status, q]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["event-orders", eventId, { status, q, page }],
    queryFn: () => listEventOrders(eventId, { status: status || undefined, q: q || undefined, page }),
    placeholderData: (previous) => previous,
  });

  function search(e: FormEvent) {
    e.preventDefault();
    setQ(qInput.trim());
  }

  return (
    <div className="space-y-4">
      <Form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{o.searchLabel}</span>
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} maxLength={100} placeholder={o.searchPlaceholder} className="pl-10" />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">{o.status}</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}>
            <option value="">{o.allStatuses}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.labels.orderStatusPlural[s]}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          {o.search}
        </Button>
      </Form>

      {isLoading && <Skeleton className="h-64 rounded-2xl" />}
      {error && <ErrorMessage message={errorMessage(error) ?? ""} />}
      {data && data.content.length === 0 && (
        <Empty icon={<Receipt size={22} />} title={q || status ? o.emptyFilteredTitle : o.emptyTitle} hint={q || status ? o.emptyFilteredHint : o.emptyHint} />
      )}

      {data && data.content.length > 0 && (
        <div className={`tf-panel overflow-x-auto transition-opacity ${isFetching ?"opacity-70" : ""}`}>
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">{o.order}</th>
                <th className="px-3 py-3 font-medium">{o.buyer}</th>
                <th className="px-3 py-3 font-medium">{o.created}</th>
                <th className="px-3 py-3 font-medium">{o.paid}</th>
                <th className="px-3 py-3 font-medium">{o.status}</th>
                <th className="px-3 py-3 text-right font-medium">{o.total}</th>
                <th className="w-12 px-3 py-3">
                  <span className="sr-only">{o.items}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((order) => {
                const expanded = open === order.orderId;
                const tickets = order.items.reduce((sum, i) => sum + i.quantity, 0);
                return (
                  <Fragment key={order.orderId}>
                    <tr className="border-b border-line last:border-0">
                      <td className="tabular px-5 py-3.5 font-semibold text-ink">#{shortId(order.orderId)}</td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium text-ink">{order.buyer.name}</p>
                        <p className="text-xs text-muted">{order.buyer.email}</p>
                      </td>
                      <td className="tabular px-3 py-3.5 text-muted">{formatShortDate(order.createdAt, locale)}</td>
                      <td className="tabular px-3 py-3.5 text-muted">{order.paidAt ? formatShortDate(order.paidAt, locale) : "—"}</td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="tabular px-3 py-3.5 text-right font-semibold text-ink">{formatPrice(order.total, locale)}</td>
                      <td className="px-3 py-3.5">
                        <button
                          type="button"
                          onClick={() => setOpen(expanded ? null : order.orderId)}
                          aria-expanded={expanded}
                          aria-label={o.toggle(expanded, tickets)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
                        >
                          <ChevronDown size={17} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-line bg-raised/40">
                        <td colSpan={7} className="px-5 py-3">
                          <ul className="space-y-1.5">
                            {order.items.map((item) => (
                              <li key={item.ticketTypeId} className="tabular flex justify-between gap-4 text-sm">
                                <span className="text-ink">
                                  {item.quantity}× {item.ticketTypeName} <span className="text-muted">{o.unitPrice(formatPrice(item.unitPrice, locale))}</span>
                                </span>
                                <span className="font-semibold text-ink">{formatPrice(item.subtotal, locale)}</span>
                              </li>
                            ))}
                            {order.couponCode && (
                              <li className="tabular flex justify-between gap-4 text-sm">
                                <span className="text-muted">
                                  {o.coupon} <span className="font-mono font-semibold text-ink">{order.couponCode}</span>
                                </span>
                                <span className="font-semibold text-success">−{formatPrice(order.discount, locale)}</span>
                              </li>
                            )}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page.number} totalPages={data.page.totalPages} onChange={setPage} />}
      {data && data.content.length > 0 && <p className="text-xs text-subtle">{o.note}</p>}
    </div>
  );
}
