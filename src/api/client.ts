// Ponto único de comunicação com a API Spring Boot.
// Toda requisição passa por aqui: endereço da API, token, tempo limite e erros.
// Se algo precisa valer para TODAS as chamadas (ex.: um cabeçalho novo),
// é aqui que muda, e não em cada tela.

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

// Requisição que passar disso é cancelada. Sem limite, uma API travada
// deixaria o botão "carregando" para sempre.
const TIMEOUT_MS = 15_000;

// Mensagens de erro vindas da API são exibidas na tela. Limitar o tamanho
// evita que uma resposta enorme (ex.: stack trace) quebre o layout.
const MAX_MESSAGE_LENGTH = 300;

export type FieldError = { field: string; message: string };

// Erro padronizado: as telas olham "status" para decidir o que mostrar
// (401 = faça login, 403 = sem permissão, 409 = conflito...).
export class ApiError extends Error {
  status: number;
  fieldErrors: FieldError[];
  // Segundos até poder tentar de novo (cabeçalho Retry-After do 429).
  retryAfter: number | null;
  problemType: string | null;
  requestId: string | null;

  constructor(
    status: number,
    message: string,
    fieldErrors: FieldError[] = [],
    retryAfter: number | null = null,
    problemType: string | null = null,
    requestId: string | null = null
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.retryAfter = retryAfter;
    this.problemType = problemType;
    this.requestId = requestId;
  }
}

// Retry-After vem em segundos. Valores absurdos são ignorados.
function parseRetryAfter(value: string | null): number | null {
  if (!value || !/^\d{1,5}$/.test(value.trim())) return null;
  const seconds = Number(value.trim());
  return seconds > 0 && seconds <= 86_400 ? seconds : null;
}

// O AuthProvider registra aqui como ler o token e o que fazer num 401.
// (O cliente não importa o AuthContext direto para não criar dependência circular.)
let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function configureClient(options: { getToken: () => string | null; onUnauthorized: () => void }) {
  getToken = options.getToken;
  onUnauthorized = options.onUnauthorized;
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
  // Defesa extra: o caminho tem que ser uma rota da própria API.
  // Os IDs já chegam codificados pelos endpoints (veja seg() em endpoints.ts),
  // então ".." ou "//" aqui só apareceriam por erro de programação.
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
    throw new ApiError(0, "Rota inválida.");
  }

  const headers: Record<string, string> = { Accept: accept, ...options.headers };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // AbortController permite cancelar o fetch quando o tempo estoura.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      // O token vai no cabeçalho Authorization, nunca em cookie. Com
      // "omit", o navegador não anexa cookies de jeito nenhum, o que
      // elimina a classe de ataque CSRF (outro site disparando ações
      // em nome do usuário usando os cookies dele).
      credentials: "omit",
      // Dados de usuário logado não ficam guardados no cache HTTP do navegador
      // (num computador compartilhado, o próximo usuário não os veria).
      cache: token ? "no-store" : "default",
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    throw new ApiError(
      0,
      timedOut ? "A API demorou demais para responder. Tente de novo." : "Não foi possível conectar à API. Ela está no ar?"
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 && token) {
    // Token vencido, inválido ou revogado: encerra a sessão local.
    onUnauthorized();
  }

  if (!response.ok) {
    const body = await readJson(response);
    const fieldErrors: FieldError[] = Array.isArray(body?.errors)
      ? body.errors.filter(isFieldError).slice(0, 10)
      : [];
    const detail = typeof body?.detail === "string" && body.detail.trim() ? body.detail.trim() : null;
    const raw =
      fieldErrors.length > 0
        ? fieldErrors.map((e) => `${e.field}: ${e.message}`).join(" · ")
        : detail ?? defaultMessage(response.status);
    const requestId = parseRequestId(response.headers.get("X-Request-Id")) ?? parseRequestId(body?.requestId);
    const message =
      response.status >= 500 && requestId ? `${truncate(raw)} Código do erro: ${requestId}` : truncate(raw);
    throw new ApiError(
      response.status,
      message,
      fieldErrors,
      parseRetryAfter(response.headers.get("Retry-After")),
      problemSlug(body?.type),
      requestId
    );
  }

  return response;
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

// Lê JSON sem explodir: corpo vazio ou que não é JSON vira null.
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

function defaultMessage(status: number) {
  if (status === 400) return "Dados inválidos. Confira os campos.";
  if (status === 401) return "Faça login para continuar.";
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 404) return "Não encontrado.";
  if (status === 409) return "Essa ação conflita com o estado atual. Atualize a página.";
  if (status === 429) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  if (status >= 500) return "A API teve um problema interno. Tente de novo em instantes.";
  return `Erro ${status}`;
}

// Atalhos por método HTTP, usados em endpoints.ts.
export const api = {
  get: <T>(path: string) => apiRequest<T>("GET", path),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    apiRequest<T>("POST", path, { body, headers }),
  put: <T>(path: string, body: unknown) => apiRequest<T>("PUT", path, { body }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>("PATCH", path, { body }),
  delete: <T>(path: string) => apiRequest<T>("DELETE", path),
};
