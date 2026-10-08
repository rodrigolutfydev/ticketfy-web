import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, ChevronRight, MapPin } from "lucide-react";
import { ApiError } from "../../api/client";
import { listMyEvents } from "../../api/endpoints";
import BackendNotice, { Code } from "../../components/BackendNotice";
import EventCover from "../../components/EventCover";
import Pagination from "../../components/Pagination";
import { Empty, ErrorMessage, Loading } from "../../components/StateMessage";
import { TabPanel, Tabs, useTabParam } from "../../components/Tabs";
import { Alert, ButtonLink, PageTitle } from "../../components/ui";
import { formatShortDate, isPast } from "../../utils/format";
import { usePageTitle } from "../../hooks/usePageTitle";

const TABS = ["proximos", "realizados"] as const;

// Lista dos eventos do organizador, separada em próximos e já realizados.
export default function OrganizerEventsPage() {
  usePageTitle("Meus eventos");
  const [page, setPage] = useState(0);
  const [tab, setTab] = useTabParam(TABS, "proximos");
  const location = useLocation();
  // Mensagem enviada por outra tela ao navegar (ex.: "Evento excluído.").
  const message = (location.state as { message?: string } | null)?.message;
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-events", page],
    queryFn: () => listMyEvents(page),
    retry: false,
  });

  // /events/mine ainda não existe: o Spring tenta tratar "mine" como id e devolve 400 ou 404.
  const endpointMissing = error instanceof ApiError && [400, 404, 405].includes(error.status);
  const events = (data?.content ?? []).filter((e) => (tab === "proximos" ? !isPast(e.startsAt) : isPast(e.startsAt)));

  return (
    <div>
      <PageTitle
        title="Meus eventos"
        subtitle="Eventos que você organiza."
        actions={
          <ButtonLink to="/organizer/events/new">
            <CalendarPlus size={16} aria-hidden /> Criar evento
          </ButtonLink>
        }
      />
      {message && (
        <div className="mb-6">
          <Alert type="success">{message}</Alert>
        </div>
      )}

      <Tabs
        label="Filtrar eventos"
        idPrefix="meus-eventos"
        value={tab}
        onChange={setTab}
        items={[
          { key: "proximos", label: "Próximos" },
          { key: "realizados", label: "Realizados" },
        ]}
      />
      <TabPanel idPrefix="meus-eventos" activeKey={tab}>
        {isLoading && <Loading />}
        {endpointMissing && (
          <BackendNotice title="A API ainda não lista os eventos do organizador">
            <p>
              Esta tela usa <Code>GET /events/mine</Code>, que devolve uma página com os eventos ativos do usuário logado.
              Enquanto ela não existe, abra o evento pela listagem pública e use o botão "Gerenciar este evento".
            </p>
          </BackendNotice>
        )}
        {error && !endpointMissing && <ErrorMessage message={error.message} />}

        {data && events.length === 0 && (
          <Empty icon={<CalendarDays size={22} />} title={tab === "proximos" ? "Nenhum evento futuro" : "Nenhum evento realizado"}>
            {tab === "proximos" && <ButtonLink to="/organizer/events/new">Criar evento</ButtonLink>}
          </Empty>
        )}
        {events.length > 0 && (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  to={`/organizer/events/${event.id}`}
                  className="group flex items-center gap-4 overflow-hidden elevated rounded-2xl border border-line bg-surface p-3 pr-5 hover:border-accent/50"
                >
                  <div className="aspect-[16/9] w-28 shrink-0 overflow-hidden rounded-xl sm:w-36">
                    <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate font-bold text-ink group-hover:text-accent-text">{event.name}</p>
                      {event.cancelledAt && (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 text-xs font-semibold text-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                          Cancelado
                        </span>
                      )}
                      {!event.cancelledAt && event.soldOut && (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-danger/30 bg-danger/12 px-2.5 py-1 text-xs font-semibold text-danger">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                          Esgotado
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <CalendarDays size={14} aria-hidden /> {formatShortDate(event.startsAt)}
                    </p>
                    <p className="flex items-center gap-1.5 truncate text-sm text-muted">
                      <MapPin size={14} aria-hidden /> {event.venueName}, {event.city}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={data.page.number} totalPages={data.page.totalPages} onChange={setPage} />}
      </TabPanel>
    </div>
  );
}
