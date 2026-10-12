import { clientMessage, genericMessage, problemMessage, withErrorCode, type ProblemScope } from "../i18n/problems";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");
const AUTH_BASE = "/api";
const AUTH_HEADER = "X-Ticketfy-Auth";
const REFRESH_LOCK = "ticketfy-refresh";

const TIMEOUT_MS = 15_000;
const MAX_MESSAGE_LENGTH = 300;
const MIN_VALIDITY_MS = 10_000;
const MAX_EXPIRES_IN_SECONDS = 86_400;

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const AUTH_ROUTES: Record<string, string> = {
  "/auth/login": "POST",
  "/auth/refresh": "POST",
  "/auth/logout": "POST",
  "/auth/logout-all": "POST",
  "/users/me/password": "PATCH",
};

export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldError[];
  retryAfter: number | null;
  problemType: string | null;
  requestId: string | null;
  detail: string | null;
  properties: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    fieldErrors: FieldError[] = [],
    retryAfter: number | null = null,
    problemType: string | null = null,
    requestId: string | null = null,
    detail: string | null = null,
    properties: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.retryAfter = retryAfter;
    this.problemType = problemType;
    this.requestId = requestId;
    this.detail = detail;
    this.properties = properties;
  }
}

export interface Session {
  token: string;
  expiresAt: number;
}

export type SessionEndReason = "expired" | "unauthorized" | "suspended";

interface ClientHooks {
  onRefreshed: (session: Session) => void;
  onSessionEnded: (reason: SessionEndReason) => void;
}

let session: Session | null = null;
let epoch = 0;
let refreshing: Promise<boolean> | null = null;
let hooks: ClientHooks = { onRefreshed: () => {}, onSessionEnded: () => {} };

export function configureClient(options: Partial<ClientHooks>) {
  hooks = { ...hooks, ...options };
}

export function getSession(): Session | null {
  return session;
}

export function setSession(data: { token: unknown; expiresIn: unknown }): Session | null {
  const { token, expiresIn } = data;
  if (typeof token !== "string" || token.length > 4096 || !JWT_PATTERN.test(token)) return null;
  if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0 || expiresIn > MAX_EXPIRES_IN_SECONDS) return null;
  session = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return session;
}

export function adoptSession(value: unknown): Session | null {
  if (typeof value !== "object" || value === null) return null;
  const { token, expiresAt } = value as Record<string, unknown>;
  if (typeof token !== "string" || token.length > 4096 || !JWT_PATTERN.test(token)) return null;
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  if (expiresAt > Date.now() + MAX_EXPIRES_IN_SECONDS * 1000) return null;
  session = { token, expiresAt };
  return session;
}

export function clearSession() {
  session = null;
  epoch += 1;
}

function isFresh(current: Session | null): current is Session {
  return current !== null && current.expiresAt - Date.now() > MIN_VALIDITY_MS;
}

function endSession(reason: SessionEndReason) {
  session = null;
  hooks.onSessionEnded(reason);
}

export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    const startedWith = session?.token ?? null;
    refreshing = withRefreshLock(() => performRefresh(startedWith)).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks || typeof locks.request !== "function") return task();
  return locks.request(REFRESH_LOCK, { mode: "exclusive" }, task) as Promise<T>;
}

async function performRefresh(startedWith: string | null): Promise<boolean> {
  if (isFresh(session) && session.token !== startedWith) return true;
  const startedEpoch = epoch;
  const response = await authFetch("POST", "/auth/refresh", {});
  if (startedEpoch !== epoch) return false;
  if (response.ok) {
    const next = setSession((await readJson(response)) ?? {});
    if (!next) {
      endSession("unauthorized");
      return false;
    }
    hooks.onRefreshed(next);
    return true;
  }
  if (response.status === 401 || response.status === 403) {
    const error = await toApiError(response);
    endSession(error.problemType === "account-suspended" ? "suspended" : "expired");
    return false;
  }
  throw await toApiError(response);
}

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(method, path, options, "application/json");
  if (response.status === 204) return undefined as T;
  return (await readJson(response)) as T;
}

export async function apiDownload(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const response = await send("GET", path, {}, "text/csv, application/problem+json");
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return { blob: await response.blob(), filename: match ? match[1] : null };
}

async function send(method: string, path: string, options: RequestOptions, accept: string): Promise<Response> {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
    throw new ApiError(0, clientMessage("invalidRoute"));
  }

  let response = await sendOnce(method, path, options, accept);
  if (response.used !== null && response.result.status === 401) {
    const current = getSession();
    const renewed = current !== null && current.token !== response.used ? true : await refreshSession();
    if (!renewed) throw await toApiError(response.result);
    response = await sendOnce(method, path, options, accept);
  }

  if (!response.result.ok) throw await toApiError(response.result);
  return response.result;
}

