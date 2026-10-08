import { useQuery } from "@tanstack/react-query";
import { getEventDashboard } from "../../../api/endpoints";
import type { EventDashboard } from "../../../api/types";
import { ErrorMessage } from "../../../components/StateMessage";
import { Skeleton } from "../../../components/ui";
import { formatInt, formatMaybePrice, formatPercent, formatPrice, formatShortDate } from "../../../utils/format";
import SalesChart from "./SalesChart";
import { ORDER_STATUS_META } from "./statusMeta";

// Aba "Visão geral" da gestão do evento: tudo vem de GET /events/{id}/dashboard,
// já calculado pela API (receita só de pedidos pagos, com o preço congelado).
export default function EventOverview({ eventId }: { eventId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["event-dashboard", eventId],
    queryFn: () => getEventDashboard(eventId),
    refetchInterval: 60_000, // atualiza sozinho a cada minuto enquanto a aba está aberta
  });

  if (isLoading) return <OverviewSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;
  const d = data!;
  const t = d.totals;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Receita bruta" value={formatPrice(t.revenue)} hint="Só pedidos pagos, no preço da compra" />
        <Kpi label="Descontos" value={formatPrice(t.discounts)} hint="Cupons usados em pedidos pagos" />
        <Kpi label="Taxa da plataforma" value={formatPrice(t.platformFee)} hint="Calculada sobre o valor pago" />
        <Kpi label="Receita líquida" value={formatPrice(t.netRevenue)} hint="Bruto menos descontos e taxa" accent />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Ingressos vendidos" value={formatInt(t.ticketsSold)} hint={`${formatPercent(t.percentSold)} de ${formatInt(t.capacity)}`} progress={t.percentSold} />
        <Kpi label="Reservados agora" value={formatInt(t.ticketsReserved)} hint={`${formatInt(t.remaining)} livres para venda`} />
        <Kpi label="Ticket médio por pedido" value={formatMaybePrice(t.averageOrderValue)} />
        <Kpi label="Preço médio por ingresso" value={formatMaybePrice(t.averageTicketPrice)} />
        <Kpi label="Pedidos pagos" value={formatInt(t.paidOrders)} hint={`${formatInt(d.ordersByStatus.find((r) => r.status === "PENDING")?.orders ?? 0)} aguardando pagamento`} />
      </div>

      <section className="elevated rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Vendas líquidas por dia</h2>
            <p className="text-sm text-muted">Pedidos pagos no dia do pagamento, sem os reembolsados.</p>
          </div>
          <Legend />
        </div>
        <div className="mt-5">
          {d.dailySales.length === 0 ? (
            <p className="rounded-xl bg-raised p-8 text-center text-sm text-muted">Nenhuma venda paga ainda.</p>
          ) : (
            <SalesChart data={d.dailySales} />
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <LotPerformance lots={d.ticketTypes} />
        <div className="space-y-6">
          {d.coupons.length > 0 && <CouponUsage coupons={d.coupons} />}
          <OrdersByStatus rows={d.ordersByStatus} />
          <Attendance checkIn={d.checkIn} />
        </div>
      </div>

      <p className="text-xs text-subtle">
        Atualizado em {formatShortDate(d.generatedAt)} · datas no fuso {d.timeZone}
      </p>
    </div>
  );
}

