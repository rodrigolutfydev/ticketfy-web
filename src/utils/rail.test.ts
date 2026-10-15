import { describe, expect, it } from "vitest";
import type { EventSummary } from "../api/types";
import { dotTarget, dragPosition, railCardLook, recenter, releaseDirection, stepTarget, upcomingForRail, wrapIndex } from "./rail";

const event = (id: string, startsAt: string): EventSummary => ({
  id,
  name: `Evento ${id}`,
  venueName: "Casa",
  city: "Recife",
  startsAt,
  imageUrl: null,
  featured: false,
  minPrice: 50,
  soldOut: false,
  category: "MUSIC",
});

const now = Date.parse("2026-10-14T12:00:00Z");

describe("upcomingForRail", () => {
  it("mantém só eventos futuros, ordenados por data, sem repetir", () => {
    const list = [
      event("c", "2026-12-01T20:00:00Z"),
      event("passado", "2026-10-13T20:00:00Z"),
      event("a", "2026-10-15T20:00:00Z"),
      event("b", "2026-11-01T20:00:00Z"),
      event("a", "2026-10-15T20:00:00Z"),
    ];
    expect(upcomingForRail(list, now).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("aparece com um único evento futuro e respeita o limite", () => {
    expect(upcomingForRail([event("x", "2026-10-20T20:00:00Z")], now)).toHaveLength(1);
    const many = Array.from({ length: 20 }, (_, i) => event(String(i), `2026-11-${String(i + 1).padStart(2, "0")}T20:00:00Z`));
    expect(upcomingForRail(many, now, 8).map((e) => e.id)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
  });

  it("fica vazio sem eventos futuros", () => {
    expect(upcomingForRail([event("p", "2026-01-01T20:00:00Z")], now)).toEqual([]);
  });
});

describe("posição do carrossel", () => {
  it("wrapIndex dá a volta nos dois sentidos", () => {
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(7, 3)).toBe(1);
  });

  it("bolinha escolhe o caminho mais curto na roda", () => {
    expect(dotTarget(6, 4, 6)).toBe(4);
    expect(dotTarget(6, 5, 6)).toBe(5);
    expect(dotTarget(11, 0, 6)).toBe(12);
  });

  it("seta anda no máximo um evento à frente do centro", () => {
    expect(stepTarget(3, 3, 1)).toBe(4);
    expect(stepTarget(3, 4, 1)).toBe(4);
    expect(stepTarget(3, 2, -1)).toBe(2);
  });

  it("volta para a cópia real quando para numa cópia", () => {
    expect(recenter(2, 3)).toBe(3);
    expect(recenter(6, 3)).toBe(-3);
    expect(recenter(4, 3)).toBe(0);
  });

  it("solta o arraste para o lado certo", () => {
    expect(releaseDirection(0.3, 0)).toBe(1);
    expect(releaseDirection(-0.3, 0)).toBe(-1);
    expect(releaseDirection(0.05, -0.6)).toBe(1);
    expect(releaseDirection(0.05, 0)).toBe(0);
  });

  it("arraste segue o dedo e resiste depois de um evento", () => {
    expect(dragPosition(3, 3, -156, 312)).toBeCloseTo(3.5);
    expect(dragPosition(3, 3, -3120, 312)).toBeLessThan(4.25);
  });
});

describe("railCardLook", () => {
  const look = { highlight: 0.2, near: 1, far: 0.38 };

  it("o card do meio cresce e os das pontas apagam", () => {
    expect(railCardLook(0, look)).toEqual({ scale: 1.2, opacity: 1 });
    expect(railCardLook(1, look)).toEqual({ scale: 1, opacity: 1 });
    expect(railCardLook(-2, look)).toEqual({ scale: 1, opacity: 0.38 });
    expect(railCardLook(4, look).opacity).toBe(0);
  });
});
