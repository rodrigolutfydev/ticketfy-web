import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { ACCOUNT_SUSPENDED_MESSAGE, isAccountSuspendedError, loginErrorMessage, suspensionConsequences } from "./account";

const problem = (status: number, type: string | null, message = "x") => new ApiError(status, message, [], null, type);

describe("loginErrorMessage", () => {
  it("shows the suspended account message without any internal reason", () => {
    expect(loginErrorMessage(problem(403, "account-suspended", "This account is suspended. Contact support."))).toBe(
      ACCOUNT_SUSPENDED_MESSAGE,
    );
  });

  it("keeps the generic message for wrong credentials", () => {
    expect(loginErrorMessage(problem(401, "invalid-credentials"))).toBe("E-mail ou senha incorretos.");
    expect(loginErrorMessage(problem(400, "validation-failed"))).toBe("E-mail ou senha incorretos.");
  });

  it("keeps the origin message for other 403 responses", () => {
    expect(loginErrorMessage(problem(403, "auth-request-rejected"))).toBe(
      "Não foi possível entrar a partir desta página. Recarregue e tente de novo.",
    );
  });

  it("returns null without an error", () => {
    expect(loginErrorMessage(null)).toBeNull();
  });
});

describe("isAccountSuspendedError", () => {
  it("only matches the account-suspended problem type", () => {
    expect(isAccountSuspendedError(problem(403, "account-suspended"))).toBe(true);
    expect(isAccountSuspendedError(problem(403, "access-denied"))).toBe(false);
    expect(isAccountSuspendedError(new Error("x"))).toBe(false);
  });
});

describe("suspensionConsequences", () => {
  it("lists sessions, pending orders and paid tickets for any account", () => {
    const items = suspensionConsequences("USER");
    expect(items).toHaveLength(3);
    expect(items.join(" ")).toMatch(/sessões/);
    expect(items.join(" ")).toMatch(/pedidos pendentes são cancelados/);
    expect(items.join(" ")).not.toMatch(/saques/);
  });

  it("adds paused sales and held payouts for organizers", () => {
    const items = suspensionConsequences("ORGANIZER");
    expect(items).toHaveLength(5);
    expect(items.join(" ")).toMatch(/vendas dos eventos deste organizador ficam pausadas/);
    expect(items.join(" ")).toMatch(/saques solicitados ficam retidos/);
  });
});
