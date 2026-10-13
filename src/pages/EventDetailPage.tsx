// Página pública do evento: capa, informações em abas e escolha de ingressos.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Check, Clock, ExternalLink, Info, Maximize2, MapPin, Minus, Plus, Share2, ShieldCheck, Timer, X } from "lucide-react";
import { errorMessage } from "../api/client";
import { getEvent, listTicketTypes } from "../api/endpoints";
import type { EventDetails, TicketTypeSummary } from "../api/types";
import { canManage, useMe } from "../auth/useMe";
import EventCover from "../components/EventCover";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { Alert, BackLink, Button, ButtonLink, InfoRow, Skeleton } from "../components/ui";
import Avatar from "../components/Avatar";
import FeaturedToggle from "../components/FeaturedToggle";
import AddToCalendar from "../components/AddToCalendar";
import { encodeItems } from "../utils/cart";
import { formatDate, formatFullDay, formatPrice, formatTime, isPast, relativeDay } from "../utils/format";
import { useI18n } from "../i18n/LocaleContext";
import { salesPanel } from "../utils/sales";
import { categoryLabel } from "../i18n/categories";
import { isValidId, mapsUrl, safeImageUrl } from "../utils/security";
import { usePageTitle } from "../hooks/usePageTitle";
import NotFoundPage from "./NotFoundPage";

const TABS = ["sobre", "local", "informacoes"] as const;

