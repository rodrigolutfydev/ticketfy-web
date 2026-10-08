import { ApiError } from "../api/client";
import type { DiscountType } from "../api/types";
import { formatPrice } from "./format";

const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

export const formatDiscount = (type: DiscountType, value: number) =>
  type === "PERCENT" ? `${percentFormatter.format(value)}%` : formatPrice(value);

export function couponErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : "Não foi possível aplicar o cupom.";
  switch (error.problemType) {
    case "invalid-coupon":
      return "Cupom inválido ou indisponível para este pedido.";
    case "too-many-coupon-attempts":
      return `Muitas tentativas com cupom. Tente de novo em ${Math.max(1, Math.ceil((error.retryAfter ?? 60) / 60))} min.`;
    case "ticket-type-not-found":
      return "Algum ingresso do pedido não está mais à venda.";
    default:
      return error.fieldErrors.length > 0 ? "Confira o código do cupom." : error.message;
  }
}

export const isCouponError = (error: unknown) =>
  error instanceof ApiError && (error.problemType === "invalid-coupon" || error.problemType === "too-many-coupon-attempts");

export function couponManagementError(error: unknown): string | null {
  if (!error) return null;
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : null;
  switch (error.problemType) {
    case "coupon-code-already-exists":
      return "Já existe um cupom com esse código neste evento.";
    case "coupon-already-used":
      return "Este cupom já foi usado: tipo e valor não podem mudar e ele não pode ser excluído, só desativado.";
    case "invalid-coupon-settings":
      return /maxUses/.test(error.message)
        ? "O limite de usos não pode ficar abaixo dos usos já feitos."
        : /endsAt/.test(error.message)
          ? "O fim da validade precisa ser depois do início."
          : "Percentual precisa estar entre 0,01 e 100.";
    case "invalid-event-state":
      return "O evento foi cancelado e os cupons não podem mais ser alterados.";
    case "coupon-not-found":
      return "Este cupom não existe mais.";
    default:
      return error.fieldErrors.length > 0 ? "Confira os campos do cupom." : error.message;
  }
}

export type CouponStatus = "active" | "inactive" | "scheduled" | "expired" | "exhausted";

export function couponStatus(
  coupon: { active: boolean; startsAt: string | null; endsAt: string | null; maxUses: number | null; usesCount: number },
  now = Date.now(),
): CouponStatus {
  if (!coupon.active) return "inactive";
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() <= now) return "expired";
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return "scheduled";
  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) return "exhausted";
  return "active";
}

export const COUPON_STATUS_LABELS: Record<CouponStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  scheduled: "Agendado",
  expired: "Expirado",
  exhausted: "Esgotado",
};
