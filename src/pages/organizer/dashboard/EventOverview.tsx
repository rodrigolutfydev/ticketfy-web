import { useQuery } from "@tanstack/react-query";
import { getEventDashboard } from "../../../api/endpoints";
import type { EventDashboard } from "../../../api/types";
import { ErrorMessage } from "../../../components/StateMessage";
import { Skeleton } from "../../../components/ui";
import { formatInt, formatMaybePrice, formatPercent, formatPrice, formatShortDate } from "../../../utils/format";
import SalesChart from "./SalesChart";
import { ORDER_STATUS_DOTS } from "./statusMeta";
import { errorMessage } from "../../../api/client";
import { useI18n } from "../../../i18n/LocaleContext";

// Aba "Visão geral" da gestão do evento: tudo vem de GET /events/{id}/dashboard,
// já calculado pela API (receita só de pedidos pagos, com o preço congelado).
export default function EventOverview({ eventId }: { eventId: string }) {
  const { t: m, locale } = useI18n();
  const v = m.organizer.overview;
  const { data, isLoading, error } = useQuery({
    queryKey: ["event-dashboard", eventId],
    queryFn: () => getEventDashboard(eventId),
    refetchInterval: 60_000, // atualiza sozinho a cada minuto enquanto a aba está aberta
  });

  if (isLoading) return <OverviewSkeleton />;
  if (error) return <ErrorMessage message={errorMessage(error) ?? ""} />;
  const d = data!;
  const t = d.totals;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={v.grossRevenue} value={formatPrice(t.revenue, locale)} hint={v.grossRevenueHint} />
        <Kpi label={v.discounts} value={formatPrice(t.discounts, locale)} hint={v.discountsHint} />
        <Kpi label={v.platformFee} value={formatPrice(t.platformFee, locale)} hint={v.platformFeeHint} />
        <Kpi label={v.netRevenue} value={formatPrice(t.netRevenue, locale)} hint={v.netRevenueHint} accent />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label={v.ticketsSold} value={formatInt(t.ticketsSold, locale)} hint={v.soldOf(formatPercent(t.percentSold, locale), formatInt(t.capacity, locale))} progress={t.percentSold} />
        <Kpi label={v.reserved} value={formatInt(t.ticketsReserved, locale)} hint={v.free(formatInt(t.remaining, locale))} />
        <Kpi label={v.averageOrder} value={formatMaybePrice(t.averageOrderValue, locale)} />
        <Kpi label={v.averageTicket} value={formatMaybePrice(t.averageTicketPrice, locale)} />
        <Kpi label={v.paidOrders} value={formatInt(t.paidOrders, locale)} hint={v.awaiting(formatInt(d.ordersByStatus.find((r) => r.status === "PENDING")?.orders ?? 0, locale))} />
      </div>

      <section className="tf-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{v.dailyTitle}</h2>
            <p className="text-sm text-muted">{v.dailyText}</p>
          </div>
          <Legend />
        </div>
        <div className="mt-5">
          {d.dailySales.length === 0 ? (
            <p className="rounded-xl bg-raised p-8 text-center text-sm text-muted">{v.noSales}</p>
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
        {v.updated(formatShortDate(d.generatedAt, locale), d.timeZone)}
      </p>
    </div>
  );
}

function Kpi({ label, value, hint, accent, progress }: { label: string; value: string; hint?: string; accent?: boolean; progress?: number | null }) {
  return (
    <div className={`tf-panel rounded-[20px] p-[22px] ${accent ? "bg-[linear-gradient(150deg,color-mix(in_srgb,var(--accent)_22%,var(--surface)),var(--surface)_65%)] shadow-[inset_0_0_0_1px_var(--accent-line)]" : ""}`}>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="font-display tabular mt-2 text-[clamp(1.125rem,1.55vw,1.625rem)] [overflow-wrap:anywhere] font-extrabold leading-tight tracking-[-0.04em] text-ink">{value}</p>
      {progress !== undefined && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden>
          <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-deep),var(--accent))]" style={{ width: `${Math.min(100, progress ?? 0)}%` }} />
        </div>
      )}
      {hint && <p className="mt-2 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

function Legend() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-accent/70" aria-hidden /> {t.organizer.overview.legendTickets}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full bg-ink" aria-hidden /> {t.organizer.overview.legendRevenue}
      </span>
    </div>
  );
}

