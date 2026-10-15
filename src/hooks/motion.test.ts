import { describe, expect, it, vi } from "vitest";
import {
  floatOffset,
  heroDropFrame,
  heroDropTravel,
  heroSearchClosed,
  searchStages,
  closedForRetraction,
  searchRetraction,
  barRiseRepel,
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

describe("busca do topo se recolhe quando o ingresso desce", () => {
  // Ingresso parado com a base em 670; busca começando em 772 (contato em 764).
  const rest = 670;
  const barTop = 772;

  it("aberta com o ingresso parado", () => {
    expect(heroSearchClosed(670, rest, barTop, 0.45)).toBe(0);
  });

  it("ao encostar já recolheu o mínimo pedido", () => {
    expect(heroSearchClosed(764, rest, barTop, 0.45)).toBeGreaterThanOrEqual(0.45);
  });

  it("some de vez 520px depois de encostar", () => {
    expect(heroSearchClosed(764 + 520, rest, barTop, 0.45)).toBe(1);
  });

  it("sempre crescente e sem saltos nem paradas no caminho", () => {
    let previous = 0;
    let maxStep = 0;
    for (let bottom = 671; bottom <= 1284; bottom++) {
      const value = heroSearchClosed(bottom, rest, barTop, 0.45);
      expect(value).toBeGreaterThanOrEqual(previous);
      maxStep = Math.max(maxStep, value - previous);
      previous = value;
    }
    expect(maxStep).toBeLessThan(0.02);
  });

  it("sem freada no contato: a velocidade quase não muda de um lado para o outro", () => {
    const step = (bottom: number) => heroSearchClosed(bottom + 1, rest, barTop, 0.45) - heroSearchClosed(bottom, rest, barTop, 0.45);
    const beforeContact = step(760);
    const afterContact = step(768);
    expect(Math.abs(beforeContact - afterContact)).toBeLessThan(0.002);
  });
});

describe("etapas da busca", () => {
  it("a Cidade sai primeiro e o resto depois, sem pausa entre elas", () => {
    expect(searchStages(0)).toEqual({ a: 0, b: 0 });
    expect(searchStages(0.3).b).toBe(0);
    const middle = searchStages(0.5);
    expect(middle.a).toBeGreaterThan(0.8);
    expect(middle.b).toBeGreaterThan(0);
    expect(searchStages(1)).toEqual({ a: 1, b: 1 });
  });

  it("acha o menor recolhimento que abre o espaço pedido", () => {
    const closed = closedForRetraction(420, 1300, 480);
    expect(searchRetraction(closed, 1300, 480)).toBeGreaterThanOrEqual(420);
    expect(searchRetraction(closed - 0.01, 1300, 480)).toBeLessThan(420);
    expect(closedForRetraction(0, 1300, 480)).toBe(0);
    expect(closedForRetraction(5000, 1300, 480)).toBe(1);
  });
});

describe("no celular a busca se recolhe ao subir na tela", () => {
  // Busca de 258px; topo do ingresso na tela em 560px: ela fica livre com o
  // topo em 290px (560 - 258 - 12) e some ao chegar em 84px.
  it("aberta enquanto ainda está atrás do ingresso", () => {
    expect(barRiseRepel(400, 258, 560)).toBe(0);
    expect(barRiseRepel(290, 258, 560)).toBe(0);
  });

  it("recolhendo conforme sobe", () => {
    const value = barRiseRepel(187, 258, 560);
    expect(value).toBeGreaterThan(0.3);
    expect(value).toBeLessThan(0.7);
  });

  it("sumiu ao chegar perto do cabeçalho", () => {
    expect(barRiseRepel(84, 258, 560)).toBe(1);
    expect(barRiseRepel(-200, 258, 560)).toBe(1);
  });

  it("tela baixa demais: some só quando passa do limite", () => {
    expect(barRiseRepel(200, 258, 300)).toBe(0);
    expect(barRiseRepel(80, 258, 300)).toBe(1);
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
