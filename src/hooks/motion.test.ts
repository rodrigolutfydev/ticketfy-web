import { describe, expect, it } from "vitest";
import { ambientEffectsEnabled, floatOffset, pointerEffectsEnabled, scrollProgress, tiltAngles, tiltTransform } from "./motion";

describe("quando os efeitos ligam", () => {
  it("inclinação e reflexo só com mouse e sem pedido de menos movimento", () => {
    expect(pointerEffectsEnabled({ reducedMotion: false, finePointer: true })).toBe(true);
    expect(pointerEffectsEnabled({ reducedMotion: false, finePointer: false })).toBe(false); // tela de toque
    expect(pointerEffectsEnabled({ reducedMotion: true, finePointer: true })).toBe(false);
  });

  it("flutuação e rolagem valem no toque, mas não com menos movimento", () => {
    expect(ambientEffectsEnabled({ reducedMotion: false, finePointer: false })).toBe(true);
    expect(ambientEffectsEnabled({ reducedMotion: true, finePointer: true })).toBe(false);
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
