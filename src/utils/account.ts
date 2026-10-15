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

export const SET_PASSWORD_PATH = "/account?tab=seguranca";

type PasswordState = { hasPassword?: boolean } | null | undefined;

export const hasNoPassword = (me: PasswordState) => me?.hasPassword === false;

export const isPasswordNotSetError = (error: unknown) => error instanceof ApiError && error.problemType === "password-not-set";

export const needsPasswordSetup = (me: PasswordState, error: unknown) => hasNoPassword(me) || isPasswordNotSetError(error);

export const sameEmail = (typed: string, accountEmail: string) => typed.trim().toLowerCase() === accountEmail.trim().toLowerCase();

export function deletionProof(me: PasswordState, { password, email }: { password: string; email: string }): { password: string } | { email: string } {
  return hasNoPassword(me) ? { email: email.trim() } : { password };
}

export function passwordChangeBody(setting: boolean, currentPassword: string, newPassword: string): { currentPassword?: string; newPassword: string } {
  return setting ? { newPassword } : { currentPassword, newPassword };
}
