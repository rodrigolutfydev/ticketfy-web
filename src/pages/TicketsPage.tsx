import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Expand, Send, Sun, Ticket } from "lucide-react";
import { listMyTickets } from "../api/endpoints";
import type { TicketDetails } from "../api/types";
import Pagination from "../components/Pagination";
import TransferTicketDialog from "../components/TransferTicketDialog";
import AddToCalendar from "../components/AddToCalendar";
import StatusBadge from "../components/StatusBadge";
import { Empty, ErrorMessage } from "../components/StateMessage";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { Alert, ButtonLink, PageTitle, Skeleton } from "../components/ui";
import { dateParts, eventStamp, formatShortDate, formatTime, isPast } from "../utils/format";
import { useMe } from "../auth/useMe";
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

      <div className="mb-8">
        <Alert type="warning">{k.warning}</Alert>
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
              <Skeleton key={i} className="h-60 rounded-[22px]" />
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

// Ingresso de papel deitado: status, evento e ações à esquerda; picote com
// recortes de verdade; canhoto com o QR à direita (embaixo, no celular).
// O QR fica sempre preto no branco: leitores têm dificuldade com QR invertido.
function TicketCard({ ticket, onEnlarge, onTransfer }: { ticket: TicketDetails; onEnlarge: () => void; onTransfer: () => void }) {
  const { t, locale } = useI18n();
  const k = t.buyer.tickets;
  const valid = ticket.status === "VALID";
  const stamp = ticket.status === "USED" ? k.stampUsed : ticket.status === "CANCELLED" ? k.stampCancelled : null;
  const { day, month, weekday } = dateParts(ticket.eventStartsAt, locale);
  return (
    <article
      className={`tf-pticket tf-cut-x group relative transition-[translate,box-shadow] duration-500 hover:shadow-[inset_0_0_0_1px_var(--accent-line)] motion-safe:hover:-translate-y-1 ${
        valid ? "" : "saturate-[0.25]"
      }`}
      aria-label={k.cardLabel(ticket.ticketTypeName, ticket.eventName)}
    >
      <div className={`flex min-w-0 flex-col gap-3 p-6 ${valid ? "" : "opacity-70"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={ticket.status} />
          <span className="text-sm text-muted">{ticket.ticketTypeName}</span>
        </div>
        <div className="flex gap-3.5">
          <div className="tf-tk-date" aria-hidden>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{weekday}</span>
            <span className="my-[5px] font-display text-[25px] font-extrabold tracking-[-0.04em] text-ink">{day}</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-text">{month}</span>
          </div>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-xl font-bold leading-tight tracking-[-0.035em] text-ink">{ticket.eventName}</h2>
            <p className="mt-1.5 text-sm text-muted">{eventStamp(ticket.eventStartsAt, locale)}</p>
          </div>
        </div>
        {/* O código (16 caracteres) define a largura da coluna dele; o lote quebra linha se precisar. */}
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 pt-1 text-sm">
          <div>
            <dt className="text-[11px] font-bold tracking-[0.14em] text-accent-text">{k.lot}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{ticket.ticketTypeName}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold tracking-[0.14em] text-accent-text">{ticket.usedAt ? k.entry : k.code}</dt>
            <dd className="tabular mt-0.5 font-semibold text-ink [overflow-wrap:anywhere]">{ticket.usedAt ? formatShortDate(ticket.usedAt, locale) : ticket.code}</dd>
          </div>
        </dl>
        {(valid || ticket.transferable) && (
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {valid && (
              <button type="button" onClick={onEnlarge} className={chip}>
                <Expand size={16} aria-hidden /> {k.enlarge}
              </button>
            )}
            {ticket.transferable && (
              <button type="button" onClick={onTransfer} className={chip}>
                <Send size={16} aria-hidden /> {k.transfer}
              </button>
            )}
            {valid && !isPast(ticket.eventStartsAt) && ticket.eventId && <AddToCalendar eventId={ticket.eventId} variant="secondary" />}
          </div>
        )}
      </div>

      <div className={`flex h-[15.5rem] flex-col items-center justify-center gap-3 p-5 text-center sm:h-auto ${valid ? "" : "opacity-40"}`}>
        <button
          type="button"
          onClick={valid ? onEnlarge : undefined}
          disabled={!valid}
          aria-label={k.enlarge}
          className={`rounded-[14px] bg-white p-2.5 transition-transform enabled:hover:scale-[1.03] ${valid ? "" : "grayscale"}`}
        >
          <QRCodeSVG value={ticket.code} size={120} level="M" />
        </button>
        <p className="select-all font-mono text-xs font-bold tracking-[0.14em] text-muted">{ticket.code}</p>
      </div>

      {stamp && (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-[3px] border-current px-4 py-1 font-display text-2xl font-bold tracking-[0.15em] text-muted/80"
          aria-hidden
        >
          {stamp}
        </span>
      )}
    </article>
  );
}

const chip =
  "inline-flex items-center gap-2 rounded-[10px] bg-ink/[0.05] px-3 py-2 text-sm font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line)] transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-accent-soft hover:shadow-[inset_0_0_0_1px_var(--accent-line)] [&>svg]:text-accent-text";

function EnlargedQr({ ticket, onClose }: { ticket: TicketDetails; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { me } = useMe();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const size = Math.min(300, window.innerWidth - 120);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={() => ref.current?.close()}
      aria-label={t.buyer.tickets.enlargedLabel}
      className="m-0 h-full max-h-none w-full max-w-none bg-[#020203] p-0 text-[#f4f1f6]"
    >
      <div className="flex min-h-full flex-col items-center justify-center gap-5 bg-[radial-gradient(70%_50%_at_50%_30%,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_70%)] px-4 py-8 text-center">
        <div className="tf-cut-y relative w-[min(420px,100%)] rounded-[28px] bg-[linear-gradient(170deg,color-mix(in_srgb,var(--accent)_14%,#0b0a0d),#0b0a0d_55%)] shadow-[inset_0_0_0_1.5px_var(--accent-line)] [--cut-y:calc(100%-128px)] [--r:16px]">
          <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-7">
            <p className="eyebrow">{ticket.ticketTypeName}</p>
            <p className="font-display text-2xl font-extrabold leading-tight tracking-[-0.035em]">{ticket.eventName}</p>
            <div className="rounded-[22px] bg-white p-[18px] shadow-[0_0_0_8px_color-mix(in_srgb,var(--accent)_14%,transparent),0_24px_60px_color-mix(in_srgb,var(--accent)_12%,transparent)]">
              <QRCodeSVG value={ticket.code} size={size} level="M" />
            </div>
            <p className="font-mono text-xl font-bold tracking-[0.2em]">{ticket.code}</p>
          </div>
          <span className="absolute inset-x-[26px] bottom-[128px] border-t-2 border-dashed border-accent-line" aria-hidden />
          <dl className="grid h-[128px] grid-cols-2 content-center gap-x-5 gap-y-3 px-7 text-left">
            <div>
              <dt className="text-[11px] font-bold tracking-[0.14em] text-accent-text">{t.look.tickets.date}</dt>
              <dd className="text-[15px] font-semibold">{formatShortDate(ticket.eventStartsAt, locale).split(/,?\s/)[0]}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-[0.14em] text-accent-text">{t.look.tickets.time}</dt>
              <dd className="tabular text-[15px] font-semibold">{formatTime(ticket.eventStartsAt, locale)}</dd>
            </div>
            {me?.name && (
              <div className="col-span-2">
                <dt className="text-[11px] font-bold tracking-[0.14em] text-accent-text">{t.look.tickets.holder}</dt>
                <dd className="truncate text-[15px] font-semibold">{me.name}</dd>
              </div>
            )}
          </dl>
        </div>
        <p className="flex items-center gap-2 text-sm text-[#bdb8c3]">
          <Sun size={15} className="text-accent" aria-hidden /> {t.look.tickets.brightness}
        </p>
        <p className="text-sm text-[#bdb8c3]">{t.buyer.tickets.closeHint}</p>
      </div>
    </dialog>
  );
}
