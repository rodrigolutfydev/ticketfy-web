import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  ApiError,
  SESSION_TIMEOUT_MS,
  SLOW_REQUEST_MS,
  api,
  authApi,
  clearSession,
  configureClient,
  errorMessage,
  fieldError,
  getSession,
  isWaitingSlowRequest,
  resumeSession,
  setSession,
  subscribeSlowRequests,
  timeoutFor,
  type Session,
  type SessionEndReason,
} from "./client";
import { setLocale } from "../i18n/locale";

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

  it("traduz os erros por campo pelo código e parâmetros, sem usar a mensagem em inglês", async () => {
    mockFetch(() =>
      json(400, {
        type: "https://x/problems/validation-failed",
        errors: [
          { field: "password", message: "Password must be at least 8 characters long", code: "size", params: { min: 8, max: 72 } },
          { field: "email", message: "must be a well-formed email address", code: "email", params: {} },
          { field: "name", message: "must not be blank" },
        ],
      })
    );

    const error = (await api.post("/users", {}).catch((e: unknown) => e)) as ApiError;

    expect(error.fieldErrors[0]).toEqual({ field: "password", message: "Password must be at least 8 characters long", code: "size", params: { min: 8, max: 72 } });
    expect(fieldError(error, "password")).toBe("Use de 8 a 72 caracteres.");
    expect(fieldError(error, "email")).toBe("Informe um e-mail válido.");
    expect(fieldError(error, "name")).toBe("Valor inválido.");
    expect(fieldError(error, "other")).toBeUndefined();
  });

  it("monta a mensagem do motivo estruturado e acompanha a troca de idioma", async () => {
    mockFetch(() =>
      json(400, {
        type: "https://x/problems/invalid-coupon-settings",
        detail: "maxUses cannot be lower than the 2 uses already made",
        reason: "max-uses-below-used",
        usesCount: 2,
      })
    );

    const error = (await api.put("/x", {}).catch((e: unknown) => e)) as ApiError;

    expect(error.message).toBe("O limite de usos não pode ficar abaixo dos 2 usos já feitos.");
    try {
      setLocale("en");
      expect(errorMessage(error)).toBe("The usage limit can't be lower than the 2 uses already made.");
      expect(fieldError(new ApiError(400, "", [{ field: "a", message: "x", code: "required", params: {} }]), "a")).toBe("This field is required.");
    } finally {
      setLocale("pt-BR");
    }
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

type Pending = { url: string; init: RequestInit; resolve: (response: Response) => void; reject: (error: unknown) => void };

function controlledFetch() {
  const pending: Pending[] = [];
  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init: RequestInit = {}) =>
      new Promise<Response>((resolve, reject) => {
        pending.push({ url: String(input), init, resolve, reject });
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })
  );
  vi.stubGlobal("fetch", fetchMock);
  const find = (suffix: string) => pending.find((entry) => entry.url.endsWith(suffix));
  return { fetchMock, pending, find, urls: () => fetchMock.mock.calls.map(([input]) => String(input)) };
}

async function settle<T>(promise: Promise<T>) {
  const result: { value?: T; error?: unknown; done: boolean } = { done: false };
  promise.then(
    (value) => Object.assign(result, { value, done: true }),
    (error) => Object.assign(result, { error, done: true })
  );
  await vi.advanceTimersByTimeAsync(0);
  return result;
}

