import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { AUTH_PROXY_ROUTES, proxyAuth } from "../functions/_lib/authProxy";

const SITE = "https://ticketfy.pages.dev";
const env = { API_ORIGIN: "https://api.example.com", PROXY_SHARED_SECRET: "s3cret" };

function request(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  return new Request(`${SITE}${path}`, {
    method: "POST",
    ...init,
    headers: { Origin: SITE, "X-Ticketfy-Auth": "1", ...init.headers },
  });
}

function upstream(response: Response) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("proxy de autenticação", () => {
  it("repassa só os cabeçalhos permitidos e acrescenta segredo e IP do cliente", async () => {
    const headers = new Headers({ "Content-Type": "application/json", "X-Request-Id": "abc", "X-Internal": "x" });
    headers.append("Set-Cookie", "__Host-ticketfy_rt=new; Path=/; HttpOnly");
    headers.append("Set-Cookie", "other=1");
    const fetchMock = upstream(new Response('{"token":"t"}', { status: 200, headers }));

    const response = await proxyAuth({
      request: request("/api/auth/refresh?x=1", {
        headers: {
          Cookie: "theme=dark; __Host-ticketfy_rt=old; foo=bar",
          "CF-Connecting-IP": "203.0.113.7",
          "X-Proxy-Secret": "forged",
          "X-Client-IP": "1.2.3.4",
          "User-Agent": "test",
        },
      }),
      env,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/auth/refresh");
    const sent = init?.headers as Headers;
    expect(sent.get("Cookie")).toBe("__Host-ticketfy_rt=old");
    expect(sent.get("X-Proxy-Secret")).toBe("s3cret");
    expect(sent.get("X-Client-IP")).toBe("203.0.113.7");
    expect(sent.get("Origin")).toBe(SITE);
    expect(sent.get("X-Ticketfy-Auth")).toBe("1");
    expect(sent.get("User-Agent")).toBeNull();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Request-Id")).toBe("abc");
    expect(response.headers.get("X-Internal")).toBeNull();
    expect(response.headers.getSetCookie()).toEqual(["__Host-ticketfy_rt=new; Path=/; HttpOnly", "other=1"]);
  });

  it("aceita PATCH só na troca de senha", async () => {
    const fetchMock = upstream(new Response(null, { status: 204 }));

    expect((await proxyAuth({ request: request("/api/users/me/password", { method: "POST" }), env })).status).toBe(405);
    expect((await proxyAuth({ request: request("/api/auth/login", { method: "PATCH", body: "{}" }), env })).status).toBe(405);
    expect((await proxyAuth({ request: request("/api/auth/sessions"), env })).status).toBe(404);
    expect((await proxyAuth({ request: request("/api/users/me/password", { method: "PATCH", body: "{}" }), env })).status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aceita só POST na exclusão de conta, repassando o cookie que a API apaga", async () => {
    const fetchMock = upstream(new Response(null, { status: 204, headers: { "Set-Cookie": "__Host-ticketfy_rt=; Max-Age=0; Path=/" } }));

    expect((await proxyAuth({ request: request("/api/users/me/deletion", { method: "DELETE" }), env })).status).toBe(405);
    const response = await proxyAuth({ request: request("/api/users/me/deletion", { method: "POST", body: "{}" }), env });
    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie()).toEqual(["__Host-ticketfy_rt=; Max-Age=0; Path=/"]);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.example.com/users/me/deletion");
  });

  it("repassa o login com Google em POST, com corpo e cookie da sessão nova", async () => {
    const fetchMock = upstream(
      new Response('{"token":"t","expiresIn":600}', {
        status: 200,
        headers: { "Content-Type": "application/json", "Set-Cookie": "__Host-ticketfy_rt=new; Path=/; HttpOnly" },
      }),
    );
    const body = JSON.stringify({ code: "4/0AQ", codeVerifier: "v".repeat(64), redirectUri: `${SITE}/auth/google/callback` });

    expect((await proxyAuth({ request: request("/api/auth/google", { method: "GET" }), env })).status).toBe(405);
    const response = await proxyAuth({
      request: request("/api/auth/google", { body, headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.7" } }),
      env,
    });

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual(["__Host-ticketfy_rt=new; Path=/; HttpOnly"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/auth/google");
    expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe(body);
    expect((init?.headers as Headers).get("X-Client-IP")).toBe("203.0.113.7");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recusa Origin diferente, configuração ausente e corpo grande sem chamar a API", async () => {
    const fetchMock = upstream(new Response(null, { status: 204 }));

    expect((await proxyAuth({ request: request("/api/auth/login", { headers: { Origin: "https://evil.example" } }), env })).status).toBe(403);
    expect((await proxyAuth({ request: request("/api/auth/login"), env: { API_ORIGIN: env.API_ORIGIN } })).status).toBe(500);
    expect((await proxyAuth({ request: request("/api/auth/login"), env: { ...env, API_ORIGIN: "http://api.example.com" } })).status).toBe(500);
    expect((await proxyAuth({ request: request("/api/auth/login", { body: "x".repeat(9000) }), env })).status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devolve 502 quando a API não responde", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("network"))));

    const response = await proxyAuth({ request: request("/api/auth/logout"), env });
    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("repassa a recuperação de senha em POST, com Origin, X-Ticketfy-Auth e Retry-After", async () => {
    const fetchMock = upstream(new Response(null, { status: 429, headers: { "Retry-After": "600" } }));

    const response = await proxyAuth({ request: request("/api/auth/password-reset/request", { body: '{"email":"a@b.c"}' }), env });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("600");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/auth/password-reset/request");
    const sent = init?.headers as Headers;
    expect(sent.get("Origin")).toBe(SITE);
    expect(sent.get("X-Ticketfy-Auth")).toBe("1");

    upstream(new Response(null, { status: 204 }));
    expect((await proxyAuth({ request: request("/api/auth/password-reset/confirm", { body: "{}" }), env })).status).toBe(204);
    expect((await proxyAuth({ request: request("/api/auth/password-reset/confirm", { method: "PATCH", body: "{}" }), env })).status).toBe(405);
    expect((await proxyAuth({ request: request("/api/auth/password-reset/other", { body: "{}" }), env })).status).toBe(404);
  });

  it("todas as rotas do proxy estão no _routes.json da Cloudflare e no proxy do npm run dev", () => {
    const routes = JSON.parse(readFileSync(new URL("../public/_routes.json", import.meta.url), "utf8")) as { include: string[] };
    const covered = (path: string) =>
      routes.include.some((pattern) => (pattern.endsWith("/*") ? path.startsWith(pattern.slice(0, -1)) : path === pattern));
    const viteConfig = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
    const devProxy = /proxy: \{ "([^"]+)"/.exec(viteConfig)?.[1].replace(/\\\\/g, "\\");
    expect(devProxy).toBeTruthy();
    for (const [path, method] of Object.entries(AUTH_PROXY_ROUTES)) {
      expect(covered(path), path).toBe(true);
      expect(new RegExp(devProxy!).test(path), path).toBe(true);
      expect(viteConfig, path).toContain(`"${path}": "${method}"`);
    }
    expect(AUTH_PROXY_ROUTES["/api/auth/password-reset/request"]).toBe("POST");
    expect(AUTH_PROXY_ROUTES["/api/auth/password-reset/confirm"]).toBe("POST");
  });
});
