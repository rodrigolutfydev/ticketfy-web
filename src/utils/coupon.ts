import { ApiError, errorMessage } from "../api/client";
import type { DiscountType } from "../api/types";
import { formatPrice } from "./format";

const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

export const formatDiscount = (type: DiscountType, value: number) =>
  type === "PERCENT" ? `${percentFormatter.format(value)}%` : formatPrice(value);

export const couponErrorMessage = (error: unknown) => errorMessage(error, "checkout-coupon");

export const isCouponError = (error: unknown) =>
  error instanceof ApiError &&
  (error.problemType === "invalid-coupon" ||
    error.problemType === "too-many-coupon-attempts" ||
    error.problemType === "coupon-buyer-limit-reached");

export const couponManagementError = (error: unknown) => errorMessage(error, "coupon-management");

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
