// Efeitos de movimento do visual (inclinação 3D, reflexo, flutuação,
// parallax e faixas que deslizam com a rolagem).
//
// Regras:
// - Tudo desliga com prefers-reduced-motion.
// - Inclinação e reflexo só com mouse ou caneta. O tipo de ponteiro é lido
//   em cada evento (pointerType), não por media query: o Chromium no Linux
//   pode responder (hover: none)/(pointer: coarse) em notebook com touchpad,
//   e aí os efeitos sumiam mesmo com mouse. Toque nunca inclina (o dedo
//   arrastando o card brigaria com a rolagem da página).
// - Os hooks escrevem direto no estilo do elemento (via CSSOM), sem
//   re-renderizar o React a cada quadro. Escrever em element.style é
//   permitido pela Content-Security-Policy (não é estilo inline no HTML).
//
// A matemática fica em funções puras, testadas em motion.test.ts.

import { useEffect, useRef, useState, type RefObject } from "react";

export interface MotionPreference {
  reducedMotion: boolean;
}

// Efeitos de movimento (inclinar, flutuar, rolagem): desligam só com pedido de menos movimento.
export const motionEnabled = ({ reducedMotion }: MotionPreference) => !reducedMotion;

// Ponteiro que inclina o card: mouse ou caneta. Toque ("touch") nunca inclina.
export const tiltsWithPointer = (pointerType: string) => pointerType === "mouse" || pointerType === "pen";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Ângulos da inclinação a partir da posição do ponteiro dentro do elemento.
// No centro o elemento fica reto; nas bordas inclina até `max` graus.
export function tiltAngles(pointerX: number, pointerY: number, rect: { left: number; top: number; width: number; height: number }, max: number) {
  if (rect.width <= 0 || rect.height <= 0) return { rotateX: 0, rotateY: 0, x: 0.5, y: 0.5 };
  const x = clamp((pointerX - rect.left) / rect.width, 0, 1);
  const y = clamp((pointerY - rect.top) / rect.height, 0, 1);
  const round = (n: number) => Math.round(n * 100) / 100 || 0;
  return { rotateX: round((0.5 - y) * max * 2), rotateY: round((x - 0.5) * max * 2), x, y };
}

export const tiltTransform = (rotateX: number, rotateY: number) =>
  `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;

// Quanto do elemento já passou pela tela: 0 quando o topo dele entra por
// baixo, 1 quando a base sai por cima.
export function scrollProgress(rectTop: number, rectHeight: number, viewportHeight: number) {
  const total = viewportHeight + rectHeight;
  if (total <= 0) return 0;
  return clamp((viewportHeight - rectTop) / total, 0, 1);
}

// Deslocamento da flutuação no instante t (ms): sobe e desce suave.
export function floatOffset(timeMs: number, amplitudePx: number, periodMs: number) {
  if (periodMs <= 0) return 0;
  return Math.round(Math.sin((timeMs / periodMs) * Math.PI * 2) * amplitudePx * 100) / 100;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function readPreference(): MotionPreference {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return { reducedMotion: true };
  return { reducedMotion: window.matchMedia(REDUCED_MOTION).matches };
}

// Preferência atual de movimento, atualizada se o usuário mudar no sistema.
export function useMotionPreference(): MotionPreference {
  const [preference, setPreference] = useState(readPreference);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(REDUCED_MOTION);
    const update = () => setPreference(readPreference());
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return preference;
}

// Inclinação 3D que segue o mouse, com o reflexo (--holo-x/--holo-y) acompanhando.
// Enquanto inclina, o elemento ganha data-tilting (o CSS acende o reflexo por ele).
export function useTilt<T extends HTMLElement>(max = 6): RefObject<T | null> {
  const ref = useRef<T>(null);
  const enabled = motionEnabled(useMotionPreference());

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      if (!element.hasAttribute("data-tilting")) return;
      element.removeAttribute("data-tilting");
      element.style.transition = "transform .6s cubic-bezier(.2,.8,.2,1)";
      element.style.transform = "";
    };
    const onMove = (event: PointerEvent) => {
      if (!tiltsWithPointer(event.pointerType)) {
        reset();
        return;
      }
      const { rotateX, rotateY, x, y } = tiltAngles(event.clientX, event.clientY, element.getBoundingClientRect(), max);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.setAttribute("data-tilting", "");
        element.style.transition = "transform .12s ease-out";
        element.style.transform = tiltTransform(rotateX, rotateY);
        element.style.setProperty("--holo-x", `${Math.round(x * 100)}%`);
        element.style.setProperty("--holo-y", `${Math.round(y * 100)}%`);
      });
    };
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", reset);
    element.addEventListener("pointercancel", reset);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", reset);
      element.removeEventListener("pointercancel", reset);
      element.removeAttribute("data-tilting");
      element.style.transform = "";
      element.style.transition = "";
    };
  }, [enabled, max]);

  return ref;
}

// Flutuação contínua e discreta (o ingresso do topo "respira").
export function useFloat<T extends HTMLElement>(amplitudePx = 8, periodMs = 6000): RefObject<T | null> {
  const ref = useRef<T>(null);
  const enabled = motionEnabled(useMotionPreference());

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      element.style.translate = `0 ${floatOffset(now - start, amplitudePx, periodMs)}px`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.style.translate = "";
    };
  }, [enabled, amplitudePx, periodMs]);

  return ref;
}

// Parallax e faixas: escreve o progresso da rolagem em variáveis CSS do elemento.
//   --scroll  de 0 a 1 (quanto do elemento já passou pela tela)
//   --shift   em px, de -range a +range (para deslizar faixas)
//   --parallax em px, de 0 a range (para descer devagar ao rolar)
export function useScrollShift<T extends HTMLElement>(range = 220): RefObject<T | null> {
  const ref = useRef<T>(null);
  const enabled = motionEnabled(useMotionPreference());

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const progress = scrollProgress(rect.top, rect.height, window.innerHeight);
      element.style.setProperty("--scroll", progress.toFixed(3));
      element.style.setProperty("--shift", `${Math.round((progress - 0.5) * 2 * range)}px`);
      element.style.setProperty("--parallax", `${Math.round(progress * range)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled, range]);

  return ref;
}

