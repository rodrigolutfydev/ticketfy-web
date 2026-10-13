import { Link } from "react-router";
import { ArrowRight, MapPin } from "lucide-react";
import type { EventSummary } from "../api/types";
import { categoryLabel } from "../i18n/categories";
import { eventStamp, formatDate, formatPrice } from "../utils/format";
import { useI18n } from "../i18n/LocaleContext";
import EventCover from "./EventCover";
import { Skeleton } from "./ui";

// Cartão de evento no formato de ingresso: foto em cima, picote com dois
// recortes laterais e o "canhoto" embaixo. Todos os cartões têm a mesma altura
// (nome reservado em 2 linhas).
export default function EventCard({ event }: { event: EventSummary }) {
  const { t, locale } = useI18n();
  return (
    <Link
      to={`/events/${event.id}`}
      className="elevated group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-line-strong"
      aria-label={`${event.name}, ${formatDate(event.startsAt, locale)}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-line bg-raised">
        <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        {event.featured && (
          <span className="absolute left-3 top-3 rounded-md bg-accent px-2 py-1 text-[11px] font-bold text-accent-ink">{t.eventCard.featured}</span>
        )}
        {event.category && (
          <span className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {categoryLabel(event.category, locale)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pt-4">
        <p className="tabular text-[11px] font-bold tracking-wide text-accent-text">{eventStamp(event.startsAt, locale)}</p>
        <h3 title={event.name} className="mt-2 line-clamp-2 min-h-[2lh] break-words text-lg font-semibold leading-snug text-ink">
          {event.name}
        </h3>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
          <MapPin size={15} className="shrink-0" aria-hidden />
          <span className="truncate">
            {event.venueName} • {event.city}
          </span>
        </p>
      </div>

      {/* Picote: linha tracejada com os dois recortes "mordendo" as laterais. */}
      <div className="relative mt-4 h-0" aria-hidden>
        <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border border-line bg-canvas" />
        <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full border border-line bg-canvas" />
        <span className="absolute inset-x-4 top-0 border-t border-dashed border-line-strong" />
      </div>

      <div className="flex items-center justify-between px-4 py-3.5 text-sm">
        <PriceLabel minPrice={event.minPrice} />
        <span className="inline-flex items-center gap-1 font-semibold text-accent-text">
          {t.eventCard.seeTickets} <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function PriceLabel({ minPrice }: { minPrice: number | null }) {
  const { t, locale } = useI18n();
  if (minPrice === null) return <span className="text-muted">{t.eventCard.tickets}</span>;
  if (minPrice === 0) return <span className="font-semibold text-ink">{t.common.free}</span>;
  return (
    <span className="text-muted">
      {t.eventCard.from} <span className="tabular font-semibold text-ink">{formatPrice(minPrice, locale)}</span>
    </span>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Skeleton className="aspect-[16/9] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
