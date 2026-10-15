// Carrossel "Próximos eventos" da home: roda infinita (cópias dos cards nas
// pontas), card do meio maior, setas, bolinhas, teclado, rodinha e arrastar.
// Cada card inclina com o mouse e o reflexo segue o ponteiro; inclinação e
// reflexo desligam no toque e com "menos movimento". A matemática fica em
// utils/rail.ts (testada em rail.test.ts).

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { EventSummary } from "../api/types";
import { useI18n } from "../i18n/LocaleContext";
import { useMotionPreference, useTilt } from "../hooks/motion";
import { dotTarget, dragPosition, railCardLook, recenter, releaseDirection, stepTarget, wrapIndex } from "../utils/rail";
import EventCard from "./EventCard";

interface RailControls {
  step: (direction: number) => void;
  goToDot: (dot: number) => void;
}

function useRail(count: number, reducedMotion: boolean) {
  const railRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const controls = useRef<RailControls | null>(null);
  const [center, setCenter] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    const track = trackRef.current;
    if (!rail || !track || count < 2) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const car = { pos: count, target: count, frame: 0, last: 0, center: -1, dragging: false };
    let look = { highlight: 0.2, near: 1, far: 0.38 };
    let stepPx = 312;

    const measure = () => {
      const style = getComputedStyle(rail);
      look = {
        highlight: parseFloat(style.getPropertyValue("--hl")) || 0,
        near: parseFloat(style.getPropertyValue("--near")) || 1,
        far: parseFloat(style.getPropertyValue("--far")) || 0.4,
      };
      stepPx = cards[0].offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);
    };

    const render = () => {
      track.style.transform = `translate3d(${(-car.pos * stepPx).toFixed(2)}px,0,0)`;
      cards.forEach((card, i) => {
        const { scale, opacity } = railCardLook(i - car.pos, look);
        card.style.transform = `scale(${scale})`;
        card.style.opacity = String(opacity);
      });
      const nearest = Math.round(car.pos);
      if (nearest !== car.center) {
        car.center = nearest;
        cards.forEach((card, i) => card.classList.toggle("is-center", i === nearest));
        setCenter(wrapIndex(nearest, count));
      }
    };

    const tick = (now: number) => {
      car.frame = 0;
      const dt = Math.min(64, now - (car.last || now));
      car.last = now;
      const k = reducedMotion ? 1 : 1 - Math.pow(1 - 0.16, dt / 16.67);
      if (!car.dragging) car.pos += (car.target - car.pos) * k;
      if (!car.dragging && Math.abs(car.target - car.pos) < 0.0008) {
        car.pos = car.target;
        const shift = recenter(car.target, count);
        if (shift) {
          car.pos += shift;
          car.target += shift;
          car.center = -1;
        }
        car.last = 0;
        render();
        return;
      }
      render();
      car.frame = requestAnimationFrame(tick);
    };
    const run = () => {
      if (!car.frame) car.frame = requestAnimationFrame(tick);
    };
    const goTo = (position: number) => {
      car.target = Math.round(position);
      run();
    };
    controls.current = {
      step: (direction) => goTo(stepTarget(car.pos, car.target, direction)),
      goToDot: (dot) => goTo(dotTarget(Math.round(car.target), dot, count)),
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      controls.current?.step(event.key === "ArrowRight" ? 1 : -1);
    };

    let wheelTotal = 0;
    let wheelLocked = false;
    let wheelIdle = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      window.clearTimeout(wheelIdle);
      wheelIdle = window.setTimeout(() => {
        wheelTotal = 0;
        wheelLocked = false;
      }, 180);
      if (wheelLocked) return;
      wheelTotal += event.deltaX;
      if (Math.abs(wheelTotal) > 30) {
        controls.current?.step(Math.sign(wheelTotal));
        wheelLocked = true;
        wheelTotal = 0;
      }
    };

    let drag: { x: number; y: number; base: number; from: number; active: boolean; velocity: number; lastX: number; lastT: number } | null = null;
    let justDragged = false;
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const now = performance.now();
      drag = { x: event.clientX, y: event.clientY, base: Math.round(car.pos), from: car.pos, active: false, velocity: 0, lastX: event.clientX, lastT: now };
    };
    const onMove = (event: PointerEvent) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          drag = null;
          return;
        }
        if (Math.abs(dx) < 8) return;
        drag.active = true;
        car.dragging = true;
        rail.setPointerCapture(event.pointerId);
        rail.classList.add("is-dragging");
      }
      const now = performance.now();
      drag.velocity = (event.clientX - drag.lastX) / Math.max(1, now - drag.lastT);
      drag.lastX = event.clientX;
      drag.lastT = now;
      car.pos = dragPosition(drag.from, drag.base, dx, stepPx);
      render();
    };
    const onUp = () => {
      if (!drag) return;
      if (drag.active) {
        car.dragging = false;
        car.target = drag.base + releaseDirection(car.pos - drag.base, drag.velocity);
        justDragged = true;
        window.setTimeout(() => (justDragged = false), 50);
        rail.classList.remove("is-dragging");
        run();
      }
      drag = null;
    };
    const onClick = (event: MouseEvent) => {
      if (!justDragged) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const onDragStart = (event: DragEvent) => event.preventDefault();
    const onResize = () => {
      measure();
      render();
    };

    rail.addEventListener("keydown", onKey);
    rail.addEventListener("wheel", onWheel, { passive: false });
    rail.addEventListener("pointerdown", onDown);
    rail.addEventListener("pointermove", onMove);
    rail.addEventListener("pointerup", onUp);
    rail.addEventListener("pointercancel", onUp);
    rail.addEventListener("click", onClick, true);
    rail.addEventListener("dragstart", onDragStart);
    window.addEventListener("resize", onResize);
    measure();
    render();

    return () => {
      cancelAnimationFrame(car.frame);
      window.clearTimeout(wheelIdle);
      controls.current = null;
      rail.removeEventListener("keydown", onKey);
      rail.removeEventListener("wheel", onWheel);
      rail.removeEventListener("pointerdown", onDown);
      rail.removeEventListener("pointermove", onMove);
      rail.removeEventListener("pointerup", onUp);
      rail.removeEventListener("pointercancel", onUp);
      rail.removeEventListener("click", onClick, true);
      rail.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("resize", onResize);
      rail.classList.remove("is-dragging");
      track.style.transform = "";
      cards.forEach((card) => {
        card.style.transform = "";
        card.style.opacity = "";
        card.classList.remove("is-center");
      });
    };
  }, [count, reducedMotion]);

  return { railRef, trackRef, controls, center };
}

