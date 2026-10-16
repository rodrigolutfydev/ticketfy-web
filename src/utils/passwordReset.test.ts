import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSession, errorMessage, fieldError, setSession } from "../api/client";
import { confirmPasswordReset, requestPasswordReset } from "../api/endpoints";
import { setLocale } from "../i18n/locale";
import { MESSAGES } from "../i18n/messages";
import { readResetToken, removeResetToken, resetLinkProblem, resetRetryAfter } from "./passwordReset";

const TOKEN = "Vx3kR9mQ2pL7wN4tY8bC1dF6gH0jK5sA3eZ_-uI2oP0";

function mockFetch(response: () => Response) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const problem = (status: number, slug: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ type: `https://ticketfy-api.onrender.com/problems/${slug}`, title: slug, status, ...extra }), {
    status,
    headers: { "Content-Type": "application/problem+json", ...headers },
  });

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("a chamada deveria falhar");
}

afterEach(() => {
  clearSession();
  setLocale("pt-BR");
});

describe("token do link de recuperação", () => {
  it("lê o token da URL e recusa o que não tem formato de token", () => {
    expect(readResetToken(`?token=${TOKEN}`)).toBe(TOKEN);
    expect(readResetToken("")).toBeNull();
    expect(readResetToken("?token=")).toBeNull();
    expect(readResetToken("?token=curto")).toBeNull();
    expect(readResetToken("?token=abc%20def%3Cscript%3Exxxxxxxxxxxx")).toBeNull();
  });

  it("tira o token da barra de endereço com replaceState, mantendo o estado do roteador", () => {
    const history = { state: { idx: 3, key: "k" }, replaceState: vi.fn() };
    removeResetToken({ pathname: "/reset-password", search: `?token=${TOKEN}`, hash: "" }, history);
    expect(history.replaceState).toHaveBeenCalledTimes(1);
    expect(history.replaceState).toHaveBeenCalledWith({ idx: 3, key: "k" }, "", "/reset-password");
  });

  it("mantém os outros parâmetros e o fragmento, e não mexe na URL sem token", () => {
    const history = { state: null, replaceState: vi.fn() };
    removeResetToken({ pathname: "/reset-password", search: `?lang=en&token=${TOKEN}`, hash: "#x" }, history);
    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/reset-password?lang=en#x");

    history.replaceState.mockClear();
    removeResetToken({ pathname: "/reset-password", search: "", hash: "" }, history);
    expect(history.replaceState).not.toHaveBeenCalled();
  });
});

describe("pedido do link", () => {
  it("envia o e-mail pela mesma origem, com X-Ticketfy-Auth e sem token de sessão", async () => {
    setSession({ token: "header.payload.signature", expiresIn: 600 });
    const fetchMock = mockFetch(() => new Response(null, { status: 202 }));

    await requestPasswordReset("ana@example.com");

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(url).toBe("/api/auth/password-reset/request");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
    expect(headers["X-Ticketfy-Auth"]).toBe("1");
    expect(headers["Authorization"]).toBeUndefined();
    expect(JSON.parse(String(init?.body))).toEqual({ email: "ana@example.com" });
  });

  it("responde igual para e-mail com e sem conta: a API devolve 202 sem corpo nos dois casos", async () => {
    mockFetch(() => new Response(null, { status: 202 }));
    const results = await Promise.all([requestPasswordReset("tem-conta@example.com"), requestPasswordReset("nao-tem@example.com")]);
    expect(results[0]).toStrictEqual(results[1]);
  });

  it("429 usa o tempo do Retry-After", async () => {
    mockFetch(() => problem(429, "too-many-password-reset-attempts", {}, { "Retry-After": "840" }));
    const error = await failure(requestPasswordReset("ana@example.com"));

    expect(resetRetryAfter(error)).toBe(840);
    expect(errorMessage(error)).toBe("Muitos pedidos de recuperação de senha. Tente de novo em 14 min.");
    expect(MESSAGES["pt-BR"].common.wait(840)).toBe("Aguarde 14 min 00 s");
    expect(MESSAGES.en.common.seconds(45)).toBe("45 s");
  });

  it("429 sem Retry-After espera 1 minuto, e outros erros não bloqueiam", async () => {
    mockFetch(() => problem(429, "too-many-password-reset-attempts"));
    expect(resetRetryAfter(await failure(requestPasswordReset("ana@example.com")))).toBe(60);

    mockFetch(() => problem(500, "internal-error"));
    expect(resetRetryAfter(await failure(requestPasswordReset("ana@example.com")))).toBe(0);
  });
});

describe("troca da senha pelo link", () => {
  it("envia token e senha nova e termina sem abrir sessão", async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 204 }));

    await expect(confirmPasswordReset(TOKEN, "senha-nova-456")).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/password-reset/confirm");
    expect((init?.headers as Record<string, string>)["X-Ticketfy-Auth"]).toBe("1");
    expect(JSON.parse(String(init?.body))).toEqual({ token: TOKEN, newPassword: "senha-nova-456" });
  });

  it.each([
    ["password-reset-token-invalid", "invalid"],
    ["password-reset-token-expired", "expired"],
    ["password-reset-token-used", "used"],
  ] as const)("%s vira o aviso de link %s", async (slug, kind) => {
    mockFetch(() => problem(400, slug));
    expect(resetLinkProblem(await failure(confirmPasswordReset(TOKEN, "senha-nova-456")))).toBe(kind);
  });

  it("token recusado pela validação também é link inválido", async () => {
    mockFetch(() => problem(400, "validation-failed", { errors: [{ field: "token", message: "must not be blank", code: "required", params: {} }] }));
    expect(resetLinkProblem(await failure(confirmPasswordReset(TOKEN, "senha-nova-456")))).toBe("invalid");
  });

  it("senha fraca mostra o erro no campo e mantém o link valendo", async () => {
    mockFetch(() =>
      problem(400, "validation-failed", {
        errors: [{ field: "newPassword", message: "Password must be at least 8 characters long", code: "size", params: { min: 8, max: 72 } }],
      }),
    );
    const error = await failure(confirmPasswordReset(TOKEN, "curta"));

    expect(resetLinkProblem(error)).toBeNull();
    expect(resetRetryAfter(error)).toBe(0);
    expect(fieldError(error, "newPassword")).toMatch(/8/);

    setLocale("en");
    expect(fieldError(error, "newPassword")).toMatch(/8/);
  });

  it("erros de rede e do servidor não invalidam o link", async () => {
    mockFetch(() => problem(503, "internal-error"));
    expect(resetLinkProblem(await failure(confirmPasswordReset(TOKEN, "senha-nova-456")))).toBeNull();
  });
});
