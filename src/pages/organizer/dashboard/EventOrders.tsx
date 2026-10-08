import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Receipt, Search } from "lucide-react";
import { listEventOrders } from "../../../api/endpoints";
import type { OrderStatus } from "../../../api/types";
import Pagination from "../../../components/Pagination";
import StatusBadge from "../../../components/StatusBadge";
import { Empty, ErrorMessage } from "../../../components/StateMessage";
import { Button, Input, Select, Skeleton } from "../../../components/ui";
import { formatPrice, formatShortDate, shortId } from "../../../utils/format";
import { ORDER_STATUS_META } from "./statusMeta";

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "CANCELLED", "EXPIRED", "REFUNDED"];

// Aba "Pedidos": GET /events/{id}/orders. Cada linha mostra só os itens deste
// evento (um pedido pode ter ingressos de outros eventos, que não aparecem).
export default function EventOrders({ eventId }: { eventId: string }) {
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
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar comprador</span>
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} maxLength={100} placeholder="Nome ou e-mail do comprador" className="pl-10" />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Status</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}>
            <option value="">Todos os status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_META[s].label}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {isLoading && <Skeleton className="h-64 rounded-2xl" />}
      {error && <ErrorMessage message={error.message} />}
      {data && data.content.length === 0 && (
        <Empty icon={<Receipt size={22} />} title={q || status ? "Nenhum pedido com esses filtros" : "Nenhum pedido ainda"} hint={q || status ? "Tente outro nome ou outro status." : "Os pedidos aparecem aqui assim que alguém reservar ingressos."} />
      )}

      {data && data.content.length > 0 && (
        <div className={`elevated overflow-x-auto rounded-2xl border border-line bg-surface transition-opacity ${isFetching ? "opacity-70" : ""}`}>
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-3 py-3 font-medium">Comprador</th>
                <th className="px-3 py-3 font-medium">Criado</th>
                <th className="px-3 py-3 font-medium">Pago</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 text-right font-medium">Total</th>
                <th className="w-12 px-3 py-3">
                  <span className="sr-only">Itens</span>
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
                      <td className="tabular px-3 py-3.5 text-muted">{formatShortDate(order.createdAt)}</td>
                      <td className="tabular px-3 py-3.5 text-muted">{order.paidAt ? formatShortDate(order.paidAt) : "—"}</td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="tabular px-3 py-3.5 text-right font-semibold text-ink">{formatPrice(order.total)}</td>
                      <td className="px-3 py-3.5">
                        <button
                          type="button"
                          onClick={() => setOpen(expanded ? null : order.orderId)}
                          aria-expanded={expanded}
                          aria-label={`${expanded ? "Ocultar" : "Ver"} ${tickets} ingresso(s) do pedido`}
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
                                  {item.quantity}× {item.ticketTypeName} <span className="text-muted">a {formatPrice(item.unitPrice)}</span>
                                </span>
                                <span className="font-semibold text-ink">{formatPrice(item.subtotal)}</span>
                              </li>
                            ))}
                            {order.couponCode && (
                              <li className="tabular flex justify-between gap-4 text-sm">
                                <span className="text-muted">
                                  Cupom <span className="font-mono font-semibold text-ink">{order.couponCode}</span>
                                </span>
                                <span className="font-semibold text-success">−{formatPrice(order.discount)}</span>
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
      {data && data.content.length > 0 && <p className="text-xs text-subtle">Totais só com os ingressos deste evento, no preço pago na compra.</p>}
    </div>
  );
}
