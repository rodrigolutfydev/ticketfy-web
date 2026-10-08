import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { ApiError, api, authApi, clearSession, configureClient, getSession, setSession, type Session, type SessionEndReason } from "./client";

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

  it("401 sem token não dispara renovação", async () => {
    clearSession();
    const { refreshCount, countFor } = mockFetch(() => json(401));

    await expect(api.get("/orders")).rejects.toMatchObject({ status: 401 });
    expect(refreshCount()).toBe(0);
    expect(countFor("/orders")).toBe(1);
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
