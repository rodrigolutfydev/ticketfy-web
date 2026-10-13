import type { OrderStatus } from "../../../api/types";

export const ORDER_STATUS_DOTS: Record<OrderStatus, string> = {
  PENDING: "bg-warning",
  PAID: "bg-success",
  CANCELLED: "bg-subtle",
  EXPIRED: "bg-line-strong",
  REFUNDED: "bg-info",
};
