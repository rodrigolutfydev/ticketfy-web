import type { Balance, PayoutAccount, PayoutStatus, PixKeyType } from "../../../api/types";
import { getLocale, type Locale } from "../../../i18n/locale";
import { MESSAGES } from "../../../i18n/messages";
import { formatDate, formatPrice, formatTime } from "../../../utils/format";

export const PIX_KEY_TYPES: PixKeyType[] = ["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"];

export function pixKeyPlaceholder(type: PixKeyType, locale: Locale = getLocale()) {
  const placeholders: Record<PixKeyType, string> = {
    CPF: "000.000.000-00",
    CNPJ: "00.000.000/0000-00",
    EMAIL: MESSAGES[locale].organizer.payoutAccount.emailPlaceholder,
    PHONE: "+55 (11) 91234-5678",
    RANDOM: "123e4567-e89b-12d3-a456-426614174000",
  };
  return placeholders[type];
}

export const PAYOUT_STATUS_STYLES: Record<PayoutStatus, string> = {
  UNDER_REVIEW: "text-accent-text bg-accent/12 border-accent/30",
  REQUESTED: "text-warning bg-warning/12 border-warning/30",
  PROCESSING: "text-info bg-info/12 border-info/30",
  PAID: "text-success bg-success/12 border-success/30",
  FAILED: "text-danger bg-danger/10 border-danger/30",
  CANCELLED: "text-muted bg-raised border-line",
  REJECTED: "text-danger bg-danger/10 border-danger/30",
};

export const CANCELLABLE_STATUSES: PayoutStatus[] = ["UNDER_REVIEW", "REQUESTED"];

export const formatDateTime = (iso: string, locale: Locale = getLocale()) =>
  MESSAGES[locale].organizer.finance.dateTime(formatDate(iso, locale), formatTime(iso, locale));

export function payoutBlockedReason(balance: Balance, account: PayoutAccount | null, locale: Locale = getLocale()): string | null {
  const reasons = MESSAGES[locale].organizer.finance.blocked;
  if (balance.payoutsBlocked) return reasons.blocked;
  if (!account) return reasons.noAccount;
  if (account.payoutsBlockedUntil) return reasons.cooldown(formatDateTime(account.payoutsBlockedUntil, locale));
  if (balance.inPayout > 0) return reasons.inProgress;
  if (balance.available < 0) return reasons.negative;
  if (balance.available < balance.minPayoutAmount) return reasons.belowMinimum(formatPrice(balance.minPayoutAmount, locale));
  return null;
}
