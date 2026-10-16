// Recuperação de senha: leitura do token do link e leitura dos erros da API.

import { ApiError } from "../api/client";

export type ResetLinkProblem = "invalid" | "expired" | "used";

// O token da API é base64url (43 caracteres). A faixa larga evita quebrar a
// tela se o tamanho mudar; o que não tem cara de token nem vai para a API.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,512}$/;

interface UrlParts {
  pathname: string;
  search: string;
  hash: string;
}

interface HistoryLike {
  readonly state: unknown;
  replaceState(data: unknown, unused: string, url?: string | null): void;
}

// Lê o token de /reset-password?token=... O que não tem cara de token vale
// como link inválido, sem chamar a API.
export function readResetToken(search: string): string | null {
  const token = new URLSearchParams(search).get("token")?.trim() ?? "";
  return TOKEN_PATTERN.test(token) ? token : null;
}

// Tira o token da barra de endereço, para ele não ficar no histórico, em
// favoritos nem em capturas de tela. O estado do history é mantido para o
// roteador não perder a posição, e os outros parâmetros continuam.
export function removeResetToken(location: UrlParts, history: HistoryLike) {
  const params = new URLSearchParams(location.search);
  if (!params.has("token")) return;
  params.delete("token");
  const query = params.toString();
  history.replaceState(history.state, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

// Erros que tornam o link inútil: a tela troca o formulário pelo pedido de um link novo.
export function resetLinkProblem(error: unknown): ResetLinkProblem | null {
  if (!(error instanceof ApiError)) return null;
  switch (error.problemType) {
    case "password-reset-token-invalid":
      return "invalid";
    case "password-reset-token-expired":
      return "expired";
    case "password-reset-token-used":
      return "used";
    case "validation-failed":
      return error.fieldErrors.some((e) => e.field === "token") ? "invalid" : null;
    default:
      return null;
  }
}

// Estado que a tela de login recebe depois da troca de senha.
export const PASSWORD_RESET_DONE = { passwordReset: true } as const;

// Segundos de espera depois de um 429 (o Retry-After da API, ou 1 minuto sem ele).
export function resetRetryAfter(error: unknown): number {
  return error instanceof ApiError && error.status === 429 ? error.retryAfter ?? 60 : 0;
}
