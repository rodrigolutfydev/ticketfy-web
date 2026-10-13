import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Expand, Send, ShieldAlert, Ticket } from "lucide-react";
import { listMyTickets } from "../api/endpoints";
import type { TicketDetails } from "../api/types";
import Pagination from "../components/Pagination";
import TransferTicketDialog from "../components/TransferTicketDialog";
import AddToCalendar from "../components/AddToCalendar";
import StatusBadge from "../components/StatusBadge";
import { Empty, ErrorMessage } from "../components/StateMessage";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { Alert, Button, ButtonLink, PageTitle, Skeleton } from "../components/ui";
import { eventStamp, formatShortDate, isPast } from "../utils/format";
import { usePageTitle } from "../hooks/usePageTitle";
import { errorMessage } from "../api/client";
import { useI18n } from "../i18n/LocaleContext";

const TABS = ["proximos", "usados", "outros"] as const;
type TabKey = (typeof TABS)[number];

// Em qual aba cada ingresso aparece.
function tabOf(ticket: TicketDetails): TabKey {
  if (ticket.status === "USED") return "usados";
  if (ticket.status === "VALID" && !isPast(ticket.eventStartsAt)) return "proximos";
  return "outros"; // cancelados e válidos de eventos que já passaram
}

export default function TicketsPage() {
  const { t } = useI18n();
  const k = t.buyer.tickets;
  usePageTitle(k.pageTitle);
  const [tab, setTab] = useTabParam(TABS, "proximos");
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(0, Number.parseInt(searchParams.get("page") ?? "0", 10) || 0);
  const [enlarged, setEnlarged] = useState<TicketDetails | null>(null);
  const [transferring, setTransferring] = useState<TicketDetails | null>(null);
  const [transferredTo, setTransferredTo] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tickets", page],
    queryFn: () => listMyTickets(page),
  });

  const all = data?.content ?? [];
  const tickets = all.filter((t) => tabOf(t) === tab);
  const count = (key: TabKey) => all.filter((t) => tabOf(t) === key).length;

  return (
    <div>
      <PageTitle title={k.title} subtitle={k.subtitle} />

      <div className="mb-8 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-ink">
        <ShieldAlert size={20} className="shrink-0 text-warning" aria-hidden />
        <p>{k.warning}</p>
      </div>

      {transferredTo && (
        <div className="mb-6">
          <Alert type="success">{k.transferred(transferredTo)}</Alert>
        </div>
      )}

      <Tabs
        label={k.tabsLabel}
        idPrefix="ingressos"
        value={tab}
        onChange={setTab}
        items={[
          { key: "proximos", label: k.tabs.upcoming, count: data ? count("proximos") : undefined },
          { key: "usados", label: k.tabs.used, count: data ? count("usados") : undefined },
          { key: "outros", label: k.tabs.other, count: data ? count("outros") : undefined },
        ]}
      />
      <TabPanel idPrefix="ingressos" activeKey={tab}>
        {isLoading && (
          <div className="grid gap-5 xl:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        )}
        {error && <ErrorMessage message={errorMessage(error) ?? ""} />}
        {data && tickets.length === 0 && (
          <Empty
            icon={<Ticket size={22} />}
            title={tab === "proximos" ? k.emptyUpcomingTitle : k.emptyTitle}
            hint={tab === "proximos" ? k.emptyUpcomingHint : undefined}
          >
            {tab === "proximos" && <ButtonLink to="/">{t.common.seeEvents}</ButtonLink>}
          </Empty>
        )}
        {tickets.length > 0 && (
          <div className="grid gap-5 xl:grid-cols-2">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onEnlarge={() => setEnlarged(ticket)}
                onTransfer={() => {
                  setTransferredTo(null);
                  setTransferring(ticket);
                }}
              />
            ))}
          </div>
        )}
        {data && (
          <Pagination
            page={data.page.number}
            totalPages={data.page.totalPages}
            onChange={(p) => {
              const next = new URLSearchParams(searchParams);
              next.set("page", String(p));
              setSearchParams(next);
            }}
          />
        )}
      </TabPanel>

      {enlarged && <EnlargedQr ticket={enlarged} onClose={() => setEnlarged(null)} />}
      {transferring && (
        <TransferTicketDialog
          ticket={transferring}
          onClose={() => setTransferring(null)}
          onTransferred={(email) => {
            setTransferring(null);
            setTransferredTo(email);
          }}
        />
      )}
    </div>
  );
}

