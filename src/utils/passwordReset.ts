// Recuperação de senha: leitura do token do link e leitura dos erros da API.

import { ApiError } from "../api/client";

export type ResetLinkProblem = "invalid" | "expired" | "used";

// O token da API é base64url (43 caracteres). A faixa larga evita quebrar a
// tela se o tamanho mudar; o que não tem cara de token nem vai para a API.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,512}$/;

// Lê o token de /reset-password?token=... O que não tem cara de token vale
// como link inválido, sem chamar a API.
export function readResetToken(search: string): string | null {
  const token = new URLSearchParams(search).get("token")?.trim() ?? "";
  return TOKEN_PATTERN.test(token) ? token : null;
}

// O token sai da URL logo na primeira montagem da tela. Se a tela montar de
// novo (Suspense, ErrorBoundary, StrictMode, troca de rota), ela o encontra
// aqui, na memória do módulo, e não em storage: some ao fechar ou recarregar a aba.
let rememberedToken: string | null = null;

// Um token na URL sempre vence o guardado (link novo, ou malformado, que vira
// link inválido). Sem token na URL, vale o que a tela já tinha lido.
export function takeResetToken(search: string): string | null {
  if (new URLSearchParams(search).has("token")) rememberedToken = readResetToken(search);
  return rememberedToken;
}

// Depois da troca, ou quando a API diz que o link não serve mais.
export function forgetResetToken() {
  rememberedToken = null;
}

// Query sem o token, para a tela trocar a URL pelo próprio roteador (replace),
// sem o token no histórico, em favoritos ou em capturas de tela. Os outros
// parâmetros continuam. null quando não há token a tirar.
export function searchWithoutResetToken(search: string): string | null {
  const params = new URLSearchParams(search);
  if (!params.has("token")) return null;
  params.delete("token");
  const query = params.toString();
  return query ? `?${query}` : "";
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