describe("tempo limite por rota", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rotas de sessão têm 60 s e as demais continuam com 15 s", () => {
    expect(SESSION_TIMEOUT_MS).toBe(60_000);
    expect(timeoutFor("POST", "/auth/login")).toBe(60_000);
    expect(timeoutFor("POST", "/auth/refresh")).toBe(60_000);
    expect(timeoutFor("POST", "/auth/logout")).toBe(60_000);
    expect(timeoutFor("GET", "/users/me")).toBe(60_000);
    expect(timeoutFor("get", "/users/me")).toBe(60_000);

    expect(timeoutFor("POST", "/auth/logout-all")).toBe(15_000);
    expect(timeoutFor("PATCH", "/users/me/password")).toBe(15_000);
    expect(timeoutFor("PATCH", "/users/me/avatar")).toBe(15_000);
    expect(timeoutFor("PATCH", "/users/me")).toBe(15_000);
    expect(timeoutFor("GET", "/users/me/data-export")).toBe(15_000);
    expect(timeoutFor("GET", "/events")).toBe(15_000);
    expect(timeoutFor("GET", "/auth/refresh")).toBe(15_000);
  });

  it("login espera até 60 s antes de desistir", async () => {
    vi.useFakeTimers();
    controlledFetch();
    const result = await settle(authApi.post("/auth/login", { email: "a@b.c", password: "x" }));

    await vi.advanceTimersByTimeAsync(59_000);
    expect(result.done).toBe(false);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(result.done).toBe(true);
    expect(result.error).toMatchObject({ status: 0, clientKey: "timeout" });
  });

  it("GET /users/me espera até 60 s", async () => {
    vi.useFakeTimers();
    controlledFetch();
    const result = await settle(api.get("/users/me"));

    await vi.advanceTimersByTimeAsync(30_000);
    expect(result.done).toBe(false);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(result.error).toMatchObject({ clientKey: "timeout" });
  });

  it("as demais chamadas desistem em 15 s", async () => {
    vi.useFakeTimers();
    controlledFetch();
    const result = await settle(api.get("/events?page=0"));

    await vi.advanceTimersByTimeAsync(14_999);
    expect(result.done).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(result.error).toMatchObject({ clientKey: "timeout" });
  });

  it("renovação lenta espera a resposta, não repete e mantém a sessão", async () => {
    vi.useFakeTimers();
    clearSession();
    const { find, urls } = controlledFetch();
    const result = await settle(resumeSession());

    find("/actuator/health")!.resolve(json(200, { status: "UP" }));
    await vi.advanceTimersByTimeAsync(40_000);
    expect(result.done).toBe(false);

    find("/api/auth/refresh")!.resolve(json(200, { token: NEW_TOKEN, expiresIn: 600 }));
    await vi.advanceTimersByTimeAsync(0);

    expect(result.value).toBe(true);
    expect(getSession()?.token).toBe(NEW_TOKEN);
    expect(urls().filter((url) => url === "/api/auth/refresh")).toHaveLength(1);
  });

  it("renovação que estoura o tempo não é repetida", async () => {
    vi.useFakeTimers();
    clearSession();
    const { find, urls } = controlledFetch();
    const result = await settle(resumeSession());

    find("/actuator/health")!.resolve(json(200, { status: "UP" }));
    await vi.advanceTimersByTimeAsync(SESSION_TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(SESSION_TIMEOUT_MS);

    expect(result.error).toMatchObject({ clientKey: "timeout" });
    expect(urls().filter((url) => url === "/api/auth/refresh")).toHaveLength(1);
    expect(onSessionEnded).not.toHaveBeenCalled();
  });
});

