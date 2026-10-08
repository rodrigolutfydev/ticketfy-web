import { describe, expect, it, vi } from "vitest";
import { proxyAuth } from "../functions/_lib/authProxy";

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
});
