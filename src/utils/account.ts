import { ApiError, errorMessage } from "../api/client";
import type { Role } from "../api/types";
import { problemText } from "../i18n/problems";

export const accountSuspendedMessage = () => problemText("account-suspended");

export const isAccountSuspendedError = (error: unknown) =>
  error instanceof ApiError && error.problemType === "account-suspended";

export const loginErrorMessage = (error: unknown) => errorMessage(error, "login");

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
