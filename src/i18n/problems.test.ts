import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOGS, LOCALES, genericMessage, hasProblemMessage, problemMessage, problemText, type ProblemContext } from "./problems";

const problemTypes = JSON.parse(readFileSync(new URL("./problem-types.json", import.meta.url), "utf8")) as {
  slug: string;
  status: number;
}[];
const slugs = problemTypes.map((type) => type.slug);

const context = (overrides: Partial<ProblemContext> = {}): ProblemContext => ({
  status: 409,
  retryAfter: null,
  detail: null,
  properties: {},
  ...overrides,
});

describe("problem-types.json", () => {
  it("lists the API problem types without duplicates", () => {
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe.each(LOCALES)("messages for %s", (locale) => {
  it("has a message for every API problem type", () => {
    const missing = slugs.filter((slug) => !hasProblemMessage(slug, locale));
    expect(missing).toEqual([]);
  });

  it("has no message for a problem type the API does not have", () => {
    const extra = Object.keys(CATALOGS[locale].problems).filter((slug) => !slugs.includes(slug));
    expect(extra).toEqual([]);
  });

  it("only overrides known problem types in each scope", () => {
    for (const [scope, messages] of Object.entries(CATALOGS[locale].scopes)) {
      const unknown = Object.keys(messages).filter((slug) => !slugs.includes(slug));
      expect(unknown, scope).toEqual([]);
    }
  });

  it("renders a non-empty text for every problem type, with or without extra data", () => {
    for (const { slug, status } of problemTypes) {
      const text = problemMessage(slug, context({ status }), undefined, locale);
      expect(text, slug).toBeTruthy();
      expect(text, slug).not.toMatch(/undefined|NaN|null/);
    }
  });
});

describe("messages with extra data", () => {
  it("uses Retry-After in minutes", () => {
    expect(problemMessage("too-many-coupon-attempts", context({ retryAfter: 600 }))).toBe(
      "Muitas tentativas com cupom. Tente de novo em 10 min.",
    );
    expect(problemMessage("too-many-login-attempts", context({ retryAfter: 30 }))).toBe(
      "Muitas tentativas de login. Tente de novo em 1 min.",
    );
  });

  it("shows the balance values that block the account deletion", () => {
    const text = problemMessage("account-has-balance", context({ properties: { pending: 10, available: 0, held: 25.5 } }));
    expect(text).toMatch(/a liberar R\$\s10,00/);
    expect(text).toMatch(/disponível R\$\s0,00/);
    expect(text).toMatch(/retido R\$\s25,50/);
  });

  it("shows the payout limits and the pix key cooldown", () => {
    expect(problemMessage("payout-below-minimum", context({ properties: { minAmount: 20 } }))).toMatch(/R\$\s20,00/);
    expect(problemMessage("payout-exceeds-available", context({ properties: { available: 150.75 } }))).toMatch(/R\$\s150,75/);
    expect(problemMessage("payout-account-cooldown", context({ properties: { blockedUntil: "2026-10-14T15:00:00Z" } }))).toMatch(
      /bloqueados até \d{2}\/\d{2}\/\d{4}/,
    );
  });

  it("tells how many tickets the buyer can still get from the lot", () => {
    expect(problemMessage("max-per-buyer-exceeded", context({ properties: { maxPerBuyer: 4, remaining: 1 } }))).toBe(
      "Cada pessoa pode comprar no máximo 4 ingressos deste lote. Você ainda pode comprar 1.",
    );
    expect(problemMessage("max-per-buyer-exceeded", context({ properties: { maxPerBuyer: 1, remaining: 0 } }))).toBe(
      "Cada pessoa pode comprar no máximo 1 ingresso deste lote, e você já chegou a esse limite.",
    );
  });

  it("explains the coupon limit per buyer", () => {
    expect(problemMessage("coupon-buyer-limit-reached", context({ properties: { maxUsesPerBuyer: 2 } }))).toBe(
      "Você já usou este cupom 2 vezes, o máximo permitido por pessoa.",
    );
  });

  it("counts events and tickets", () => {
    expect(problemMessage("account-has-upcoming-tickets", context({ properties: { ticketCount: 3 } }))).toMatch(/3 ingressos válidos/);
    expect(problemMessage("account-has-active-events", context({ properties: { eventIds: ["a"] } }))).toMatch(/o evento com vendas/);
  });

  it("uses the scope message when a screen needs a specific text", () => {
    expect(problemMessage("ticket-type-not-found", context(), "checkout-coupon")).toBe("Algum ingresso do pedido não está mais à venda.");
    expect(problemMessage("ticket-type-not-found", context())).toBe("Este lote não está mais à venda.");
    expect(problemMessage("invalid-coupon-settings", context({ detail: "maxUses cannot be lower than usesCount" }), "coupon-management")).toBe(
      "O limite de usos não pode ficar abaixo dos usos já feitos.",
    );
  });
});

describe("unknown errors", () => {
  it("returns null for a problem type without message", () => {
    expect(problemMessage("not-a-real-type", context())).toBeNull();
    expect(problemMessage(null, context())).toBeNull();
  });

  it("uses the generic message for the status, with the error code when there is one", () => {
    expect(genericMessage(409, null)).toBe("Essa ação conflita com o estado atual. Atualize a página.");
    expect(genericMessage(418, "abc-123")).toBe("Não foi possível concluir a ação (erro 418). Código do erro: abc-123");
  });

  it("gives static texts for screens that only need the message", () => {
    expect(problemText("account-suspended")).toBe("Sua conta está suspensa. Fale com o suporte para saber mais.");
  });
});
