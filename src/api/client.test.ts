import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { ApiError, api, authApi, clearSession, configureClient, errorMessage, getSession, setSession, type Session, type SessionEndReason } from "./client";

const OLD_TOKEN = "header.old.signature";
const NEW_TOKEN = "header.new.signature";

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function json(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
}

function bearer(init: RequestInit) {
  return (init.headers as Record<string, string>)["Authorization"] ?? null;
}

function mockFetch(handler: Handler) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => handler(String(input), init));
  vi.stubGlobal("fetch", fetchMock);
  const urls = () => fetchMock.mock.calls.map(([input]) => String(input));
  return {
    fetchMock,
    refreshCount: () => urls().filter((url) => url === "/api/auth/refresh").length,
    countFor: (suffix: string) => urls().filter((url) => url.endsWith(suffix)).length,
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let onRefreshed: Mock<(session: Session) => void>;
let onSessionEnded: Mock<(reason: SessionEndReason) => void>;

beforeEach(() => {
  clearSession();
  onRefreshed = vi.fn<(session: Session) => void>();
  onSessionEnded = vi.fn<(reason: SessionEndReason) => void>();
  configureClient({ onRefreshed, onSessionEnded });
  setSession({ token: OLD_TOKEN, expiresIn: 600 });
});

describe("renovação da sessão", () => {
  it("cinco requisições com 401 geram uma única renovação e cada uma repete uma vez", async () => {
    const { refreshCount, countFor } = mockFetch(async (url, init) => {
      if (url === "/api/auth/refresh") {
        await delay(20);
        return json(200, { token: NEW_TOKEN, expiresIn: 600 });
      }
      return bearer(init) === `Bearer ${NEW_TOKEN}` ? json(200, { url }) : json(401);
    });

    const paths = [1, 2, 3, 4, 5].map((n) => `/orders/${n}`);
    const results = await Promise.all(paths.map((path) => api.get<{ url: string }>(path)));

    expect(results.map((result) => result.url.slice(-9))).toEqual(paths);
    expect(refreshCount()).toBe(1);
    for (const path of paths) expect(countFor(path)).toBe(2);
    expect(onRefreshed).toHaveBeenCalledTimes(1);
    expect(getSession()?.token).toBe(NEW_TOKEN);
  });

  it("repete no máximo uma vez quando a requisição continua recebendo 401", async () => {
    const { refreshCount, countFor } = mockFetch((url) =>
      url === "/api/auth/refresh" ? json(200, { token: NEW_TOKEN, expiresIn: 600 }) : json(401)
    );

    await expect(api.get("/orders")).rejects.toMatchObject({ status: 401 });
    expect(countFor("/orders")).toBe(2);
    expect(refreshCount()).toBe(1);
  });

  it("renovação que falha encerra a sessão uma única vez e não repete as requisições", async () => {
    const { refreshCount, countFor } = mockFetch(async (url) => {
      if (url === "/api/auth/refresh") {
        await delay(10);
        return json(401, { type: "https://x/problems/session-expired" });
      }
      return json(401);
    });

    const results = await Promise.allSettled(["/a", "/b", "/c"].map((path) => api.get(path)));

    for (const result of results) {
      expect(result.status).toBe("rejected");
      expect((result as PromiseRejectedResult).reason).toBeInstanceOf(ApiError);
      expect((result as PromiseRejectedResult).reason.status).toBe(401);
    }
    expect(refreshCount()).toBe(1);
    for (const path of ["/a", "/b", "/c"]) expect(countFor(path)).toBe(1);
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
    expect(onSessionEnded).toHaveBeenCalledWith("expired");
    expect(getSession()).toBeNull();
  });

  it("falha temporária na renovação devolve o erro sem encerrar a sessão", async () => {
    const { refreshCount, countFor } = mockFetch((url) => (url === "/api/auth/refresh" ? json(503) : json(401)));

    await expect(api.get("/orders")).rejects.toMatchObject({ status: 503 });
    expect(refreshCount()).toBe(1);
    expect(countFor("/orders")).toBe(1);
    expect(onSessionEnded).not.toHaveBeenCalled();
  });

  it("renovação recusada por conta suspensa encerra a sessão com o motivo suspended", async () => {
    const { refreshCount, countFor } = mockFetch((url) =>
      url === "/api/auth/refresh"
        ? json(403, { type: "https://x/problems/account-suspended", detail: "This account is suspended. Contact support." })
        : json(401)
    );

    await expect(api.get("/orders")).rejects.toMatchObject({ status: 401 });
    expect(refreshCount()).toBe(1);
    expect(countFor("/orders")).toBe(1);
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
    expect(onSessionEnded).toHaveBeenCalledWith("suspended");
    expect(getSession()).toBeNull();
  });

  it("401 sem token não dispara renovação", async () => {
    clearSession();
    const { refreshCount, countFor } = mockFetch(() => json(401));

    await expect(api.get("/orders")).rejects.toMatchObject({ status: 401 });
    expect(refreshCount()).toBe(0);
    expect(countFor("/orders")).toBe(1);
  });
});

describe("mensagens de erro", () => {
  it("traduz o tipo do problema e guarda o detail original e as propriedades", async () => {
    mockFetch(() =>
      json(409, {
        type: "https://x/problems/payout-exceeds-available",
        detail: "Payout exceeds the available balance",
        status: 409,
        available: 150.75,
      })
    );

    const error = (await api.get("/organizer/payouts").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.problemType).toBe("payout-exceeds-available");
    expect(error.message).toMatch(/^O valor passa do seu saldo disponível \(R\$\s150,75\)\.$/);
    expect(error.detail).toBe("Payout exceeds the available balance");
    expect(error.properties).toEqual({ available: 150.75 });
  });

  it("tipo desconhecido usa a mensagem genérica com o código do erro", async () => {
    mockFetch(() => json(409, { type: "https://x/problems/brand-new-type", detail: "Something new" }, { "X-Request-Id": "req-42" }));

    const error = (await api.get("/x").catch((e: unknown) => e)) as ApiError;

    expect(error.message).toBe("Essa ação conflita com o estado atual. Atualize a página. Código do erro: req-42");
    expect(error.detail).toBe("Something new");
  });

  it("erro interno mostra a mensagem traduzida com o código do erro", async () => {
    mockFetch(() => json(500, { type: "https://x/problems/internal-error", requestId: "req-500" }));

    await expect(api.get("/x")).rejects.toMatchObject({
      status: 500,
      message: "Tivemos um problema do nosso lado. Tente de novo em instantes. Código do erro: req-500",
    });
  });

  it("errorMessage usa a mensagem do contexto da tela quando houver", async () => {
    mockFetch(() => json(404, { type: "https://x/problems/ticket-not-found" }));

    const error = await api.get("/x").catch((e: unknown) => e);

    expect(errorMessage(error)).toBe("Ingresso não encontrado.");
    expect(errorMessage(error, "check-in")).toBe("Código não encontrado.");
    expect(errorMessage(new Error("falhou"))).toBe("falhou");
    expect(errorMessage(null)).toBeNull();
  });
});

describe("chamadas de autenticação", () => {
  it("login com 401 não renova nem repete", async () => {
    const { fetchMock, refreshCount } = mockFetch(() => json(401));

    await expect(authApi.post("/auth/login", { email: "a@b.c", password: "x" })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshCount()).toBe(0);
  });

  it("logout-all e troca de senha com 401 não renovam, não repetem e encerram a sessão", async () => {
    const { fetchMock, refreshCount } = mockFetch(() => json(401));

    await expect(authApi.post("/auth/logout-all", undefined, { authenticated: true })).rejects.toMatchObject({ status: 401 });
    setSession({ token: OLD_TOKEN, expiresIn: 600 });
    await expect(
      authApi.patch("/users/me/password", { currentPassword: "a", newPassword: "b" }, { authenticated: true })
    ).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshCount()).toBe(0);
    expect(onSessionEnded).toHaveBeenCalledTimes(2);
    expect(onSessionEnded).toHaveBeenCalledWith("unauthorized");
  });

  it("troca de senha com 403 não encerra a sessão", async () => {
    mockFetch(() => json(403, { type: "https://x/problems/invalid-password", detail: "Invalid password" }));

    await expect(
      authApi.patch("/users/me/password", { currentPassword: "a", newPassword: "b" }, { authenticated: true })
    ).rejects.toMatchObject({ status: 403, problemType: "invalid-password" });
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(getSession()?.token).toBe(OLD_TOKEN);
  });

  it("vão para a mesma origem com credentials same-origin, no-store e X-Ticketfy-Auth", async () => {
    const { fetchMock } = mockFetch(() => json(200, { token: NEW_TOKEN, expiresIn: 600 }));

    await authApi.post("/auth/login", { email: "a@b.c", password: "x" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(init?.credentials).toBe("same-origin");
    expect(init?.cache).toBe("no-store");
    expect((init?.headers as Record<string, string>)["X-Ticketfy-Auth"]).toBe("1");
    expect((init?.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });

  it("as demais chamadas vão direto à API com Bearer e credentials omit", async () => {
    const { fetchMock } = mockFetch(() => json(200, {}));

    await api.get("/orders");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^https?:\/\/[^/]+\/orders$/);
    expect(init?.credentials).toBe("omit");
    expect(bearer(init ?? {})).toBe(`Bearer ${OLD_TOKEN}`);
    expect((init?.headers as Record<string, string>)["X-Ticketfy-Auth"]).toBeUndefined();
  });

  it("rejeita caminhos de autenticação fora da lista", async () => {
    const { fetchMock } = mockFetch(() => json(200));

    await expect(authApi.post("/auth/../users", {})).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