function LotPerformance({ lots }: { lots: EventDashboard["ticketTypes"] }) {
  const { t, locale } = useI18n();
  const v = t.organizer.overview;
  return (
    <section className="tf-panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{v.lotsTitle}</h2>
      {lots.length === 0 && <p className="mt-4 text-sm text-muted">{v.noLots}</p>}
      <ul className="mt-5 space-y-5">
        {lots.map((lot) => {
          const pct = (n: number) => (lot.quantityTotal > 0 ? (n / lot.quantityTotal) * 100 : 0);
          return (
            <li key={lot.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-ink">
                  {lot.name} <span className="tabular text-sm font-normal text-muted">· {formatPrice(lot.price, locale)}</span>
                </p>
                <p className="tabular text-sm font-semibold text-ink">{formatPrice(lot.revenue, locale)}</p>
              </div>
              {/* Barra empilhada: vendido, reservado e livre, proporcionais ao total do lote. */}
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-raised" role="img" aria-label={v.lotBar(lot.sold, lot.reserved, lot.remaining, lot.quantityTotal)}>
                <div className="bg-accent" style={{ width: `${pct(lot.sold)}%` }} />
                <div className="bg-warning/80" style={{ width: `${pct(lot.reserved)}%` }} />
              </div>
              <p className="tabular mt-1.5 text-xs text-muted">
                {v.lotLine(
                  formatInt(lot.sold, locale),
                  formatInt(lot.reserved, locale),
                  formatInt(lot.remaining, locale),
                  formatInt(lot.quantityTotal, locale),
                  formatPercent(lot.percentSold, locale),
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CouponUsage({ coupons }: { coupons: EventDashboard["coupons"] }) {
  const { t, locale } = useI18n();
  const v = t.organizer.overview;
  return (
    <section className="tf-panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{v.couponsTitle}</h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-2 font-medium">{v.code}</th>
            <th className="pb-2 text-right font-medium">{v.uses}</th>
            <th className="pb-2 text-right font-medium">{v.paid}</th>
            <th className="pb-2 text-right font-medium">{v.discount}</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => (
            <tr key={coupon.id} className={`border-t border-line ${coupon.active ? "" : "opacity-60"}`}>
              <td className="py-2.5 font-mono font-semibold text-ink">{coupon.code}</td>
              <td className="tabular py-2.5 text-right text-muted">
                {formatInt(coupon.uses, locale)}
                {coupon.maxUses !== null && ` / ${formatInt(coupon.maxUses, locale)}`}
              </td>
              <td className="tabular py-2.5 text-right text-muted">{formatInt(coupon.paidOrders, locale)}</td>
              <td className="tabular py-2.5 text-right font-semibold text-ink">{formatPrice(coupon.discountTotal, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function OrdersByStatus({ rows }: { rows: EventDashboard["ordersByStatus"] }) {
  const { t, locale } = useI18n();
  const v = t.organizer.overview;
  return (
    <section className="tf-panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{v.ordersTitle}</h2>
      <table className="mt-4 w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>{v.status}</th>
            <th>{v.orders}</th>
            <th>{v.tickets}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.status} className="border-b border-line last:border-0">
              <td className="py-2.5">
                <span className="flex items-center gap-2 text-ink">
                  <span className={`h-2 w-2 rounded-full ${ORDER_STATUS_DOTS[row.status]}`} aria-hidden />
                  {t.labels.orderStatusPlural[row.status]}
                </span>
              </td>
              <td className="tabular py-2.5 text-right font-semibold text-ink">{formatInt(row.orders, locale)}</td>
              <td className="tabular w-28 py-2.5 text-right text-muted">{v.ticketsShort(formatInt(row.tickets, locale))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// Anel de comparecimento: check-ins feitos sobre ingressos emitidos.
function Attendance({ checkIn }: { checkIn: EventDashboard["checkIn"] }) {
  const { t, locale } = useI18n();
  const v = t.organizer.overview;
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const rate = checkIn.attendanceRate ?? 0;
  return (
    <section className="tf-panel flex items-center gap-5 p-5 sm:p-6">
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
        <h2 className="text-lg font-semibold text-ink">{v.attendance}</h2>
        <p className="font-display tabular text-2xl font-extrabold text-ink">{formatPercent(checkIn.attendanceRate, locale)}</p>
        <p className="text-xs text-muted">{v.attendanceText(formatInt(checkIn.checkedIn, locale), formatInt(checkIn.issued, locale))}</p>
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
