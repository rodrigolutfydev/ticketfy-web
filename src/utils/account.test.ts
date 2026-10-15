import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import {
  accountSuspendedMessage,
  deletionProof,
  hasNoPassword,
  isAccountSuspendedError,
  isPasswordNotSetError,
  loginErrorMessage,
  needsPasswordSetup,
  passwordChangeBody,
  sameEmail,
  suspensionConsequences,
} from "./account";

const problem = (status: number, type: string | null, message = "x") => new ApiError(status, message, [], null, type);

describe("loginErrorMessage", () => {
  it("shows the suspended account message without any internal reason", () => {
    expect(loginErrorMessage(problem(403, "account-suspended", "This account is suspended. Contact support."))).toBe(
      accountSuspendedMessage(),
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

  it("lists the consequences in English", () => {
    const items = suspensionConsequences("ORGANIZER", "en");
    expect(items).toHaveLength(5);
    expect(items.join(" ")).toMatch(/Requested withdrawals are held/);
  });
});

describe("account without a password", () => {
  const google = { hasPassword: false };
  const withPassword = { hasPassword: true };

  it("only treats an explicit hasPassword false as no password", () => {
    expect(hasNoPassword(google)).toBe(true);
    expect(hasNoPassword(withPassword)).toBe(false);
    expect(hasNoPassword({})).toBe(false);
    expect(hasNoPassword(null)).toBe(false);
  });

  it("asks to set a password when the profile says so or the API answers password-not-set", () => {
    expect(isPasswordNotSetError(problem(409, "password-not-set"))).toBe(true);
    expect(isPasswordNotSetError(problem(403, "invalid-password"))).toBe(false);
    expect(needsPasswordSetup(google, null)).toBe(true);
    expect(needsPasswordSetup(withPassword, problem(409, "password-not-set"))).toBe(true);
    expect(needsPasswordSetup(null, problem(409, "password-not-set"))).toBe(true);
    expect(needsPasswordSetup(withPassword, problem(403, "invalid-password"))).toBe(false);
  });

  it("sets the first password without currentPassword", () => {
    expect(passwordChangeBody(true, "ignored", "outraSenha456")).toEqual({ newPassword: "outraSenha456" });
    expect(passwordChangeBody(false, "senhaForte123", "outraSenha456")).toEqual({ currentPassword: "senhaForte123", newPassword: "outraSenha456" });
  });

  it("confirms the deletion with the email when there is no password", () => {
    expect(deletionProof(google, { password: "", email: "  Ana@Gmail.com " })).toEqual({ email: "Ana@Gmail.com" });
    expect(deletionProof(withPassword, { password: "senhaForte123", email: "ana@gmail.com" })).toEqual({ password: "senhaForte123" });
  });

  it("compares the typed email like the API: trimmed and case-insensitive", () => {
    expect(sameEmail("  ANA@gmail.com ", "ana@gmail.com")).toBe(true);
    expect(sameEmail("ana@gmail.co", "ana@gmail.com")).toBe(false);
  });
});
