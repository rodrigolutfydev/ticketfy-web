import { ApiError } from "../api/client";
import type { Role } from "../api/types";

export const ACCOUNT_SUSPENDED_MESSAGE = "Sua conta está suspensa. Fale com o suporte para saber mais.";

export const isAccountSuspendedError = (error: unknown) =>
  error instanceof ApiError && error.problemType === "account-suspended";

export function loginErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (isAccountSuspendedError(error)) return ACCOUNT_SUSPENDED_MESSAGE;
  if (error instanceof ApiError && (error.status === 400 || error.status === 401)) return "E-mail ou senha incorretos.";
  if (error instanceof ApiError && error.status === 403) return "Não foi possível entrar a partir desta página. Recarregue e tente de novo.";
  return error instanceof Error ? error.message : null;
}

export function suspensionConsequences(role: Role): string[] {
  const consequences = [
    "Todas as sessões abertas são encerradas na hora, e a pessoa não consegue entrar nem renovar a sessão.",
    "Os pedidos pendentes são cancelados, e os ingressos e usos de cupom voltam à venda.",
    "Ingressos já pagos continuam válidos.",
  ];
  if (role === "ORGANIZER") {
    consequences.push(
      "As vendas dos eventos deste organizador ficam pausadas, e os eventos saem da busca e dos destaques.",
      "Os saques solicitados ficam retidos até a reativação.",
    );
  }
  return consequences;
}
