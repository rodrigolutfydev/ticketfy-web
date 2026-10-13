export interface AuthProxyEnv {
  API_ORIGIN?: string;
  PROXY_SHARED_SECRET?: string;
}

export interface AuthProxyContext {
  request: Request;
  env: AuthProxyEnv;
}

export const AUTH_PROXY_ROUTES: Readonly<Record<string, string>> = {
  "/api/auth/login": "POST",
  "/api/auth/refresh": "POST",
  "/api/auth/logout": "POST",
  "/api/auth/logout-all": "POST",
  "/api/users/me/password": "PATCH",
  "/api/users/me/deletion": "POST",
};

const FORWARDED_REQUEST_HEADERS = ["Content-Type", "Authorization", "Origin", "X-Ticketfy-Auth", "X-Request-Id"];
const FORWARDED_RESPONSE_HEADERS = ["Content-Type", "Retry-After", "X-Request-Id"];
const REFRESH_COOKIE = "__Host-ticketfy_rt";
const MAX_BODY_BYTES = 8192;

export async function proxyAuth({ request, env }: AuthProxyContext): Promise<Response> {
  const url = new URL(request.url);
  const method = AUTH_PROXY_ROUTES[url.pathname];
  if (!method) return problem(404, "Not found");
  if (request.method !== method) return problem(405, "Method not allowed", { Allow: method });
  if (request.headers.get("Origin") !== url.origin) return problem(403, "Request rejected");

  const apiOrigin = parseApiOrigin(env.API_ORIGIN);
  const secret = env.PROXY_SHARED_SECRET?.trim();
  if (!apiOrigin || !secret) return problem(500, "Auth proxy is not configured");

  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (!Number.isFinite(declaredLength) || declaredLength > MAX_BODY_BYTES) return problem(413, "Payload too large");
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) return problem(413, "Payload too large");

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const cookie = refreshCookie(request.headers.get("Cookie"));
  if (cookie) headers.set("Cookie", cookie);
  headers.set("X-Proxy-Secret", secret);
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp) headers.set("X-Client-IP", clientIp);

  let upstream: Response;
  try {
    upstream = await fetch(`${apiOrigin}${url.pathname.slice("/api".length)}`, {
      method,
      headers,
      body: body.byteLength > 0 ? body : undefined,
      redirect: "manual",
    });
  } catch {
    return problem(502, "Authentication service unavailable");
  }

  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) responseHeaders.set(name, value);
  }
  for (const value of upstream.headers.getSetCookie()) responseHeaders.append("Set-Cookie", value);

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

function parseApiOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

function refreshCookie(header: string | null): string | null {
  if (!header) return null;
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REFRESH_COOKIE}=`));
  return match ?? null;
}

function problem(status: number, title: string, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ type: "about:blank", title, status }), {
    status,
    headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store", ...extra },
  });
}
