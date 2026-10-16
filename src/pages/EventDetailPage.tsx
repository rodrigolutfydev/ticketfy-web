// Página pública do evento: capa, informações em abas e escolha de ingressos.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Clock, ExternalLink, Info, Maximize2, MapPin, Minus, Plus, Share2, ShieldCheck, Timer, X } from "lucide-react";
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
import { dateParts, formatDate, formatFullDay, formatPrice, formatTime, isPast, relativeDay } from "../utils/format";
import { useI18n } from "../i18n/LocaleContext";
import { salesPanel } from "../utils/sales";
import { categoryLabel } from "../i18n/categories";
import { isValidId, mapsUrl, safeImageUrl } from "../utils/security";
import { usePageTitle } from "../hooks/usePageTitle";
import { preloadCheckout } from "./lazyPages";
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
  // Quem está na página do evento costuma ir para o checkout: baixa a tela antes.
  useEffect(preloadCheckout, []);
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

  const { day, month, weekday } = dateParts(event.startsAt, locale);
  const fullAddress = [event.venueName, event.address, event.city, event.state].filter(Boolean).join(", ");

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

      {/* Topo focado na compra: a arte do organizador (inteira, sem nada por cima) ao lado das informações e dos ingressos. */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)] lg:gap-12">
        <figure className="relative m-0 lg:sticky lg:top-24">
          {photo ? (
            <div className="relative grid place-items-center">
              <img
                src={photo}
                alt={t.cover.photoAlt(event.name)}
                referrerPolicy="no-referrer"
                decoding="async"
                className="max-h-[min(540px,calc(100vh-220px))] w-auto max-w-full rounded-3xl object-contain shadow-[0_24px_60px_rgb(0_0_0/0.5),0_0_0_1px_rgb(255_255_255/0.08)] max-sm:max-h-[300px] max-lg:max-h-[380px]"
              />
              <button
                type="button"
                onClick={() => setPhotoOpen(true)}
                className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xl bg-[rgb(2_2_3/0.65)] px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-[rgb(2_2_3/0.85)]"
              >
                <Maximize2 size={16} aria-hidden /> {t.eventDetail.seeFullPhoto}
              </button>
            </div>
          ) : (
            <div className="aspect-[16/10] w-full overflow-hidden rounded-3xl shadow-[0_24px_60px_rgb(0_0_0/0.5)]">
              <EventCover name={event.name} startsAt={event.startsAt} imageUrl={null} large />
            </div>
          )}
        </figure>
        {photoOpen && photo && <PhotoViewer src={photo} name={event.name} onClose={() => setPhotoOpen(false)} />}

        <div className="flex min-w-0 flex-col gap-5">
          <header className="flex items-start gap-4">
            <div
              className="flex w-[70px] shrink-0 flex-col items-center rounded-2xl bg-[linear-gradient(170deg,color-mix(in_srgb,var(--accent)_22%,var(--surface)),var(--surface))] pb-[11px] pt-2.5 leading-none shadow-[inset_0_0_0_1px_var(--accent-line)]"
              aria-hidden
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{weekday}</span>
              <span className="my-1.5 font-display text-[32px] font-extrabold tracking-[-0.04em] text-ink">{day}</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-text">{month}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow">{relativeDay(event.startsAt, locale)}</p>
                {event.category && (
                  <Link
                    to={`/?category=${event.category}#eventos`}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-muted shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:text-ink"
                  >
                    {categoryLabel(event.category, locale)}
                  </Link>
                )}
              </div>
              <h1 className="break-words text-[clamp(1.625rem,2.4vw,2.125rem)] font-extrabold leading-[1.06] tracking-[-0.045em] text-ink">{event.name}</h1>
              <ul className="flex flex-col gap-1.5 text-[0.9375rem] text-muted">
                <li className="flex items-center gap-2">
                  <Clock size={16} className="shrink-0 text-accent-text" aria-hidden />
                  <span>
                    <span className="first-letter:uppercase">{longDate}</span> ·{" "}
                    {event.endsAt
                      ? t.eventDetail.timeRange(formatTime(event.startsAt, locale), formatTime(event.endsAt, locale))
                      : formatTime(event.startsAt, locale)}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={16} className="shrink-0 text-accent-text" aria-hidden />
                  <span>
                    {event.venueName} · {event.city}
                    {event.state && `, ${event.state}`}
                  </span>
                </li>
              </ul>
            </div>
          </header>

          {/* Painel de compra: acompanha a rolagem no computador. */}
          <aside id="ingressos" className="tf-panel tf-panel-hl scroll-mt-24 px-[22px] pb-[18px] pt-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold tracking-[-0.03em] text-ink">{t.eventDetail.ticketsTitle}</h2>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck size={14} className="text-success" aria-hidden /> {t.eventDetail.issuedAfterPayment}
              </span>
            </div>
            {cancelled ? (
              <p className="mt-3 rounded-[14px] bg-ink/[0.04] p-4 text-center text-sm text-muted">{t.eventDetail.cancelledSales}</p>
            ) : panel === "closed" ? (
              <div className="mt-3 rounded-[14px] bg-ink/[0.04] p-4 text-center">
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
          </aside>
        </div>
      </div>

      {/* Sobre, local e informações: texto à esquerda, local e organizador à direita. */}
      <div className="mt-14 grid items-start gap-8 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)] lg:gap-12">
        <div className="min-w-0">
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
        <aside className="flex flex-col gap-4">
          <div className="tf-panel flex flex-col gap-3.5 p-6">
            <h2 className="text-lg font-bold tracking-[-0.03em] text-ink">{t.eventDetail.venue}</h2>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                <MapPin size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink">{event.venueName}</p>
                <p className="text-sm text-muted">{[event.address, event.city, event.state].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            <a
              href={mapsUrl(fullAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-accent-text hover:underline"
            >
              {t.eventDetail.openMap} <ExternalLink size={14} aria-hidden />
            </a>
          </div>
          {event.organizerName && (
            <div className="tf-panel flex items-center gap-3 p-6">
              <Avatar name={event.organizerName} size={44} />
              <div>
                <p className="text-[11px] font-semibold tracking-[0.12em] text-subtle">{t.eventDetail.organizer}</p>
                <p className="font-semibold text-ink">{event.organizerName}</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {panel === "open" && minPrice !== null && <MobileBuyBar minPrice={minPrice} />}
    </div>
  );
}

// Celular: barra fixa no rodapé com o menor preço e atalho para os lotes.
// Some enquanto o cartão de ingressos está na tela (senão cobria o botão
// "Continuar" dele).
function MobileBuyBar({ minPrice }: { minPrice: number }) {
  const { t, locale } = useI18n();
  const [panelInView, setPanelInView] = useState(false);
  useEffect(() => {
    const panel = document.getElementById("ingressos");
    if (!panel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPanelInView(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  if (panelInView) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted">{t.eventDetail.from}</p>
          <p className="tabular font-display text-lg font-extrabold tracking-[-0.03em] text-ink">{formatPrice(minPrice, locale)}</p>
        </div>
        <Button size="lg" onClick={() => document.getElementById("ingressos")?.scrollIntoView({ behavior: "smooth" })}>
          {t.eventDetail.chooseTickets}
        </Button>
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
      className="m-0 h-full max-h-none w-full max-w-none bg-[#020203] p-0"
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
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)] backdrop-blur transition-colors hover:bg-white hover:text-[#020203]"
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
  return <p className="max-w-[68ch] whitespace-pre-line text-[1.0625rem] leading-[1.7] text-ink/85">{event.description}</p>;
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
        <li key={item.title} className="tf-panel rounded-[20px] p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text">{item.icon}</span>
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
    return <p className="mt-3 rounded-[14px] bg-ink/[0.04] p-4 text-center text-sm text-muted">{t.eventDetail.noLots}</p>;
  }

  // Esgotados vão para o fim da lista.
  const ordered = [...ticketTypes].sort((a, b) => Number(a.soldOut) - Number(b.soldOut));

  return (
    <div>
      <ul>
        {ordered.map((ticketType) => {
          const quantity = quantities[ticketType.id] ?? 0;
          const max = maxFor(ticketType);
          return (
            <li
              key={ticketType.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-dashed border-line py-3 last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className={`font-semibold ${ticketType.soldOut ? "text-muted" : "text-ink"}`}>{ticketType.name}</p>
                {ticketType.soldOut && (
                  <span className="rounded-full bg-ink/[0.08] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{t.eventDetail.soldOut}</span>
                )}
                {!ticketType.soldOut && ticketType.remaining !== null && (
                  <span className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-paper-ink">
                    {t.eventDetail.lastOnes(ticketType.remaining)}
                  </span>
                )}
              </div>
              <p className={`tabular row-span-2 text-right font-display text-[17px] font-extrabold tracking-[-0.03em] ${ticketType.soldOut ? "text-muted line-through" : "text-ink"}`}>
                {formatPrice(ticketType.price, locale)}
              </p>
              <div className="min-w-0 text-[0.8125rem] leading-snug text-muted">
                {ticketType.description && <p>{ticketType.description}</p>}
                {ticketType.maxPerBuyer !== null && <p>{t.eventDetail.perPerson(ticketType.maxPerBuyer)}</p>}
              </div>
              {!ticketType.soldOut && (
                <div className="col-span-2 mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-subtle">{t.eventDetail.maxPerOrder(max)}</span>
                  <div className="flex items-center gap-1 rounded-xl bg-field p-1 shadow-[inset_0_0_0_1px_var(--line)]">
                    <StepButton label={t.eventDetail.decrease(ticketType.name)} disabled={quantity === 0} onClick={() => change(ticketType, -1)}>
                      <Minus size={15} />
                    </StepButton>
                    <span className="tabular w-7 text-center font-bold text-ink" aria-live="polite">
                      {quantity}
                    </span>
                    <StepButton label={t.eventDetail.increase(ticketType.name)} disabled={quantity >= max} onClick={() => change(ticketType, 1)}>
                      <Plus size={15} />
                    </StepButton>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mb-3.5 mt-2 flex items-end justify-between border-t-2 border-dashed border-line pt-3.5">
        <p className="text-muted">{count === 0 ? t.eventDetail.noTickets : t.common.tickets(count)}</p>
        <p>
          <span className="sr-only">{t.common.total}: </span>
          <span className="tabular font-display text-[28px] font-extrabold tracking-[-0.04em] text-ink">{formatPrice(total, locale)}</span>
        </p>
      </div>
      <Button className="w-full justify-between" size="lg" disabled={items.length === 0} onClick={proceed}>
        {t.eventDetail.continue} <ArrowRight size={17} aria-hidden />
      </Button>
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
      className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-ink transition-[background-color,color,transform] hover:bg-accent-soft hover:text-accent-text active:scale-90 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function EventDetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-5 w-24" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)] lg:gap-12">
        <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <Skeleton className="h-[86px] w-[70px] rounded-2xl" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
          <Skeleton className="h-80 rounded-[22px]" />
        </div>
      </div>
    </div>
  );
}
