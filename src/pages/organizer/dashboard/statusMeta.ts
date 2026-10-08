import type { OrderStatus } from "../../../api/types";

// Nome e cor de cada status de pedido nos gráficos e tabelas do organizador.
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; dot: string }> = {
  PENDING: { label: "Pendentes", dot: "bg-warning" },
  PAID: { label: "Pagos", dot: "bg-success" },
  CANCELLED: { label: "Cancelados", dot: "bg-subtle" },
  EXPIRED: { label: "Expirados", dot: "bg-line-strong" },
  REFUNDED: { label: "Reembolsados", dot: "bg-info" },
};
