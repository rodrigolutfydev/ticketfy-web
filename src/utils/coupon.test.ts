import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { couponErrorMessage, couponManagementError, couponStatus, formatDiscount, isCouponError, normalizeCouponCode } from "./coupon";

const problem = (status: number, type: string, detail = "x", retryAfter: number | null = null, properties: Record<string, unknown> = {}) =>
  new ApiError(status, detail, [], retryAfter, type, null, detail, properties);

describe("normalizeCouponCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeCouponCode("  black-friday ")).toBe("BLACK-FRIDAY");
  });
});

describe("formatDiscount", () => {
  it("formats percentages and fixed amounts", () => {
    expect(formatDiscount("PERCENT", 15)).toBe("15%");
    expect(formatDiscount("PERCENT", 12.5)).toBe("12,5%");
    expect(formatDiscount("FIXED", 10)).toMatch(/R\$\s10,00/);
  });
});

describe("couponErrorMessage", () => {
  it("uses the same message for every unusable coupon", () => {
    expect(couponErrorMessage(problem(422, "invalid-coupon", "Coupon is invalid or unavailable"))).toBe(
      "Cupom inválido ou indisponível para este pedido.",
    );
  });

  it("tells how long to wait after too many attempts", () => {
    expect(couponErrorMessage(problem(429, "too-many-coupon-attempts", "x", 600))).toBe("Muitas tentativas com cupom. Tente de novo em 10 min.");
    expect(couponErrorMessage(problem(429, "too-many-coupon-attempts", "x", 30))).toContain("1 min");
  });

  it("returns null without an error", () => {
    expect(couponErrorMessage(null)).toBeNull();
  });

  it("only treats coupon problems as coupon errors", () => {
    expect(isCouponError(problem(422, "invalid-coupon"))).toBe(true);
    expect(isCouponError(problem(429, "too-many-coupon-attempts"))).toBe(true);
    expect(isCouponError(problem(422, "coupon-buyer-limit-reached"))).toBe(true);
    expect(isCouponError(problem(409, "insufficient-stock"))).toBe(false);
    expect(isCouponError(new Error("network"))).toBe(false);
  });
});

describe("couponManagementError", () => {
  it("maps each organizer problem type", () => {
    expect(couponManagementError(problem(409, "coupon-code-already-exists"))).toContain("Já existe um cupom");
    expect(couponManagementError(problem(409, "coupon-already-used"))).toContain("só desativado");
    expect(couponManagementError(problem(409, "coupon-already-used", "x", null, { reason: "delete-blocked" }))).toContain("pode desativá-lo");
    expect(couponManagementError(problem(400, "invalid-coupon-settings", "x", null, { reason: "max-uses-below-used", usesCount: 2 }))).toBe(
      "O limite de usos não pode ficar abaixo dos 2 usos já feitos.",
    );
    expect(couponManagementError(problem(400, "invalid-coupon-settings", "x", null, { reason: "ends-before-starts" }))).toContain("fim da validade");
    expect(couponManagementError(problem(400, "invalid-coupon-settings", "x", null, { reason: "percent-out-of-range" }))).toContain(
      "percentual",
    );
  });

  it("no longer reads the English detail", () => {
    expect(couponManagementError(problem(400, "invalid-coupon-settings", "maxUses cannot be lower than the 2 uses already made"))).toBe(
      "Confira as configurações do cupom.",
    );
  });
});

describe("couponStatus", () => {
  const now = Date.parse("2026-10-08T12:00:00Z");
  const base = { active: true, startsAt: null, endsAt: null, maxUses: null, usesCount: 0 };

  it("reports the state the buyer would hit", () => {
    expect(couponStatus(base, now)).toBe("active");
    expect(couponStatus({ ...base, active: false }, now)).toBe("inactive");
    expect(couponStatus({ ...base, endsAt: "2026-10-08T11:59:00Z" }, now)).toBe("expired");
    expect(couponStatus({ ...base, startsAt: "2026-10-09T00:00:00Z" }, now)).toBe("scheduled");
    expect(couponStatus({ ...base, maxUses: 3, usesCount: 3 }, now)).toBe("exhausted");
  });
});
