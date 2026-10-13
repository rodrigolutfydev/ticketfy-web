import { ApiError, errorMessage } from "../api/client";
import type { Role } from "../api/types";
import { getLocale, type Locale } from "../i18n/locale";
import { MESSAGES } from "../i18n/messages";
import { problemText } from "../i18n/problems";

export const accountSuspendedMessage = () => problemText("account-suspended");

export const isAccountSuspendedError = (error: unknown) =>
  error instanceof ApiError && error.problemType === "account-suspended";

export const loginErrorMessage = (error: unknown) => errorMessage(error, "login");

export function suspensionConsequences(role: Role, locale: Locale = getLocale()): string[] {
  const copy = MESSAGES[locale].labels.suspension;
  return role === "ORGANIZER" ? [...copy.everyone, ...copy.organizer] : [...copy.everyone];
}
