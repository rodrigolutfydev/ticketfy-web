// Ingresso grande do topo da home, com os dados de um evento real (o
// primeiro destaque). Inclina com o mouse (o reflexo holográfico acompanha),
// flutua de leve e desce com a rolagem até "entrar" nas fitas, como no
// protótipo. A inclinação não liga no toque; tudo desliga com "menos movimento".

import { Link } from "react-router";
import type { EventSummary } from "../api/types";
import { useFloat, useHeroDrop, useTilt } from "../hooks/motion";
import { useI18n } from "../i18n/LocaleContext";
import { dateParts, formatPrice, formatTime } from "../utils/format";
import EventCover from "./EventCover";

// Larguras das barras do código de barras decorativo do canhoto.
const BARS = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1];

export default function PaperTicket({ event }: { event: EventSummary }) {
  const { t, locale } = useI18n();
  const h = t.look.home;
  const dropRef = useHeroDrop<HTMLDivElement>("[data-hero-slot]", "[data-hero-repel]");
  const floatRef = useFloat<HTMLDivElement>(8, 6500);
  const tiltRef = useTilt<HTMLAnchorElement>(7);
  const { day, month } = dateParts(event.startsAt, locale);

  let x = 0;
  const bars = BARS.map((width) => {
    const bar = { x, width };
    x += width + 2;
    return bar;
  });

  return (
    <div ref={dropRef} className="tf-hero-drop w-full max-w-[392px] shrink-0 max-lg:mx-auto">
      <div ref={floatRef} className="rotate-[4deg] max-lg:-rotate-3">
        <Link ref={tiltRef} to={`/events/${event.id}`} className="tf-paper tf-cut-y" aria-label={h.ticketAria(event.name)}>
          <div className="flex justify-between px-[18px] pb-3 pt-3.5 text-[11px] font-bold tracking-[0.16em]" aria-hidden>
            <span className="text-accent-text">{h.ticketTop}</span>
            <span className="tf-pulse text-accent-text">●</span>
          </div>
          <div className="mx-3.5 h-[200px] overflow-hidden rounded-xl shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_14px_30px_rgb(0_0_0/0.45)] sm:h-[228px] short-lg:h-[130px]">
            <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} large />
          </div>
          <div className="flex flex-col gap-3 px-[18px] pb-5 pt-4">
            <p className="line-clamp-2 font-display text-[25px] font-extrabold leading-[1.15] tracking-[-0.04em]">{event.name}</p>
            <p className="-mt-1 truncate text-[15px] text-muted">{event.venueName}</p>
            <dl className="flex justify-between gap-2.5">
              <div>
                <dt className="text-[11px] font-bold tracking-[0.14em] text-accent-text">{h.date}</dt>
                <dd className="text-[15px] font-semibold">
                  {day} {month}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] font-bold tracking-[0.14em] text-accent-text">{h.city}</dt>
                <dd className="truncate text-[15px] font-semibold">{event.city}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-[0.14em] text-accent-text">{h.time}</dt>
                <dd className="tabular text-[15px] font-semibold">{formatTime(event.startsAt, locale)}</dd>
              </div>
            </dl>
          </div>
          <div className="flex h-[84px] items-center justify-between px-[18px] pt-1.5">
            <div>
              {event.minPrice !== null && event.minPrice > 0 && <p className="text-[13px] text-muted">{h.from}</p>}
              <p className="tabular font-display text-[27px] font-extrabold leading-[1.1] tracking-[-0.04em] [text-shadow:0_0_22px_var(--accent-glow)]">
                {event.minPrice === null ? t.eventCard.tickets : event.minPrice === 0 ? t.common.free : formatPrice(event.minPrice, locale)}
              </p>
            </div>
            <svg width="110" height="38" viewBox={`0 0 ${x} 32`} preserveAspectRatio="none" aria-hidden className="fill-current opacity-85">
              {bars.map((bar) => (
                <rect key={bar.x} x={bar.x} width={bar.width} height="32" />
              ))}
            </svg>
          </div>
          <span className="tf-holo" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
