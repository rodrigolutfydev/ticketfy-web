import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ChevronRight, ScanLine } from "lucide-react";
import { getOrganizerDashboard } from "../../api/endpoints";
import { useMe } from "../../auth/useMe";
import EventCover from "../../components/EventCover";
import Pagination from "../../components/Pagination";
import { Empty, ErrorMessage } from "../../components/StateMessage";
import { ButtonLink, PageTitle, Skeleton } from "../../components/ui";
import { eventStamp, formatInt, formatPercent, formatPrice, isPast } from "../../utils/format";
import { usePageTitle } from "../../hooks/usePageTitle";
import { errorMessage } from "../../api/client";
import { useI18n } from "../../i18n/LocaleContext";

// Painel geral ("bastidores"): totais de todos os eventos ativos e a lista
// de eventos com a barra de vendas. Dados de GET /organizer/dashboard.
export default function OrganizerDashboardPage() {
  const { t, locale } = useI18n();
  const d = t.organizer.dashboard;
  usePageTitle(d.pageTitle);
  const { me } = useMe();
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useQuery({
    queryKey: ["organizer-dashboard", page],
    queryFn: () => getOrganizerDashboard(page),
    placeholderData: (previous) => previous,
  });

  return (
    <div>
      <PageTitle
        title={d.greeting(me?.name ? me.name.split(" ")[0] : null)}
        subtitle={d.subtitle}
        actions={
          <>
            <ButtonLink to="/organizer/check-in" variant="secondary">
              <ScanLine size={17} aria-hidden /> {d.checkIn}
            </ButtonLink>
            <ButtonLink to="/organizer/events/new">
              <CalendarPlus size={17} aria-hidden /> {d.newEvent}
            </ButtonLink>
          </>
        }
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}
      {error && <ErrorMessage message={errorMessage(error) ?? ""} />}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={d.activeEvents} value={formatInt(data.totals.events, locale)} />
            <Stat label={d.ticketsSold} value={formatInt(data.totals.ticketsSold, locale)} />
            <Stat label={d.discounts} value={formatPrice(data.totals.discounts, locale)} />
            <Stat label={d.revenue} value={formatPrice(data.totals.revenue, locale)} accent />
          </div>

          <h2 className="mb-5 mt-12 text-2xl font-extrabold tracking-[-0.035em] text-ink">{d.yourEvents}</h2>
          {data.events.content.length === 0 ? (
            <Empty icon={<CalendarPlus size={22} />} title={d.emptyTitle} hint={d.emptyHint}>
              <ButtonLink to="/organizer/events/new">{d.newEvent}</ButtonLink>
            </Empty>
          ) : (
            <ul className="tf-panel overflow-hidden">
              {data.events.content.map((event) => (
                <li key={event.eventId} className="border-b border-line last:border-0">
                  <Link to={`/organizer/events/${event.eventId}`} className="flex flex-wrap items-center gap-4 px-4 py-4 hover:bg-raised sm:flex-nowrap sm:px-5">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-raised">
                      <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`tabular text-[11px] font-bold tracking-wide ${isPast(event.startsAt) ? "text-subtle" : "text-accent-text"}`}>{eventStamp(event.startsAt, locale)}</p>
                      <p className="truncate font-semibold text-ink">{event.name}</p>
                    </div>
                    <div className="w-full sm:w-56">
                      <div className="flex justify-between text-xs text-muted">
                        <span className="tabular">
                          {d.soldOf(formatInt(event.ticketsSold, locale), formatInt(event.capacity, locale))}
                        </span>
                        <span className="tabular">{formatPercent(event.percentSold, locale)}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden>
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-deep),var(--accent))]" style={{ width: `${Math.min(100, event.percentSold ?? 0)}%` }} />
                      </div>
                    </div>
                    <p className="tabular w-28 text-right font-semibold text-ink">{formatPrice(event.revenue, locale)}</p>
                    <ChevronRight size={18} className="hidden shrink-0 text-subtle sm:block" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={data.events.page.number} totalPages={data.events.page.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`tf-panel rounded-[20px] p-[22px] ${accent ? "bg-[linear-gradient(150deg,color-mix(in_srgb,var(--accent)_22%,var(--surface)),var(--surface)_65%)] shadow-[inset_0_0_0_1px_var(--accent-line)]" : ""}`}>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="font-display tabular mt-2 text-[clamp(1.125rem,1.55vw,1.625rem)] [overflow-wrap:anywhere] font-extrabold leading-tight tracking-[-0.04em] text-ink">{value}</p>
    </div>
  );
}
