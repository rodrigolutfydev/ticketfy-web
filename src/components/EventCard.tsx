// Card de evento em formato de ingresso fino: foto em cima, picote com dois
// recortes de verdade (máscara, então o fundo aparece pelo furo) e o canhoto
// embaixo com data, nome, local e preço. Todos os cards têm a mesma altura
// (nome reservado em 2 linhas).
//
// Efeitos (só com mouse e sem "menos movimento"): sobe, brilho atrás, zoom
// na foto, reflexo atravessando e o picote "andando". Tudo em CSS (.tf-tk).

import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, MapPin } from "lucide-react";
import type { EventSummary } from "../api/types";
import type { Locale } from "../i18n/locale";
import { categoryLabel } from "../i18n/categories";
import { dateParts, formatDate, formatPrice } from "../utils/format";
import { useI18n } from "../i18n/LocaleContext";
import EventCover from "./EventCover";
import { Skeleton } from "./ui";

export interface EventCardLabels {
  featured: string;
  soldOut: string;
  seeTickets: string;
  tickets: string;
  from: string;
  free: string;
}

// O que o canhoto mostra no lugar do preço.
export function priceLine(event: Pick<EventSummary, "minPrice" | "soldOut">, labels: EventCardLabels, locale: Locale) {
  if (event.soldOut) return { prefix: null, value: labels.soldOut, muted: true };
  if (event.minPrice === null) return { prefix: null, value: labels.tickets, muted: true };
  if (event.minPrice === 0) return { prefix: null, value: labels.free, muted: false };
  return { prefix: labels.from, value: formatPrice(event.minPrice, locale), muted: false };
}

// Selos sobre a foto, na ordem em que aparecem.
export function cardBadges(event: Pick<EventSummary, "featured" | "soldOut">, labels: EventCardLabels) {
  const badges: { key: string; text: string; tone: "accent" | "dark" }[] = [];
  if (event.soldOut) badges.push({ key: "sold", text: labels.soldOut, tone: "dark" });
  else if (event.featured) badges.push({ key: "featured", text: labels.featured, tone: "accent" });
  return badges;
}

// Parte visual, sem depender de contexto de idioma (testada em EventCard.test.ts).
export function EventTicketCard({
  event,
  labels,
  locale,
  categoryText,
  cover,
}: {
  event: EventSummary;
  labels: EventCardLabels;
  locale: Locale;
  categoryText?: string;
  cover: ReactNode;
}) {
  const { day, month, weekday } = dateParts(event.startsAt, locale);
  const price = priceLine(event, labels, locale);
  const badges = cardBadges(event, labels);
  return (
    <Link
      to={`/events/${event.id}`}
      className={`tf-tk group h-full ${event.soldOut ? "is-sold" : ""}`}
      aria-label={`${event.name}, ${formatDate(event.startsAt, locale)}`}
    >
      <div className="tf-tk-shape tf-cut-y h-full">
        <div className="tf-tk-photo">{cover}</div>
        <div className="flex flex-1 flex-col gap-4 px-[18px] pb-[18px] pt-5">
          <div className="flex gap-3">
            <div className="tf-tk-date" aria-hidden>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{weekday}</span>
              <span className="my-[5px] font-display text-[25px] font-extrabold tracking-[-0.04em] text-ink">{day}</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-text">{month}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 title={event.name} className="line-clamp-2 min-h-[2lh] break-words font-display text-[17px] font-bold leading-[1.22] tracking-[-0.035em] text-ink">
                {event.name}
              </h3>
              <p className="flex items-start gap-1.5 text-sm leading-snug text-muted">
                <MapPin size={15} className="mt-0.5 shrink-0 opacity-80" aria-hidden />
                <span className="line-clamp-2">
                  {event.venueName} · {event.city}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-auto flex items-end justify-between gap-2.5">
            <p className="min-w-0">
              {price.prefix && <span className="block text-xs text-muted">{price.prefix}</span>}
              <span
                className={`tabular block whitespace-nowrap font-display text-xl font-extrabold leading-tight tracking-[-0.035em] ${
                  price.muted ? "text-muted" : "text-ink"
                }`}
              >
                {price.value}
              </span>
            </p>
            {!event.soldOut && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink transition-shadow group-hover:shadow-[0_0_0_4px_var(--accent-soft),0_10px_26px_var(--accent-glow)]">
                {labels.seeTickets}
                <ArrowRight size={15} aria-hidden />
              </span>
            )}
          </div>
        </div>
      </div>

      {(badges.length > 0 || categoryText) && (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <span className="flex gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge.key}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] ${
                  badge.tone === "accent"
                    ? "bg-accent text-accent-ink shadow-[0_6px_18px_rgb(0_0_0/0.35)]"
                    : "border border-white/30 bg-[rgb(2_2_3/0.78)] text-white"
                }`}
              >
                {badge.text}
              </span>
            ))}
          </span>
          {categoryText && (
            <span className="rounded-full bg-[rgb(2_2_3/0.6)] px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur">{categoryText}</span>
          )}
        </div>
      )}
    </Link>
  );
}

export default function EventCard({ event }: { event: EventSummary }) {
  const { t, locale } = useI18n();
  const labels: EventCardLabels = {
    featured: t.eventCard.featured,
    soldOut: t.look.card.soldOut,
    seeTickets: t.eventCard.seeTickets,
    tickets: t.eventCard.tickets,
    from: t.eventCard.from,
    free: t.common.free,
  };
  return (
    <EventTicketCard
      event={event}
      labels={labels}
      locale={locale}
      categoryText={event.category ? categoryLabel(event.category, locale) : undefined}
      cover={<EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} />}
    />
  );
}

export function EventCardSkeleton() {
  return (
    <div className="tf-panel overflow-hidden rounded-[18px]">
      <Skeleton className="h-[170px] rounded-none" />
      <div className="flex flex-col gap-3 px-[18px] py-5">
        <div className="flex gap-3">
          <Skeleton className="h-[62px] w-[52px] rounded-xl" />
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-9 w-28 rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}
