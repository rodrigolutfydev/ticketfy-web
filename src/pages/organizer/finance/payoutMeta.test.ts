import { describe, expect, it } from "vitest";
import type { Balance, PayoutAccount } from "../../../api/types";
import { couponStatusLabel } from "../../../utils/coupon";
import { payoutBlockedReason } from "./payoutMeta";

const balance = (overrides: Partial<Balance> = {}) =>
  ({ payoutsBlocked: false, inPayout: 0, available: 100, minPayoutAmount: 20, ...overrides }) as Balance;
const account = (overrides: Partial<PayoutAccount> = {}) => ({ payoutsBlockedUntil: null, ...overrides }) as PayoutAccount;

describe("payoutBlockedReason", () => {
  it("explains why a withdrawal can't be requested, in each language", () => {
    expect(payoutBlockedReason(balance(), account())).toBeNull();
    expect(payoutBlockedReason(balance(), null)).toBe("Cadastre os dados de recebimento para sacar.");
    expect(payoutBlockedReason(balance(), null, "en")).toBe("Add your payout details to withdraw.");
    expect(payoutBlockedReason(balance({ available: 10 }), account(), "pt-BR")).toMatch(/abaixo do mínimo para saque \(R\$\s20,00\)/);
    expect(payoutBlockedReason(balance({ available: 10 }), account(), "en")).toBe("The available balance is below the minimum withdrawal (R$20.00).");
  });
});

describe("couponStatusLabel", () => {
  it("names the coupon status in each language", () => {
    expect(couponStatusLabel("exhausted", "pt-BR")).toBe("Esgotado");
    expect(couponStatusLabel("exhausted", "en")).toBe("Used up");
  });
});