describe("aviso de servidor iniciando", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aparece depois de 5 s de espera e some quando a resposta chega", async () => {
    vi.useFakeTimers();
    const { pending } = controlledFetch();
    const changes: boolean[] = [];
    const unsubscribe = subscribeSlowRequests((slow) => changes.push(slow));

    const result = await settle(api.get("/events"));
    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_MS - 1);
    expect(isWaitingSlowRequest()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(isWaitingSlowRequest()).toBe(true);
    expect(changes).toEqual([true]);

    pending[0].resolve(json(200, { content: [] }));
    await vi.advanceTimersByTimeAsync(0);
    expect(result.done).toBe(true);
    expect(isWaitingSlowRequest()).toBe(false);
    expect(changes).toEqual([true, false]);
    unsubscribe();
  });

  it("não aparece para respostas rápidas", async () => {
    vi.useFakeTimers();
    const { pending } = controlledFetch();
    const changes: boolean[] = [];
    const unsubscribe = subscribeSlowRequests((slow) => changes.push(slow));

    await settle(api.get("/events"));
    await vi.advanceTimersByTimeAsync(2_000);
    pending[0].resolve(json(200, {}));
    await vi.advanceTimersByTimeAsync(10_000);

    expect(changes).toEqual([]);
    expect(isWaitingSlowRequest()).toBe(false);
    unsubscribe();
  });

  it("some também quando a chamada termina em erro de tempo esgotado", async () => {
    vi.useFakeTimers();
    controlledFetch();
    const result = await settle(api.get("/events"));

    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_MS);
    expect(isWaitingSlowRequest()).toBe(true);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(result.error).toMatchObject({ clientKey: "timeout" });
    expect(isWaitingSlowRequest()).toBe(false);
  });

  it("com várias chamadas lentas, fica até a última responder", async () => {
    vi.useFakeTimers();
    const { pending } = controlledFetch();
    await settle(api.get("/events"));
    await settle(api.get("/events/categories"));
    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_MS);
    expect(isWaitingSlowRequest()).toBe(true);

    pending[0].resolve(json(200, {}));
    await vi.advanceTimersByTimeAsync(0);
    expect(isWaitingSlowRequest()).toBe(true);

    pending[1].resolve(json(200, []));
    await vi.advanceTimersByTimeAsync(0);
    expect(isWaitingSlowRequest()).toBe(false);
  });
});