// Entrada na rolagem: devolve um ref e se o elemento já apareceu.
// Sem IntersectionObserver ou com menos movimento, aparece direto.
export function useReveal<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const enabled = motionEnabled(useMotionPreference());
  const [revealed, setRevealed] = useState(!enabled);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);

  return [ref, revealed];
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);

export interface HeroDropLayout {
  center: number;
  height: number;
  slot: number;
}

// Percurso do ingresso do topo (como no protótipo): ele acompanha a rolagem
// até a linha do meio das fitas (a "fenda"), entra nela de baixo para cima e
// só some de vez no final. Coordenadas da página, medidas com ele parado.
export function heroDropTravel({ center, height, slot }: HeroDropLayout) {
  return Math.max(0, slot + height / 2 - center);
}

export function heroDropFrame(drop: number, layout: HeroDropLayout, viewportWidth: number) {
  const travel = heroDropTravel(layout);
  const progress = travel ? clamp(drop / travel, 0, 1) : 0;
  const cut = clamp(layout.center + drop + layout.height / 2 - layout.slot, 0, layout.height);
  const fade = layout.height ? smoothstep(clamp((cut / layout.height - 0.65) / 0.35, 0, 1)) : 0;
  const swayMax = viewportWidth < 600 ? 1.5 : viewportWidth < 960 ? 3.5 : 7;
  const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits || 0;
  return {
    drop: round(drop, 2),
    sway: round(-Math.sin(progress * Math.PI) * swayMax, 3),
    scale: round(1 - fade * 0.08, 4),
    opacity: round(1 - fade, 4),
    cut: round(cut, 1),
  };
}

// Liga o percurso: o elemento desce com a rolagem até o elemento `slot` (as
// fitas). Escreve --drop, --sway, --tks e --tko e corta a parte que já entrou
// na fenda (clip-path). Suavizado com inércia, igual em 60 ou 120 Hz.
export function useHeroDrop<T extends HTMLElement>(slotSelector: string): RefObject<T | null> {
  const ref = useRef<T>(null);
  const enabled = motionEnabled(useMotionPreference());

  useEffect(() => {
    const element = ref.current;
    const slotElement = document.querySelector<HTMLElement>(slotSelector);
    if (!element || !slotElement || !enabled) return;
    let layout: HeroDropLayout = { center: 0, height: 0, slot: 0 };
    let current = 0;
    let frame = 0;
    let last = 0;

    const measure = () => {
      const keepTransform = element.style.transform;
      element.style.transform = "none";
      const rect = element.getBoundingClientRect();
      element.style.transform = keepTransform;
      const slotRect = slotElement.getBoundingClientRect();
      layout = {
        center: rect.top + window.scrollY + rect.height / 2,
        height: rect.height,
        slot: slotRect.top + window.scrollY + slotRect.height / 2,
      };
    };
    const target = () => clamp(window.scrollY * 0.9, 0, heroDropTravel(layout));
    const render = () => {
      const f = heroDropFrame(current, layout, window.innerWidth);
      element.style.setProperty("--drop", `${f.drop}px`);
      element.style.setProperty("--sway", `${f.sway}deg`);
      element.style.setProperty("--tks", String(f.scale));
      element.style.setProperty("--tko", String(f.opacity));
      element.style.clipPath = f.cut > 0 ? `inset(-80px -80px ${f.cut}px -80px)` : "";
    };
    const tick = (now: number) => {
      frame = 0;
      const dt = Math.min(64, now - (last || now));
      last = now;
      const goal = target();
      current += (goal - current) * (1 - Math.pow(1 - 0.12, dt / 16.67));
      if (Math.abs(goal - current) < 0.05) {
        current = goal;
        last = 0;
        render();
        return;
      }
      render();
      frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onResize = () => {
      measure();
      schedule();
    };

    measure();
    current = target();
    render();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    observer?.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
      for (const name of ["--drop", "--sway", "--tks", "--tko"]) element.style.removeProperty(name);
      element.style.clipPath = "";
    };
  }, [enabled, slotSelector]);

  return ref;
}
