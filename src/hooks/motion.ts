// Efeitos de movimento do visual (inclinação 3D, reflexo, flutuação,
// parallax e faixas que deslizam com a rolagem).
//
// Regras:
// - Tudo desliga com prefers-reduced-motion.
// - Inclinação e reflexo só com mouse (em tela de toque não há "hover", e o
//   dedo arrastando o card brigaria com a rolagem da página).
// - Os hooks escrevem direto no estilo do elemento (via CSSOM), sem
//   re-renderizar o React a cada quadro. Escrever em element.style é
//   permitido pela Content-Security-Policy (não é estilo inline no HTML).
//
// A matemática fica em funções puras, testadas em motion.test.ts.

import { useEffect, useRef, useState, type RefObject } from "react";

export interface MotionPreference {
  reducedMotion: boolean;
  finePointer: boolean;
}

// Efeitos de ponteiro (inclinar, reflexo seguindo o mouse): só com mouse e sem pedido de menos movimento.
export const pointerEffectsEnabled = ({ reducedMotion, finePointer }: MotionPreference) => !reducedMotion && finePointer;
// Efeitos de rolagem e flutuação: valem também no toque, mas não com menos movimento.
export const ambientEffectsEnabled = ({ reducedMotion }: MotionPreference) => !reducedMotion;

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

function readPreference(): MotionPreference {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return { reducedMotion: true, finePointer: false };
  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    finePointer: window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  };
}

// Preferência atual de movimento e tipo de ponteiro, atualizada se o usuário mudar.
export function useMotionPreference(): MotionPreference {
  const [preference, setPreference] = useState(readPreference);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const queries = [window.matchMedia("(prefers-reduced-motion: reduce)"), window.matchMedia("(hover: hover) and (pointer: fine)")];
    const update = () => setPreference(readPreference());
    queries.forEach((query) => query.addEventListener("change", update));
    return () => queries.forEach((query) => query.removeEventListener("change", update));
  }, []);
  return preference;
}

// Inclinação 3D que segue o mouse, com o reflexo (--holo-x/--holo-y) acompanhando.
export function useTilt<T extends HTMLElement>(max = 6): RefObject<T | null> {
  const ref = useRef<T>(null);
  const preference = useMotionPreference();
  const enabled = pointerEffectsEnabled(preference);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      const { rotateX, rotateY, x, y } = tiltAngles(event.clientX, event.clientY, element.getBoundingClientRect(), max);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.transition = "transform .12s ease-out";
        element.style.transform = tiltTransform(rotateX, rotateY);
        element.style.setProperty("--holo-x", `${Math.round(x * 100)}%`);
        element.style.setProperty("--holo-y", `${Math.round(y * 100)}%`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      element.style.transition = "transform .6s cubic-bezier(.2,.8,.2,1)";
      element.style.transform = "";
    };
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      element.style.transform = "";
      element.style.transition = "";
    };
  }, [enabled, max]);

  return ref;
}

// Flutuação contínua e discreta (o ingresso do topo "respira").
export function useFloat<T extends HTMLElement>(amplitudePx = 8, periodMs = 6000): RefObject<T | null> {
  const ref = useRef<T>(null);
  const enabled = ambientEffectsEnabled(useMotionPreference());

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
  const enabled = ambientEffectsEnabled(useMotionPreference());

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
  const enabled = ambientEffectsEnabled(useMotionPreference());
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
