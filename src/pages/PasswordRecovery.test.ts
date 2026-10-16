import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { LocaleProvider } from "../i18n/LocaleContext";
import { setLocale, type Locale } from "../i18n/locale";
import { MESSAGES } from "../i18n/messages";
import { PASSWORD_RESET_DONE } from "../utils/passwordReset";
import ForgotPasswordPage, { ForgotPasswordSent } from "./ForgotPasswordPage";
import LoginPage from "./LoginPage";
import ResetPasswordPage, { ResetLinkProblemView } from "./ResetPasswordPage";

const TOKEN = "Vx3kR9mQ2pL7wN4tY8bC1dF6gH0jK5sA3eZ_-uI2oP0";

function render(element: ReturnType<typeof createElement>, locale: Locale = "pt-BR", entry: { pathname: string; state?: unknown } = { pathname: "/" }) {
  setLocale(locale);
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(AuthProvider, null, createElement(LocaleProvider, null, createElement(MemoryRouter, { initialEntries: [entry] }, element))),
    ),
  );
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
}

const page = (component: ComponentType) => createElement(component);

function resetPageAt(search: string, locale: Locale = "pt-BR") {
  vi.stubGlobal("window", { location: { pathname: "/reset-password", search, hash: "" }, history: { state: null, replaceState: vi.fn() } });
  return render(page(ResetPasswordPage), locale, { pathname: "/reset-password" });
}

afterEach(() => setLocale("pt-BR"));

describe.each(["pt-BR", "en"] as const)("recuperação de senha (%s)", (locale) => {
  const t = MESSAGES[locale];

  it("a tela de entrar tem o link para recuperar a senha", () => {
    const html = render(page(LoginPage), locale, { pathname: "/login" });
    expect(html).toContain(t.login.forgot);
    expect(html).toContain('href="/forgot-password"');
  });

  it("o pedido do link já vem com o e-mail digitado no login", () => {
    const html = render(page(ForgotPasswordPage), locale, { pathname: "/forgot-password", state: { email: "ana@example.com" } });
    expect(html).toContain(t.forgotPassword.title);
    expect(html).toContain('value="ana@example.com"');
    expect(html).toContain(t.forgotPassword.submit);
  });

  it("depois do envio mostra sempre a mesma mensagem, sem repetir o e-mail", () => {
    const html = render(createElement(ForgotPasswordSent, { onOtherEmail: () => {}, from: "/" }), locale);
    expect(html).toContain(t.forgotPassword.sent);
    expect(html).not.toContain("@");
    expect(html).toContain(t.forgotPassword.backToLogin);
  });

  it.each(["invalid", "expired", "used"] as const)("link %s mostra o aviso certo e o botão para pedir outro", (problem) => {
    const html = render(createElement(ResetLinkProblemView, { problem }), locale);
    expect(html).toContain(t.resetPassword.linkTitle[problem]);
    expect(html).toContain(t.resetPassword.linkText[problem]);
    expect(html).toContain(t.resetPassword.requestNew);
    expect(html).toContain('href="/forgot-password"');
    expect(html).not.toContain('type="password"');
  });

  it("sem token na URL, ou com token malformado, mostra a tela de link inválido", () => {
    for (const search of ["", "?token=", "?token=nao-e-token"]) {
      const html = resetPageAt(search, locale);
      expect(html).toContain(t.resetPassword.linkTitle.invalid);
      expect(html).toContain(t.resetPassword.requestNew);
    }
  });

  it("com token, pede a nova senha e a confirmação como no cadastro", () => {
    const html = resetPageAt(`?token=${TOKEN}`, locale);
    expect(html).toContain(t.resetPassword.title);
    expect(html).toContain(t.resetPassword.next);
    expect(html).toContain(t.resetPassword.confirm);
    expect(html.match(/type="password"/g)).toHaveLength(2);
    expect(html.match(/autocomplete="new-password"/gi)).toHaveLength(2);
    expect(html.match(new RegExp(`aria-label="${t.ui.showPassword}"`, "g"))).toHaveLength(2);
    expect(html).toMatch(/minlength="8"/i);
    expect(html.match(/maxlength="72"/gi)).toHaveLength(2);
    expect(html).toContain(t.password.lengthHint);
    expect(html).not.toContain(TOKEN);
  });

  it("depois da troca, o login avisa que a senha mudou", () => {
    const html = render(page(LoginPage), locale, { pathname: "/login", state: PASSWORD_RESET_DONE });
    expect(html).toContain(t.login.passwordReset);
  });
});

it("os textos pedidos aparecem como combinado", () => {
  const t = MESSAGES["pt-BR"];
  expect(t.forgotPassword.sent).toBe(
    "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Ele vale 30 minutos. Confira também o spam.",
  );
  expect(t.login.passwordReset).toBe("Senha alterada. Entre com a nova senha.");
  expect(t.login.forgot).toBe("Esqueci minha senha");
  expect(t.resetPassword.requestNew).toBe("Pedir um novo link");
});