describe("aquecimento da API antes do primeiro refresh", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("chama GET /actuator/health direto na API, sem cookie nem token, e renova ao mesmo tempo", async () => {
    vi.useFakeTimers();
    clearSession();
    const { find, urls } = controlledFetch();
    const result = await settle(resumeSession());
    await vi.advanceTimersByTimeAsync(0);

    const health = find("/actuator/health")!;
    expect(urls()).toEqual([health.url, "/api/auth/refresh"]);
    expect(health.url).toMatch(/^https?:\/\/[^/]+\/actuator\/health$/);
    expect(health.init.method).toBe("GET");
    expect(health.init.credentials).toBe("omit");
    expect((health.init.headers as Record<string, string>)["Authorization"]).toBeUndefined();

    find("/api/auth/refresh")!.resolve(json(200, { token: NEW_TOKEN, expiresIn: 600 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(result.value).toBe(true);
    expect(getSession()?.token).toBe(NEW_TOKEN);

    health.resolve(json(200, { status: "UP" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(urls()).toHaveLength(2);
  });

  const refreshUrls = (urls: () => string[]) => urls().filter((url) => url === "/api/auth/refresh");

  it.each([
    ["erro de rede", (entry: Pending) => entry.reject(new TypeError("Failed to fetch"))],
    ["502", (entry: Pending) => entry.resolve(json(502, { title: "Bad Gateway" }))],
    ["503", (entry: Pending) => entry.resolve(json(503, { title: "Service Unavailable" }))],
    ["504", (entry: Pending) => entry.resolve(json(504, { title: "Gateway Timeout" }))],
  ])("renovação que não chegou à API (%s) enquanto ela acorda é repetida depois do health", async (_, fail) => {
    vi.useFakeTimers();
    clearSession();
    const { find, pending, urls } = controlledFetch();
    const result = await settle(resumeSession());
    await vi.advanceTimersByTimeAsync(0);

    fail(find("/api/auth/refresh")!);
    await vi.advanceTimersByTimeAsync(0);
    expect(result.done).toBe(false);
    expect(refreshUrls(urls)).toHaveLength(1);

    find("/actuator/health")!.resolve(json(200, { status: "UP" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshUrls(urls)).toHaveLength(2);

    pending.filter((entry) => entry.url.endsWith("/api/auth/refresh"))[1].resolve(json(200, { token: NEW_TOKEN, expiresIn: 600 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(result.value).toBe(true);
    expect(getSession()?.token).toBe(NEW_TOKEN);
  });

  it.each([
    ["tempo esgotado", (entry: Pending) => entry.reject(new DOMException("aborted", "AbortError")), { clientKey: "timeout" }],
    ["500", (entry: Pending) => entry.resolve(json(500, { title: "Internal Server Error" })), { status: 500 }],
    ["429", (entry: Pending) => entry.resolve(json(429, { title: "Too Many Requests" })), { status: 429 }],
    ["400", (entry: Pending) => entry.resolve(json(400, { title: "Bad Request" })), { status: 400 }],
  ])("renovação que pode ter sido processada (%s) nunca é repetida, nem depois do health", async (_, fail, expected) => {
    vi.useFakeTimers();
    clearSession();
    const { find, urls } = controlledFetch();
    const result = await settle(resumeSession());
    await vi.advanceTimersByTimeAsync(0);

    fail(find("/api/auth/refresh")!);
    await vi.advanceTimersByTimeAsync(0);
    expect(result.error).toMatchObject(expected);

    find("/actuator/health")!.resolve(json(200, { status: "UP" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshUrls(urls)).toHaveLength(1);
    expect(onSessionEnded).not.toHaveBeenCalled();
  });

  it("renovação que falha com 503 depois de a API acordar não é repetida", async () => {
    vi.useFakeTimers();
    clearSession();
    const { find, urls } = controlledFetch();
    const result = await settle(resumeSession());
    await vi.advanceTimersByTimeAsync(0);

    find("/actuator/health")!.resolve(json(200, { status: "UP" }));
    await vi.advanceTimersByTimeAsync(0);
    find("/api/auth/refresh")!.resolve(json(503, { title: "Service Unavailable" }));
    await vi.advanceTimersByTimeAsync(0);

    expect(result.error).toMatchObject({ status: 503 });
    expect(refreshUrls(urls)).toHaveLength(1);
  });

  it("health lento mostra o aviso e espera até 60 s", async () => {
    vi.useFakeTimers();
    clearSession();
    const { find, urls } = controlledFetch();
    await settle(resumeSession());

    await vi.advanceTimersByTimeAsync(SLOW_REQUEST_MS);
    expect(isWaitingSlowRequest()).toBe(true);
    await vi.advanceTimersByTimeAsync(50_000);
    expect(urls()).toHaveLength(2);
    expect(urls()[1]).toBe("/api/auth/refresh");

    find("/actuator/health")!.resolve(json(200, { status: "UP" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(urls()).toHaveLength(2);

    find("/api/auth/refresh")!.resolve(json(200, { token: NEW_TOKEN, expiresIn: 600 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(isWaitingSlowRequest()).toBe(false);
  });

  it("health que falha ou responde 503 não impede a renovação", async () => {
    clearSession();
    const { refreshCount, countFor } = mockFetch((url) => {
      if (url.endsWith("/actuator/health")) return json(503, { status: "DOWN" });
      return json(200, { token: NEW_TOKEN, expiresIn: 600 });
    });

    await expect(resumeSession()).resolves.toBe(true);
    expect(countFor("/actuator/health")).toBe(1);
    expect(refreshCount()).toBe(1);

    clearSession();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/actuator/health")) throw new TypeError("network");
        return json(200, { token: NEW_TOKEN, expiresIn: 600 });
      })
    );
    await expect(resumeSession()).resolves.toBe(true);
  });

  it("chamadas simultâneas fazem um único health e uma única renovação", async () => {
    clearSession();
    const { refreshCount, countFor } = mockFetch(async (url) => {
      await delay(5);
      return url.endsWith("/actuator/health") ? json(200, { status: "UP" }) : json(200, { token: NEW_TOKEN, expiresIn: 600 });
    });

    await Promise.all([resumeSession(), resumeSession()]);
    expect(countFor("/actuator/health")).toBe(1);
    expect(refreshCount()).toBe(1);
  });

  it("não renova se a sessão já existe quando a API acorda", async () => {
    const { refreshCount, countFor } = mockFetch(() => json(200, { status: "UP" }));
    await expect(resumeSession()).resolves.toBe(true);
    expect(countFor("/actuator/health")).toBe(1);
    expect(refreshCount()).toBe(0);
  });
});
