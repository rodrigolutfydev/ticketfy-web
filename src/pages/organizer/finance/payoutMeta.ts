import type { Balance, PayoutAccount, PayoutStatus, PixKeyType } from "../../../api/types";
import { getLocale, type Locale } from "../../../i18n/locale";
import { MESSAGES } from "../../../i18n/messages";
import { formatDate, formatPrice, formatTime } from "../../../utils/format";
import { STATUS_TONES } from "../../../components/StatusBadge";

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

// Cores dos selos de saque (mesma paleta dos selos de pedido e ingresso).
export const PAYOUT_STATUS_STYLES: Record<PayoutStatus, string> = {
  UNDER_REVIEW: STATUS_TONES.info,
  REQUESTED: STATUS_TONES.warning,
  PROCESSING: STATUS_TONES.accent,
  PAID: STATUS_TONES.success,
  FAILED: STATUS_TONES.danger,
  CANCELLED: STATUS_TONES.muted,
  REJECTED: STATUS_TONES.danger,
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