async function sendOnce(
  method: string,
  path: string,
  options: RequestOptions,
  accept: string
): Promise<{ result: Response; used: string | null }> {
  const headers: Record<string, string> = { Accept: accept, ...options.headers };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const token = session?.token ?? null;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const result = await timedFetch(`${API_URL}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "omit",
    cache: token ? "no-store" : "default",
  });
  return { result, used: token };
}

interface AuthOptions {
  body?: unknown;
  authenticated?: boolean;
  keepalive?: boolean;
}

async function authFetch(method: string, path: string, options: AuthOptions): Promise<Response> {
  if (AUTH_ROUTES[path] !== method) throw new ApiError(0, clientMessage("invalidRoute"));

  const headers: Record<string, string> = { Accept: "application/json", [AUTH_HEADER]: "1" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.authenticated && session) headers["Authorization"] = `Bearer ${session.token}`;

  return timedFetch(`${AUTH_BASE}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
    keepalive: options.keepalive ?? false,
  });
}

export async function authRequest<T>(method: string, path: string, options: AuthOptions = {}): Promise<T> {
  if (options.authenticated) {
    if (!isFresh(session)) {
      const renewed = await refreshSession();
      if (!renewed || !isFresh(session)) throw new ApiError(401, genericMessage(401, null));
    }
  }
  const response = await authFetch(method, path, options);
  if (!response.ok) {
    if (options.authenticated && response.status === 401) endSession("unauthorized");
    throw await toApiError(response);
  }
  if (response.status === 204) return undefined as T;
  return (await readJson(response)) as T;
}

export function sendLogout() {
  authFetch("POST", "/auth/logout", { keepalive: true }).catch(() => {});
}

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    throw new ApiError(0, clientMessage(timedOut ? "timeout" : "network"));
  } finally {
    clearTimeout(timer);
  }
}

const STANDARD_PROBLEM_FIELDS = new Set(["type", "title", "status", "detail", "instance", "errors", "requestId"]);

async function toApiError(response: Response): Promise<ApiError> {
  const body = await readJson(response);
  const fieldErrors: FieldError[] = Array.isArray(body?.errors) ? body.errors.filter(isFieldError).slice(0, 10) : [];
  const detail = typeof body?.detail === "string" && body.detail.trim() ? truncate(body.detail.trim()) : null;
  const requestId = parseRequestId(response.headers.get("X-Request-Id")) ?? parseRequestId(body?.requestId);
  const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
  const problemType = problemSlug(body?.type);
  const properties = problemProperties(body);
  const known = problemMessage(problemType, { status: response.status, retryAfter, detail, properties });
  const message =
    known === null
      ? genericMessage(response.status, requestId)
      : response.status >= 500
        ? withErrorCode(known, requestId)
        : known;
  return new ApiError(response.status, message, fieldErrors, retryAfter, problemType, requestId, detail, properties);
}

function problemProperties(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return {};
  return Object.fromEntries(Object.entries(body).filter(([key]) => !STANDARD_PROBLEM_FIELDS.has(key)));
}

export function errorMessage(error: unknown, scope?: ProblemScope): string | null {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (!scope) return error.message;
    const scoped = problemMessage(error.problemType, {
      status: error.status,
      retryAfter: error.retryAfter,
      detail: error.detail,
      properties: error.properties,
    }, scope);
    return scoped ?? error.message;
  }
  return error instanceof Error ? error.message : clientMessage("unexpected");
}

function parseRetryAfter(value: string | null): number | null {
  if (!value || !/^\d{1,5}$/.test(value.trim())) return null;
  const seconds = Number(value.trim());
  return seconds > 0 && seconds <= 86_400 ? seconds : null;
}

function parseRequestId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return /^[A-Za-z0-9-]{1,64}$/.test(id) ? id : null;
}

function problemSlug(type: unknown): string | null {
  if (typeof type !== "string") return null;
  const slug = type.split("/").pop()?.trim();
  return slug ? slug : null;
}

function isFieldError(value: unknown): value is FieldError {
  if (typeof value !== "object" || value === null) return false;
  const { field, message } = value as Record<string, unknown>;
  return typeof field === "string" && field.trim() !== "" && typeof message === "string" && message.trim() !== "";
}

export function fieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return error.fieldErrors.find((e) => e.field === field)?.message;
}

export function hasUnmappedError(error: unknown, fields: readonly string[]): boolean {
  if (!error) return false;
  if (!(error instanceof ApiError) || error.fieldErrors.length === 0) return true;
  return error.fieldErrors.some((e) => !fields.includes(e.field));
}

async function readJson(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function truncate(text: string) {
  return text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH)}…` : text;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>("GET", path),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>("POST", path, { body, headers }),
  put: <T>(path: string, body: unknown) => apiRequest<T>("PUT", path, { body }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>("PATCH", path, { body }),
  delete: <T>(path: string) => apiRequest<T>("DELETE", path),
};

export const authApi = {
  post: <T>(path: string, body?: unknown, options: { authenticated?: boolean } = {}) =>
    authRequest<T>("POST", path, { body, ...options }),
  patch: <T>(path: string, body: unknown, options: { authenticated?: boolean } = {}) =>
    authRequest<T>("PATCH", path, { body, ...options }),
};
