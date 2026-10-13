import { describe, expect, it } from "vitest";
import { formatDate, formatFullDay, formatInt, formatPercent, formatPrice, relativeDay } from "./format";

describe("format", () => {
  it("keeps prices in reais, written for each language", () => {
    expect(formatPrice(1234.5, "pt-BR")).toMatch(/^R\$\s1\.234,50$/);
    expect(formatPrice(1234.5, "en")).toBe("R$1,234.50");
  });

  it("formats numbers and percentages for each language", () => {
    expect(formatInt(12345, "pt-BR")).toBe("12.345");
    expect(formatInt(12345, "en")).toBe("12,345");
    expect(formatPercent(12.5, "pt-BR")).toBe("12,5%");
    expect(formatPercent(12.5, "en")).toBe("12.5%");
    expect(formatPercent(null, "en")).toBe("—");
  });

  it("writes dates in the chosen language", () => {
    const iso = "2026-12-10T15:00:00Z";
    expect(formatFullDay(iso, "pt-BR")).toMatch(/dezembro/);
    expect(formatFullDay(iso, "en")).toMatch(/December/);
    expect(formatDate(iso, "en")).toMatch(/Dec/);
  });

  it("describes relative days in the chosen language", () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    expect(relativeDay(tomorrow, "pt-BR")).toBe("amanhã");
    expect(relativeDay(tomorrow, "en")).toBe("tomorrow");
  });
});