// Ingresso desenhado como o de papel: cabeçalho do evento, picote, e o
// canhoto com o QR code. O QR fica sempre preto no branco (os leitores
// têm dificuldade com QR invertido no tema escuro).
// "Carteira": cada ingresso parece um ingresso de papel. À esquerda os dados
// do evento; no meio o picote; à direita o canhoto com o QR code.
// No celular, o canhoto vai para baixo.
function TicketCard({ ticket, onEnlarge, onTransfer }: { ticket: TicketDetails; onEnlarge: () => void; onTransfer: () => void }) {
  const { t, locale } = useI18n();
  const k = t.buyer.tickets;
  const valid = ticket.status === "VALID";
  const stamp = ticket.status === "USED" ? k.stampUsed : ticket.status === "CANCELLED" ? k.stampCancelled : null;
  return (
    <article
      className="elevated relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface sm:flex-row"
      aria-label={k.cardLabel(ticket.ticketTypeName, ticket.eventName)}
    >
      <div className={`flex min-w-0 flex-1 flex-col p-5 sm:p-6 ${valid ? "" : "opacity-55"}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="tabular text-[11px] font-bold tracking-wide text-accent-text">{eventStamp(ticket.eventStartsAt, locale)}</p>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="font-display mt-3 line-clamp-2 text-2xl font-semibold leading-tight tracking-tight text-ink">{ticket.eventName}</p>
        <div className="mt-auto grid grid-cols-2 gap-4 pt-6 text-sm">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-subtle">{k.lot}</p>
            <p className="mt-0.5 font-semibold text-ink">{ticket.ticketTypeName}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-subtle">{ticket.usedAt ? k.entry : k.code}</p>
            <p className="tabular mt-0.5 font-semibold text-ink">{ticket.usedAt ? formatShortDate(ticket.usedAt, locale) : ticket.code}</p>
          </div>
        </div>
      </div>

      {/* Picote: tracejado com recortes nas pontas (vertical no computador, horizontal no celular). */}
      <div className="relative sm:w-0" aria-hidden>
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full border border-line bg-canvas sm:-left-2.5 sm:-top-2.5" />
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full border border-line bg-canvas sm:-bottom-2.5 sm:-left-2.5 sm:right-auto sm:top-auto" />
        <span className="absolute inset-x-5 top-0 border-t-2 border-dashed border-line sm:inset-x-auto sm:inset-y-5 sm:left-0 sm:border-l-2 sm:border-t-0" />
      </div>

      <div className={`flex flex-col items-center justify-center gap-3 p-5 sm:w-60 ${valid ? "" : "opacity-40"}`}>
        <div className={`rounded-xl bg-white p-2.5 ${valid ? "" : "grayscale"}`}>
          <QRCodeSVG value={ticket.code} size={124} level="M" />
        </div>
        <p className="select-all font-mono text-sm font-bold tracking-[0.18em] text-ink">{ticket.code}</p>
        {valid && (
          <Button variant="secondary" size="sm" onClick={onEnlarge}>
            <Expand size={15} aria-hidden /> {k.enlarge}
          </Button>
        )}
        {valid && !isPast(ticket.eventStartsAt) && ticket.eventId && <AddToCalendar eventId={ticket.eventId} />}
        {ticket.transferable && (
          <Button variant="ghost" size="sm" onClick={onTransfer}>
            <Send size={15} aria-hidden /> {k.transfer}
          </Button>
        )}
      </div>

      {stamp && (
        <span
          className="font-display pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-[3px] border-current px-4 py-1 text-2xl font-bold tracking-[0.15em] text-subtle/80"
          aria-hidden
        >
          {stamp}
        </span>
      )}
    </article>
  );
}

function EnlargedQr({ ticket, onClose }: { ticket: TicketDetails; onClose: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={() => ref.current?.close()}
      aria-label={t.buyer.tickets.enlargedLabel}
      className="m-0 h-full max-h-none w-full max-w-none bg-white p-0 text-black"
    >
      <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
        <p className="text-lg font-extrabold">{ticket.eventName}</p>
        <p className="-mt-3 text-sm font-semibold text-neutral-600">{ticket.ticketTypeName}</p>
        <QRCodeSVG value={ticket.code} size={Math.min(320, window.innerWidth - 64)} level="M" />
        <p className="font-mono text-2xl font-bold tracking-[0.2em]">{ticket.code}</p>
        <p className="text-sm text-neutral-600">{t.buyer.tickets.closeHint}</p>
      </div>
    </dialog>
  );
}
