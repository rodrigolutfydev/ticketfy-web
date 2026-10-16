import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import type { UserProfile } from "../api/types";
import { AuthProvider } from "../auth/AuthContext";
import PasswordRequiredNotice from "../components/PasswordRequiredNotice";
import { LocaleProvider } from "../i18n/LocaleContext";
import { setLocale, type Locale } from "../i18n/locale";
import { MESSAGES } from "../i18n/messages";
import { DeleteAccountCard, ExportCard, PasswordCard, SecurityTab } from "./AccountPage";

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: "3f0b6c1e-8a5d-4f7e-9c2b-1d4e5f6a7b8c",
  name: "Ana Souza",
  email: "ana@gmail.com",
  role: "USER",
  language: "pt-BR",
  hasPassword: false,
  googleLinked: true,
  ...overrides,
});

function render(component: ComponentType, me: UserProfile, locale: Locale = "pt-BR") {
  setLocale(locale);
  const queryClient = new QueryClient();
  queryClient.setQueryData(["me"], { ...me, language: locale });
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AuthProvider, null, createElement(LocaleProvider, null, createElement(MemoryRouter, null, createElement(component)))),
    ),
  );
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
}

afterEach(() => setLocale("pt-BR"));

describe.each(["pt-BR", "en"] as const)("account without a password (%s)", (locale) => {
  const t = MESSAGES[locale];

  it("offers to set a password without asking for the current one", () => {
    const html = render(PasswordCard, profile(), locale);
    expect(html).toContain(t.account.passwordCard.setTitle);
    expect(html).toContain(t.account.passwordCard.setSubmit);
    expect(html).not.toContain(t.account.passwordCard.current);
    expect(html).not.toContain('autocomplete="current-password"');
  });

  it("also offers an email link to set the password", () => {
    const html = render(PasswordCard, profile(), locale);
    expect(html).toContain(t.account.passwordCard.emailLink);
    expect(html).toContain(t.account.passwordCard.or);
  });

  it("asks for the current password when the account has one", () => {
    const html = render(PasswordCard, profile({ hasPassword: true, googleLinked: false }), locale);
    expect(html).toContain(t.account.passwordCard.title);
    expect(html).toContain(t.account.passwordCard.current);
    expect(html).not.toContain(t.account.passwordCard.setTitle);
    expect(html).not.toContain(t.account.passwordCard.emailLink);
  });

  it("confirms the deletion with the account email instead of the password", () => {
    const html = render(DeleteAccountCard, profile(), locale);
    expect(html).toContain(t.buyer.privacy.emailLabel);
    expect(html).toContain('type="email"');
    expect(html).not.toContain('type="password"');
  });

  it("keeps the password confirmation for accounts with a password", () => {
    const html = render(DeleteAccountCard, profile({ hasPassword: true }), locale);
    expect(html).toContain('type="password"');
    expect(html).not.toContain(t.buyer.privacy.emailLabel);
  });

  it("replaces the data export form with a link to set a password", () => {
    const html = render(ExportCard, profile(), locale);
    expect(html).toContain(t.passwordRequired.text);
    expect(html).toContain('href="/account?tab=seguranca"');
    expect(html).not.toContain('type="password"');
  });

  it("shows that the account is linked to Google and has no password", () => {
    const html = render(SecurityTab, profile(), locale);
    expect(html).toContain(t.account.security.googleLinked);
    expect(html).toContain(t.account.security.noPasswordText);
  });
});

describe("PasswordRequiredNotice", () => {
  it("links to the security tab in both languages", () => {
    for (const locale of ["pt-BR", "en"] as const) {
      const html = render(PasswordRequiredNotice, profile(), locale);
      expect(html).toContain(MESSAGES[locale].passwordRequired.link);
      expect(html).toContain('href="/account?tab=seguranca"');
    }
  });
});