function TiltingCard({ event, clone }: { event: EventSummary; clone: boolean }) {
  const tiltRef = useTilt<HTMLDivElement>(8);
  return (
    <div ref={tiltRef} className="tf-rail-tilt grid">
      <EventCard event={event} tabIndex={clone ? -1 : undefined} />
    </div>
  );
}

export default function UpcomingRail({ events, title, eyebrow }: { events: EventSummary[]; title: string; eyebrow: string }) {
  const { t } = useI18n();
  const h = t.look.home;
  const { reducedMotion } = useMotionPreference();
  const count = events.length;
  const looping = count > 1;
  const { railRef, trackRef, controls, center } = useRail(count, reducedMotion);

  const slides = looping
    ? [...events, ...events, ...events].map((event, i) => ({ event, key: `${i}-${event.id}`, clone: i < count || i >= 2 * count }))
    : events.map((event) => ({ event, key: event.id, clone: false }));

  const arrow =
    "flex h-12 w-12 items-center justify-center rounded-full text-ink shadow-[inset_0_0_0_1px_var(--line)] transition-[transform,background-color,box-shadow] hover:scale-105 hover:bg-accent-soft hover:shadow-[inset_0_0_0_1px_var(--accent)] active:scale-95";

  return (
    <section className="tf-agenda relative pt-12 sm:pt-16" aria-labelledby="proximos-titulo">
      <div className="page-container flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="proximos-titulo" className="text-[clamp(1.875rem,3.4vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-ink">
            {title}
          </h2>
        </div>
        {looping && (
          <div className="flex gap-2.5">
            <button type="button" className={arrow} onClick={() => controls.current?.step(-1)} aria-label={h.prevUpcoming} aria-controls="proximos-trilho">
              <ArrowLeft size={16} aria-hidden />
            </button>
            <button type="button" className={arrow} onClick={() => controls.current?.step(1)} aria-label={h.nextUpcoming} aria-controls="proximos-trilho">
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div
        ref={railRef}
        id="proximos-trilho"
        className={`tf-rail ${looping ? "is-looping" : ""}`}
        tabIndex={looping ? 0 : undefined}
        aria-label={h.upcomingRail}
      >
        <div ref={trackRef} className="tf-rail-track">
          {slides.map(({ event, key, clone }) => (
            <div key={key} className={`tf-rail-card ${looping ? "" : "is-center"}`} aria-hidden={clone || undefined}>
              <TiltingCard event={event} clone={clone} />
            </div>
          ))}
        </div>
      </div>

      {looping && (
        <div className="flex justify-center gap-2" role="group" aria-label={h.upcomingDots}>
          {events.map((event, i) => (
            <button
              key={event.id}
              type="button"
              className="tf-rail-dot"
              aria-label={h.goToUpcoming(i + 1, count)}
              aria-current={i === center ? "true" : undefined}
              onClick={() => controls.current?.goToDot(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
