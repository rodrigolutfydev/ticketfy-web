import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Expand, Send, ShieldAlert, Ticket } from "lucide-react";
import { listMyTickets } from "../api/endpoints";
import type { TicketDetails } from "../api/types";
import Pagination from "../components/Pagination";
import TransferTicketDialog from "../components/TransferTicketDialog";
import StatusBadge from "../components/StatusBadge";
import { Empty, ErrorMessage } from "../components/StateMessage";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { Alert, Button, ButtonLink, PageTitle, Skeleton } from "../components/ui";
import { eventStamp, formatShortDate, isPast } from "../utils/format";
import { usePageTitle } from "../hooks/usePageTitle";

const TABS = ["proximos", "usados", "outros"] as const;
type TabKey = (typeof TABS)[number];

// Em qual aba cada ingresso aparece.
function tabOf(ticket: TicketDetails): TabKey {
  if (ticket.status === "USED") return "usados";
  if (ticket.status === "VALID" && !isPast(ticket.eventStartsAt)) return "proximos";
  return "outros"; // cancelados e válidos de eventos que já passaram
}

export default function TicketsPage() {
  usePageTitle("Meus ingressos");
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
      <PageTitle title="Meus ingressos" subtitle="Apresente o QR code ou o código na entrada do evento." />

      <div className="mb-8 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-ink">
        <ShieldAlert size={20} className="shrink-0 text-warning" aria-hidden />
        <p>
          O código é o seu ingresso: quem tiver ele entra no seu lugar. Não publique foto do QR code nem envie para
          desconhecidos.
        </p>
      </div>

      {transferredTo && (
        <div className="mb-6">
          <Alert type="success">Ingresso transferido para {transferredTo}. O código antigo não vale mais.</Alert>
        </div>
      )}

      <Tabs
        label="Filtrar ingressos"
        idPrefix="ingressos"
        value={tab}
        onChange={setTab}
        items={[
          { key: "proximos", label: "Próximos", count: data ? count("proximos") : undefined },
          { key: "usados", label: "Utilizados", count: data ? count("usados") : undefined },
          { key: "outros", label: "Cancelados e passados", count: data ? count("outros") : undefined },
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
        {error && <ErrorMessage message={error.message} />}
        {data && tickets.length === 0 && (
          <Empty
            icon={<Ticket size={22} />}
            title={tab === "proximos" ? "Nenhum ingresso para eventos futuros" : "Nada por aqui"}
            hint={tab === "proximos" ? "Os ingressos aparecem aqui assim que o pagamento é aprovado." : undefined}
          >
            {tab === "proximos" && <ButtonLink to="/">Ver eventos</ButtonLink>}
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
  const valid = ticket.status === "VALID";
  const stamp = ticket.status === "USED" ? "UTILIZADO" : ticket.status === "CANCELLED" ? "CANCELADO" : null;
  return (
    <article
      className="elevated relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface sm:flex-row"
      aria-label={`Ingresso ${ticket.ticketTypeName} para ${ticket.eventName}`}
    >
      <div className={`flex min-w-0 flex-1 flex-col p-5 sm:p-6 ${valid ? "" : "opacity-55"}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="tabular text-[11px] font-bold tracking-wide text-accent-text">{eventStamp(ticket.eventStartsAt)}</p>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="font-display mt-3 line-clamp-2 text-2xl font-semibold leading-tight tracking-tight text-ink">{ticket.eventName}</p>
        <div className="mt-auto grid grid-cols-2 gap-4 pt-6 text-sm">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-subtle">LOTE</p>
            <p className="mt-0.5 font-semibold text-ink">{ticket.ticketTypeName}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-subtle">{ticket.usedAt ? "ENTRADA" : "CÓDIGO"}</p>
            <p className="tabular mt-0.5 font-semibold text-ink">{ticket.usedAt ? formatShortDate(ticket.usedAt) : ticket.code}</p>
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
            <Expand size={15} aria-hidden /> Ampliar para a entrada
          </Button>
        )}
        {ticket.transferable && (
          <Button variant="ghost" size="sm" onClick={onTransfer}>
            <Send size={15} aria-hidden /> Transferir
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
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={() => ref.current?.close()}
      aria-label="QR code ampliado"
      className="m-0 h-full max-h-none w-full max-w-none bg-white p-0 text-black"
    >
      <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
        <p className="text-lg font-extrabold">{ticket.eventName}</p>
        <p className="-mt-3 text-sm font-semibold text-neutral-600">{ticket.ticketTypeName}</p>
        <QRCodeSVG value={ticket.code} size={Math.min(320, window.innerWidth - 64)} level="M" />
        <p className="font-mono text-2xl font-bold tracking-[0.2em]">{ticket.code}</p>
        <p className="text-sm text-neutral-600">Toque em qualquer lugar ou aperte Esc para fechar</p>
      </div>
    </dialog>
  );
}
