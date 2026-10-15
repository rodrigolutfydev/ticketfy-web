import { describe, expect, it } from "vitest";
import { DEFAULT_HOLD_MS, formatClock, remainingFraction, reservationTotal } from "./Countdown";

describe("timer da reserva", () => {
  it("formata minutos e segundos com dois dígitos e nunca fica negativo", () => {
    expect(formatClock(14 * 60_000 + 32_000)).toBe("14:32");
    expect(formatClock(5_000)).toBe("00:05");
    expect(formatClock(-3_000)).toBe("00:00");
  });

  it("calcula quanto do anel ainda resta, entre 0 e 1", () => {
    expect(remainingFraction(450_000, 900_000)).toBe(0.5);
    expect(remainingFraction(-1, 900_000)).toBe(0);
    expect(remainingFraction(2_000_000, 900_000)).toBe(1);
    expect(remainingFraction(1000, 0)).toBe(0);
  });

  it("usa a duração real da reserva e cai nos 15 min se o dado for estranho", () => {
    expect(reservationTotal("2026-10-14T20:00:00Z", "2026-10-14T20:15:00Z")).toBe(15 * 60_000);
    expect(reservationTotal("2026-10-14T20:00:00Z", "2026-10-14T20:10:00Z")).toBe(10 * 60_000);
    expect(reservationTotal(null, "2026-10-14T20:15:00Z")).toBe(DEFAULT_HOLD_MS);
    expect(reservationTotal("2026-10-13T20:00:00Z", "2026-10-14T20:15:00Z")).toBe(DEFAULT_HOLD_MS);
    expect(reservationTotal("invalido", "2026-10-14T20:15:00Z")).toBe(DEFAULT_HOLD_MS);
  });
});
