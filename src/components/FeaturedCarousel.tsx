import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router";
import { Pause, Play } from "lucide-react";
import type { EventSummary } from "../api/types";
import EventCover from "./EventCover";

// Tempo de cada foto na vitrine.
const INTERVAL_MS = 3000;
// Quanto o dedo precisa arrastar (em px) para trocar de foto.
const SWIPE_PX = 48;

function usePrefersReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduce, setReduce] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setReduce(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

// Vitrine "palco": só as fotos dos eventos em destaque, trocando sozinhas.
// Embaixo, um segmento por foto; o da foto atual enche como barra de progresso.
export default function FeaturedCarousel({ events }: { events: EventSummary[] }) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const startX = useRef<number | null>(null);
  const dragged = useRef(false);
  const count = events.length;
  const autoplay = count > 1 && !hovering && !userPaused && !reduceMotion;

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Um timer por foto (e não um intervalo fixo): pausar e continuar recomeça a contagem da foto atual.
  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [autoplay, count, index]);

  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  function onPointerDown(e: PointerEvent) {
    startX.current = e.clientX;
    dragged.current = false;
  }
  function onPointerUp(e: PointerEvent) {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    startX.current = null;
    if (count > 1 && Math.abs(delta) > SWIPE_PX) {
      dragged.current = true; // impede que o arraste vire clique no link
      go(delta < 0 ? 1 : -1);
    }
  }

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Eventos em destaque"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHovering(false)}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (startX.current = null)}
        className="relative aspect-[4/3] touch-pan-y select-none overflow-hidden rounded-2xl border border-line bg-raised sm:aspect-[21/9] lg:aspect-auto lg:h-[420px] 2xl:h-[480px]"
      >
        {events.map((event, i) => {
          const active = i === index;
          return (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              draggable={false}
              onClick={(e) => dragged.current && e.preventDefault()}
              aria-label={`${event.name}: ver evento e ingressos`}
              aria-hidden={!active}
              tabIndex={active ? 0 : -1}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} fit="contain" large />
            </Link>
          );
        })}
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" role="group" aria-label="Escolher destaque">
            {events.map((event, i) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Destaque ${i + 1} de ${count}: ${event.name}`}
                aria-current={i === index}
                className="group flex h-6 items-center"
              >
                <span className="relative block h-1 w-8 overflow-hidden rounded-full bg-line-strong group-hover:bg-subtle sm:w-10">
                  {i === index && (
                    <span
                      key={`${index}-${autoplay}`}
                      className={`absolute inset-y-0 left-0 rounded-full bg-accent ${autoplay ? "animate-progress" : "w-full"}`}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          {!reduceMotion && (
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? "Continuar passagem automática" : "Pausar passagem automática"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"
            >
              {userPaused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
