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

// Painel geral ("bastidores"): totais de todos os eventos ativos e a lista
// de eventos com a barra de vendas. Dados de GET /organizer/dashboard.
export default function OrganizerDashboardPage() {
  usePageTitle("Área do organizador");
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
        title={`Olá${me?.name ? `, ${me.name.split(" ")[0]}` : ""}`}
        subtitle="Como estão as vendas dos seus eventos."
        actions={
          <>
            <ButtonLink to="/organizer/check-in" variant="secondary">
              <ScanLine size={17} aria-hidden /> Check-in
            </ButtonLink>
            <ButtonLink to="/organizer/events/new">
              <CalendarPlus size={17} aria-hidden /> Criar evento
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
      {error && <ErrorMessage message={error.message} />}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Eventos ativos" value={formatInt(data.totals.events)} />
            <Stat label="Ingressos vendidos" value={formatInt(data.totals.ticketsSold)} />
            <Stat label="Descontos em cupons" value={formatPrice(data.totals.discounts)} />
            <Stat label="Receita total" value={formatPrice(data.totals.revenue)} accent />
          </div>

          <h2 className="mb-4 mt-10 text-xl font-semibold tracking-tight text-ink">Seus eventos</h2>
          {data.events.content.length === 0 ? (
            <Empty icon={<CalendarPlus size={22} />} title="Você ainda não tem eventos" hint="Crie o primeiro e cadastre os lotes para começar a vender.">
              <ButtonLink to="/organizer/events/new">Criar evento</ButtonLink>
            </Empty>
          ) : (
            <ul className="elevated overflow-hidden rounded-2xl border border-line bg-surface">
              {data.events.content.map((event) => (
                <li key={event.eventId} className="border-b border-line last:border-0">
                  <Link to={`/organizer/events/${event.eventId}`} className="flex flex-wrap items-center gap-4 px-4 py-4 hover:bg-raised sm:flex-nowrap sm:px-5">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-raised">
                      <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`tabular text-[11px] font-bold tracking-wide ${isPast(event.startsAt) ? "text-subtle" : "text-accent-text"}`}>{eventStamp(event.startsAt)}</p>
                      <p className="truncate font-semibold text-ink">{event.name}</p>
                    </div>
                    <div className="w-full sm:w-56">
                      <div className="flex justify-between text-xs text-muted">
                        <span className="tabular">
                          {formatInt(event.ticketsSold)} de {formatInt(event.capacity)}
                        </span>
                        <span className="tabular">{formatPercent(event.percentSold)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden>
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, event.percentSold ?? 0)}%` }} />
                      </div>
                    </div>
                    <p className="tabular w-28 text-right font-semibold text-ink">{formatPrice(event.revenue)}</p>
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
    <div className="elevated rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`font-display tabular mt-2 text-3xl font-semibold tracking-tight ${accent ? "text-accent-text" : "text-ink"}`}>{value}</p>
    </div>
  );
}