export default function EventDetailPage() {
  const { id = "" } = useParams();
  const validId = isValidId(id);
  const { me } = useMe();
  const { t, locale } = useI18n();
  const [tab, setTab] = useTabParam(TABS, "sobre");

  // enabled: validId -> com um ID inválido na URL, nem chama a API.
  const eventQuery = useQuery({ queryKey: ["event", id], queryFn: () => getEvent(id), enabled: validId });
  const ticketTypesQuery = useQuery({ queryKey: ["ticket-types", id], queryFn: () => listTicketTypes(id), enabled: validId });
  usePageTitle(eventQuery.data?.name);
  const [photoOpen, setPhotoOpen] = useState(false);

  if (!validId) return <NotFoundPage />;
  if (eventQuery.isLoading) return <EventDetailSkeleton />;
  if (eventQuery.error) return <ErrorMessage message={errorMessage(eventQuery.error) ?? ""} />;

  const event = eventQuery.data!;
  const panel = salesPanel(event);
  const cancelled = panel === "cancelled";
  const photo = safeImageUrl(event.imageUrl);
  const onSale = (ticketTypesQuery.data ?? []).filter((t) => !t.soldOut);
  const minPrice = onSale.length > 0 ? Math.min(...onSale.map((t) => t.price)) : null;
  const longDate = formatFullDay(event.startsAt, locale);

  return (
    <div className="pb-28 lg:pb-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <BackLink to="/">{t.eventDetail.back}</BackLink>
        <div className="flex flex-wrap gap-2">
          <FeaturedToggle eventId={id} featured={!!event.featured} />
          {!cancelled && !isPast(event.endsAt ?? event.startsAt) && <AddToCalendar eventId={id} event={event} />}
          <ShareButton title={event.name} />
          {canManage(event, me) && (
            <ButtonLink to={`/organizer/events/${id}`} variant="secondary" size="sm">
              {t.eventDetail.manage}
            </ButtonLink>
          )}
        </div>
      </div>

      {cancelled && (
        <div className="mb-6">
          <Alert>
            <p className="font-semibold">{t.eventDetail.cancelledTitle}</p>
            <p className="mt-1">
              {event.cancellationReason ? t.eventDetail.cancelledReason(event.cancellationReason) : ""}
              {t.eventDetail.cancelledText}
            </p>
          </Alert>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] xl:gap-14">
        <div className="min-w-0">
          {/* "Cartaz": a foto inteira, sem corte, sobre fundo liso. */}
          <div
            className={`relative overflow-hidden rounded-2xl border border-line bg-raised ${
              photo ? "h-[min(75vw,62vh)] min-h-[240px] lg:h-[min(60vh,640px)]" : "aspect-[16/9]"
            }`}
          >
            <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} fit="contain" large />
            {photo && (
              <button
                type="button"
                onClick={() => setPhotoOpen(true)}
                className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xl bg-black/65 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-black/80"
              >
                <Maximize2 size={16} aria-hidden /> {t.eventDetail.seeFullPhoto}
              </button>
            )}
          </div>
          {photoOpen && photo && <PhotoViewer src={photo} name={event.name} onClose={() => setPhotoOpen(false)} />}

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <p className="eyebrow">{relativeDay(event.startsAt, locale)}</p>
            {event.category && (
              <Link
                to={`/?category=${event.category}#eventos`}
                className="rounded-md bg-raised px-2 py-1 text-xs font-semibold text-muted hover:text-ink"
              >
                {categoryLabel(event.category, locale)}
              </Link>
            )}
          </div>
          <h1 className="mt-3 break-words text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-ink sm:text-6xl lg:text-7xl">{event.name}</h1>

          <dl className="mt-10 grid gap-6 border-y border-line py-7 sm:grid-cols-3">
            <Fact icon={<CalendarDays size={18} />} label={t.eventDetail.date}>
              <span className="first-letter:uppercase">{longDate}</span>
            </Fact>
            <Fact icon={<Clock size={18} />} label={t.eventDetail.time}>
              {event.endsAt
                ? t.eventDetail.timeRange(formatTime(event.startsAt, locale), formatTime(event.endsAt, locale))
                : formatTime(event.startsAt, locale)}
            </Fact>
            <Fact icon={<MapPin size={18} />} label={t.eventDetail.venue}>
              {event.venueName}, {event.city}
              {event.state && ` — ${event.state}`}
            </Fact>
          </dl>

          {event.organizerName && (
            <div className="flex items-center gap-3 border-b border-line py-6">
              <Avatar name={event.organizerName} size={40} />
              <div>
                <p className="text-[11px] font-semibold tracking-[0.12em] text-subtle">{t.eventDetail.organizer}</p>
                <p className="font-semibold text-ink">{event.organizerName}</p>
              </div>
            </div>
          )}

          <div className="mt-10">
            <Tabs
              label={t.eventDetail.tabsLabel}
              idPrefix="evento"
              value={tab}
              onChange={setTab}
              items={[
                { key: "sobre", label: t.eventDetail.tabs.about },
                { key: "local", label: t.eventDetail.tabs.location },
                { key: "informacoes", label: t.eventDetail.tabs.info },
              ]}
            />
            <TabPanel idPrefix="evento" activeKey={tab}>
              {tab === "sobre" && <AboutTab event={event} />}
              {tab === "local" && <LocationTab event={event} />}
              {tab === "informacoes" && <InfoTab event={event} />}
            </TabPanel>
          </div>
        </div>

        {/* Painel de compra: acompanha a rolagem no computador (sticky). */}
        <aside id="ingressos" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <div className="elevated rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <p className="eyebrow">{t.eventDetail.ticketsEyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{t.eventDetail.ticketsTitle}</h2>
            <div className="mt-5">
              {cancelled ? (
                <p className="rounded-xl bg-raised p-4 text-center text-sm text-muted">{t.eventDetail.cancelledSales}</p>
              ) : panel === "closed" ? (
                <div className="rounded-xl bg-raised p-4 text-center">
                  <p className="font-semibold text-ink">{t.eventDetail.closedTitle}</p>
                  <p className="mt-1 text-sm text-muted">{t.eventDetail.closedText}</p>
                </div>
              ) : (
                <>
                  {ticketTypesQuery.isLoading && <Loading text={t.eventDetail.loadingTickets} />}
                  {ticketTypesQuery.error && <ErrorMessage message={errorMessage(ticketTypesQuery.error) ?? ""} />}
                  {ticketTypesQuery.data && <TicketSelector eventId={id} ticketTypes={ticketTypesQuery.data} />}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Celular: barra fixa no rodapé com o menor preço e atalho para os lotes. */}
      {panel === "open" && minPrice !== null && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted">{t.eventDetail.from}</p>
              <p className="tabular text-lg font-bold text-accent-text">{formatPrice(minPrice, locale)}</p>
            </div>
            <Button size="lg" onClick={() => document.getElementById("ingressos")?.scrollIntoView({ behavior: "smooth" })}>
              {t.eventDetail.chooseTickets}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Um dado do evento (data, horário, local) com ícone coral e rótulo pequeno.
function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-accent-text">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">{label}</dt>
        <dd className="mt-1 text-sm font-semibold text-ink">{children}</dd>
      </div>
    </div>
  );
}

function ShareButton({ title }: { title: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Usuário cancelou o compartilhamento: nada a fazer.
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={share}>
      {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
      {copied ? t.eventDetail.linkCopied : t.eventDetail.share}
    </Button>
  );
}

// Foto em tela cheia, inteira (object-contain), sobre fundo preto.
function PhotoViewer({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-label={t.cover.photoAlt(name)}
      className="m-0 h-full max-h-none w-full max-w-none bg-black p-0"
    >
      <img
        src={src}
        alt={t.cover.photoAlt(name)}
        referrerPolicy="no-referrer"
        className="h-full w-full object-contain"
        onClick={() => ref.current?.close()}
      />
      <button
        type="button"
        onClick={() => ref.current?.close()}
        aria-label={t.eventDetail.closePhoto}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
      >
        <X size={22} />
      </button>
    </dialog>
  );
}

function AboutTab({ event }: { event: EventDetails }) {
  const { t } = useI18n();
  if (!event.description) return <p className="text-muted">{t.eventDetail.noDescription}</p>;
  // whitespace-pre-line respeita as quebras de linha digitadas pelo organizador.
  // O texto é exibido como TEXTO: se alguém escrever <script> na descrição,
  // aparece literalmente "<script>" na tela, sem executar nada.
  return <p className="max-w-[68ch] whitespace-pre-line leading-relaxed text-ink/90">{event.description}</p>;
}

function LocationTab({ event }: { event: EventDetails }) {
  const { t } = useI18n();
  const fullAddress = [event.venueName, event.address, event.city, event.state].filter(Boolean).join(", ");
  return (
    <div className="space-y-5">
      <dl className="space-y-4">
        <InfoRow icon={<MapPin size={18} />} label={event.venueName}>
          {[event.address, event.city, event.state].filter(Boolean).join(", ")}
        </InfoRow>
      </dl>
      {/* Link externo: target=_blank abre em outra aba; rel="noopener noreferrer"
          impede que o site aberto controle esta aba (ataque "tabnabbing") e
          não informa de onde o usuário veio. */}
      <a
        href={mapsUrl(fullAddress)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-accent-text hover:underline"
      >
        {t.eventDetail.openMap} <ExternalLink size={14} aria-hidden />
      </a>
    </div>
  );
}

function InfoTab({ event }: { event: EventDetails }) {
  const { t, locale } = useI18n();
  const info = t.eventDetail.info;
  const items = [
    {
      icon: <Clock size={18} />,
      title: info.dateTitle,
      text: event.endsAt ? info.dateRange(formatDate(event.startsAt, locale), formatDate(event.endsAt, locale)) : formatDate(event.startsAt, locale),
    },
    { icon: <Timer size={18} />, title: info.holdTitle, text: info.holdText },
    { icon: <ShieldCheck size={18} />, title: info.refundTitle, text: info.refundText },
    { icon: <Info size={18} />, title: info.entryTitle, text: info.entryText },
  ];
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.title} className="elevated rounded-2xl border border-line bg-surface p-5">
          <span className="text-accent-text">{item.icon}</span>
          <p className="mt-3 font-bold text-ink">{item.title}</p>
          <p className="mt-1 text-sm text-muted">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

// Escolha de quantidades por lote. A seleção vai para o checkout pela URL.
// Limite de ingressos por lote num pedido: o máximo do lote, o limite por pessoa,
// o que resta (quando a API informa) e um teto de segurança de 20.
function maxFor(ticketType: TicketTypeSummary) {
  return Math.min(ticketType.maxPerOrder ?? 20, ticketType.maxPerBuyer ?? 20, ticketType.remaining ?? 20, 20);
}

function TicketSelector({ eventId, ticketTypes }: { eventId: string; ticketTypes: TicketTypeSummary[] }) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const items = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

  const total = items.reduce((sum, item) => {
    const type = ticketTypes.find((t) => t.id === item.ticketTypeId);
    return sum + (type ? type.price * item.quantity : 0);
  }, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  function change(ticketType: TicketTypeSummary, delta: number) {
    setQuantities((current) => {
      const next = Math.max(0, Math.min((current[ticketType.id] ?? 0) + delta, maxFor(ticketType)));
      return { ...current, [ticketType.id]: next };
    });
  }

  function proceed() {
    const params = new URLSearchParams({ event: eventId, items: encodeItems(items) });
    navigate(`/checkout?${params}`);
  }

  if (ticketTypes.length === 0) {
    return <p className="rounded-xl bg-raised p-4 text-center text-sm text-muted">{t.eventDetail.noLots}</p>;
  }

  // Esgotados vão para o fim da lista.
  const ordered = [...ticketTypes].sort((a, b) => Number(a.soldOut) - Number(b.soldOut));

  return (
    <div>
      <ul className="space-y-3">
        {ordered.map((ticketType) => {
          const quantity = quantities[ticketType.id] ?? 0;
          const max = maxFor(ticketType);
          return (
            <li
              key={ticketType.id}
              className={`relative flex rounded-xl border transition-colors ${
                ticketType.soldOut ? "border-line opacity-55" : quantity > 0 ? "border-accent/70 bg-accent/5" : "border-line bg-raised/50"
              }`}
            >
              {/* Recortes do mini-ingresso na altura do picote. */}
              <span className="absolute -left-[7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-line bg-surface" aria-hidden />
              <span className="absolute -right-[7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-line bg-surface" aria-hidden />

              <div className="min-w-0 flex-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{ticketType.name}</p>
                  {ticketType.soldOut && <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted">{t.eventDetail.soldOut}</span>}
                  {!ticketType.soldOut && ticketType.remaining !== null && (
                    <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-warning">{t.eventDetail.lastOnes(ticketType.remaining)}</span>
                  )}
                </div>
                {ticketType.description && <p className="mt-1 text-sm leading-snug text-muted">{ticketType.description}</p>}
                <p className="tabular mt-2 font-bold text-accent-text">{formatPrice(ticketType.price, locale)}</p>
                {ticketType.maxPerBuyer !== null && <p className="mt-1 text-xs text-muted">{t.eventDetail.perPerson(ticketType.maxPerBuyer)}</p>}
              </div>

              <div className="flex w-[7.5rem] shrink-0 flex-col items-center justify-center gap-1.5 border-l border-dashed border-line-strong px-2">
                <div className="flex items-center rounded-lg border border-line-strong">
                  <StepButton label={t.eventDetail.decrease(ticketType.name)} disabled={ticketType.soldOut || quantity === 0} onClick={() => change(ticketType, -1)}>
                    <Minus size={15} />
                  </StepButton>
                  <span className="tabular w-6 text-center text-sm font-bold text-ink" aria-live="polite">
                    {quantity}
                  </span>
                  <StepButton label={t.eventDetail.increase(ticketType.name)} disabled={ticketType.soldOut || quantity >= max} onClick={() => change(ticketType, 1)}>
                    <Plus size={15} />
                  </StepButton>
                </div>
                {!ticketType.soldOut && <span className="text-[10px] text-subtle">{t.eventDetail.maxPerOrder(max)}</span>}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border-t border-line pt-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-semibold text-ink">{t.common.total}</p>
            <p className="text-xs text-muted">{count === 0 ? t.eventDetail.noTickets : t.common.tickets(count)}</p>
          </div>
          <span className="tabular text-2xl font-bold text-accent-text">{formatPrice(total, locale)}</span>
        </div>
        <Button className="mt-5 w-full" size="lg" disabled={items.length === 0} onClick={proceed}>
          {t.eventDetail.continue} <ArrowRight size={17} aria-hidden />
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
          <ShieldCheck size={14} className="text-success" aria-hidden /> {t.eventDetail.issuedAfterPayment}
        </p>
      </div>
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-ink hover:bg-raised disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function EventDetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-5 w-24" />
      <div className="grid gap-10 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Skeleton className="aspect-[16/9] rounded-2xl" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-3/4" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
