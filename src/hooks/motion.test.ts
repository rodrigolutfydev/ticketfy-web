import { describe, expect, it, vi } from "vitest";
import {
  floatOffset,
  heroDropFrame,
  heroDropTravel,
  heroRepel,
  heroRepelSide,
  motionEnabled,
  scrollProgress,
  tiltAngles,
  tiltTransform,
  tiltsWithPointer,
  trackHoverPointer,
} from "./motion";

describe("quando os efeitos ligam", () => {
  it("desligam só com pedido de menos movimento", () => {
    expect(motionEnabled({ reducedMotion: false })).toBe(true);
    expect(motionEnabled({ reducedMotion: true })).toBe(false);
  });

  it("inclinação vale para mouse e caneta, nunca para toque", () => {
    expect(tiltsWithPointer("mouse")).toBe(true);
    expect(tiltsWithPointer("pen")).toBe(true);
    expect(tiltsWithPointer("touch")).toBe(false);
    expect(tiltsWithPointer("")).toBe(false);
  });
});

describe("hover do CSS segue o ponteiro de verdade", () => {
  // Sem DOM nos testes: um EventTarget faz o papel do window e um objeto
  // simples guarda os atributos do <html>.
  function setup() {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    const attrs = new Set<string>();
    const root = {
      setAttribute: (name: string) => attrs.add(name),
      removeAttribute: (name: string) => attrs.delete(name),
    } as unknown as HTMLElement;
    const stop = trackHoverPointer(root);
    const fire = (type: string, pointerType: string) => target.dispatchEvent(Object.assign(new Event(type), { pointerType }));
    return { attrs, stop, fire };
  }

  it("liga com mouse ou caneta, mesmo sem (hover: hover)", () => {
    const { attrs, fire } = setup();
    expect(attrs.has("data-hover")).toBe(false);
    fire("pointermove", "mouse");
    expect(attrs.has("data-hover")).toBe(true);
  });

  it("toque desliga; caneta liga de novo", () => {
    const { attrs, fire } = setup();
    fire("pointermove", "mouse");
    fire("pointerdown", "touch");
    expect(attrs.has("data-hover")).toBe(false);
    fire("pointermove", "pen");
    expect(attrs.has("data-hover")).toBe(true);
  });

  it("para de ouvir depois de desligado", () => {
    const { attrs, stop, fire } = setup();
    stop();
    fire("pointermove", "mouse");
    expect(attrs.has("data-hover")).toBe(false);
  });
});

describe("busca do topo se recolhe quando o ingresso passa", () => {
  // Busca de 100px de altura entre 1000 e 1100; ingresso de 500px.
  const bar = [1000, 1100] as const;

  it("parada enquanto o ingresso está longe", () => {
    expect(heroRepel(300, 800, ...bar)).toBe(0);
  });

  it("começa a recolher antes de encostar", () => {
    const value = heroRepel(450, 950, ...bar);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(1);
  });

  it("toda recolhida com o ingresso por cima dela", () => {
    expect(heroRepel(700, 1200, ...bar)).toBe(1);
  });

  it("volta ao normal depois que o ingresso passou", () => {
    expect(heroRepel(1200, 1700, ...bar)).toBe(0);
    expect(heroRepel(1150, 1650, ...bar)).toBeGreaterThan(0);
  });

  it("recua para longe do ingresso; no meio, só encolhe", () => {
    expect(heroRepelSide(1100, 40, 1360)).toBe(-1);
    expect(heroRepelSide(100, 40, 1360)).toBe(1);
    expect(heroRepelSide(195, 16, 358)).toBe(0);
  });
});

describe("descida do ingresso do topo", () => {
  const layout = { center: 400, height: 500, slot: 1000 };

  it("o percurso vai até o ingresso entrar inteiro na fenda das fitas", () => {
    expect(heroDropTravel(layout)).toBe(850);
    expect(heroDropTravel({ center: 2000, height: 500, slot: 1000 })).toBe(0);
  });

  it("parado no topo: sem descida, sem corte, sem balanço", () => {
    expect(heroDropFrame(0, layout, 1440)).toEqual({ drop: 0, sway: 0, scale: 1, opacity: 1, cut: 0 });
  });

  it("no meio do caminho balança e começa a entrar na fenda", () => {
    const frame = heroDropFrame(425, layout, 1440);
    expect(frame.sway).toBe(-7);
    expect(frame.cut).toBe(75);
    expect(frame.opacity).toBe(1);
  });

  it("no fim está todo dentro da fenda e sumiu", () => {
    const frame = heroDropFrame(850, layout, 1440);
    expect(frame.cut).toBe(500);
    expect(frame.opacity).toBe(0);
    expect(frame.scale).toBe(0.92);
  });

  it("balança menos em tela estreita", () => {
    expect(heroDropFrame(425, layout, 390).sway).toBe(-1.5);
  });
});

describe("tiltAngles", () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };

  it("fica reto com o ponteiro no centro", () => {
    expect(tiltAngles(200, 100, rect, 6)).toEqual({ rotateX: 0, rotateY: 0, x: 0.5, y: 0.5 });
  });

  it("inclina até o máximo nas bordas, no sentido do ponteiro", () => {
    const topLeft = tiltAngles(100, 50, rect, 6);
    expect(topLeft.rotateX).toBe(6);
    expect(topLeft.rotateY).toBe(-6);
    const bottomRight = tiltAngles(300, 150, rect, 6);
    expect(bottomRight.rotateX).toBe(-6);
    expect(bottomRight.rotateY).toBe(6);
  });

  it("não passa do máximo com o ponteiro fora do elemento", () => {
    const outside = tiltAngles(9999, -9999, rect, 4);
    expect(outside.rotateY).toBe(4);
    expect(outside.rotateX).toBe(4);
  });

  it("não quebra com elemento sem tamanho", () => {
    expect(tiltAngles(10, 10, { left: 0, top: 0, width: 0, height: 0 }, 6)).toEqual({ rotateX: 0, rotateY: 0, x: 0.5, y: 0.5 });
  });

  it("gera a transformação com perspectiva", () => {
    expect(tiltTransform(3, -2)).toBe("perspective(1000px) rotateX(3deg) rotateY(-2deg) translateZ(0)");
  });
});

describe("scrollProgress", () => {
  it("vai de 0 (entrando por baixo) a 1 (saindo por cima)", () => {
    expect(scrollProgress(800, 200, 800)).toBe(0);
    expect(scrollProgress(-200, 200, 800)).toBe(1);
    expect(scrollProgress(300, 200, 800)).toBe(0.5);
  });

  it("fica entre 0 e 1 fora da tela", () => {
    expect(scrollProgress(5000, 200, 800)).toBe(0);
    expect(scrollProgress(-5000, 200, 800)).toBe(1);
  });
});

describe("floatOffset", () => {
  it("sobe e desce dentro da amplitude, voltando ao início a cada período", () => {
    expect(floatOffset(0, 8, 6000)).toBe(0);
    expect(floatOffset(1500, 8, 6000)).toBe(8);
    expect(floatOffset(4500, 8, 6000)).toBe(-8);
    expect(floatOffset(6000, 8, 6000)).toBeCloseTo(0, 5);
  });

  it("fica parado com período inválido", () => {
    expect(floatOffset(1000, 8, 0)).toBe(0);
  });
});