function Kpi({ label, value, hint, accent, progress }: { label: string; value: string; hint?: string; accent?: boolean; progress?: number | null }) {
  return (
    <div className="elevated rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`font-display tabular mt-2 text-3xl font-semibold tracking-tight ${accent ? "text-accent-text" : "text-ink"}`}>{value}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden>
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, progress ?? 0)}%` }} />
        </div>
      )}
      {hint && <p className="mt-2 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-accent/70" aria-hidden /> Ingressos
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full bg-ink" aria-hidden /> Receita
      </span>
    </div>
  );
}

function LotPerformance({ lots }: { lots: EventDashboard["ticketTypes"] }) {
  return (
    <section className="elevated rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Desempenho por lote</h2>
      {lots.length === 0 && <p className="mt-4 text-sm text-muted">Nenhum lote cadastrado.</p>}
      <ul className="mt-5 space-y-5">
        {lots.map((lot) => {
          const pct = (n: number) => (lot.quantityTotal > 0 ? (n / lot.quantityTotal) * 100 : 0);
          return (
            <li key={lot.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-ink">
                  {lot.name} <span className="tabular text-sm font-normal text-muted">· {formatPrice(lot.price)}</span>
                </p>
                <p className="tabular text-sm font-semibold text-ink">{formatPrice(lot.revenue)}</p>
              </div>
              {/* Barra empilhada: vendido, reservado e livre, proporcionais ao total do lote. */}
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-raised" role="img" aria-label={`${lot.sold} vendidos, ${lot.reserved} reservados, ${lot.remaining} livres de ${lot.quantityTotal}`}>
                <div className="bg-accent" style={{ width: `${pct(lot.sold)}%` }} />
                <div className="bg-warning/80" style={{ width: `${pct(lot.reserved)}%` }} />
              </div>
              <p className="tabular mt-1.5 text-xs text-muted">
                {formatInt(lot.sold)} vendidos · {formatInt(lot.reserved)} reservados · {formatInt(lot.remaining)} livres de {formatInt(lot.quantityTotal)} ({formatPercent(lot.percentSold)})
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CouponUsage({ coupons }: { coupons: EventDashboard["coupons"] }) {
  return (
    <section className="elevated rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Cupons</h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-2 font-medium">Código</th>
            <th className="pb-2 text-right font-medium">Usos</th>
            <th className="pb-2 text-right font-medium">Pagos</th>
            <th className="pb-2 text-right font-medium">Desconto</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => (
            <tr key={coupon.id} className={`border-t border-line ${coupon.active ? "" : "opacity-60"}`}>
              <td className="py-2.5 font-mono font-semibold text-ink">{coupon.code}</td>
              <td className="tabular py-2.5 text-right text-muted">
                {formatInt(coupon.uses)}
                {coupon.maxUses !== null && ` / ${formatInt(coupon.maxUses)}`}
              </td>
              <td className="tabular py-2.5 text-right text-muted">{formatInt(coupon.paidOrders)}</td>
              <td className="tabular py-2.5 text-right font-semibold text-ink">{formatPrice(coupon.discountTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function OrdersByStatus({ rows }: { rows: EventDashboard["ordersByStatus"] }) {
  return (
    <section className="elevated rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Pedidos por status</h2>
      <table className="mt-4 w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>Status</th>
            <th>Pedidos</th>
            <th>Ingressos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.status} className="border-b border-line last:border-0">
              <td className="py-2.5">
                <span className="flex items-center gap-2 text-ink">
                  <span className={`h-2 w-2 rounded-full ${ORDER_STATUS_META[row.status].dot}`} aria-hidden />
                  {ORDER_STATUS_META[row.status].label}
                </span>
              </td>
              <td className="tabular py-2.5 text-right font-semibold text-ink">{formatInt(row.orders)}</td>
              <td className="tabular w-28 py-2.5 text-right text-muted">{formatInt(row.tickets)} ingr.</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// Anel de comparecimento: check-ins feitos sobre ingressos emitidos.
function Attendance({ checkIn }: { checkIn: EventDashboard["checkIn"] }) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const rate = checkIn.attendanceRate ?? 0;
  return (
    <section className="elevated flex items-center gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0 -rotate-90" aria-hidden>
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="9" className="stroke-raised" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          className="stroke-success"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(rate, 100) / 100)}
        />
      </svg>
      <div>
        <h2 className="text-lg font-semibold text-ink">Comparecimento</h2>
        <p className="font-display tabular text-2xl font-semibold text-ink">{formatPercent(checkIn.attendanceRate)}</p>
        <p className="text-xs text-muted">
          {formatInt(checkIn.checkedIn)} check-ins de {formatInt(checkIn.issued)} ingressos emitidos
        </p>
      </div>
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
