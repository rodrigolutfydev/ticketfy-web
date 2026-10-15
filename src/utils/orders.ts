import type { OrderDetails, OrderStatus } from "../api/types";

export interface OrderEvent {
  id: string;
  name: string;
  startsAt: string | null;
}

// Evento do pedido (eventId, eventName, eventStartsAt). Respostas antigas da
// API não trazem esses campos: aí a tela simplesmente não mostra o evento.
export function orderEvent(order: { eventId?: string | null; eventName?: string | null; eventStartsAt?: string | null }): OrderEvent | null {
  if (!order.eventId || !order.eventName) return null;
  return { id: order.eventId, name: order.eventName, startsAt: order.eventStartsAt ?? null };
}

export type CancelledEventNote = "refunded" | "manualRefund" | "refundProcessing" | "freeCancelled" | "cancelled";

// Complemento do aviso "o evento foi cancelado", conforme o que a API fez
// com o pedido: pago e reembolsado, pago com ingresso usado (reembolso
// manual, continua PAID), gratuito (CANCELLED, sem reembolso) ou pendente
// (CANCELLED, sem cobrança).
export function cancelledEventNote(order: Pick<OrderDetails, "status" | "totalAmount" | "tickets" | "eventCancelled">): CancelledEventNote | null {
  if (!order.eventCancelled) return null;
  if (order.status === "REFUNDED") return "refunded";
  if (order.status === "PAID") return (order.tickets ?? []).some((ticket) => ticket.status === "USED") ? "manualRefund" : "refundProcessing";
  if (order.status === "CANCELLED") return order.totalAmount === 0 ? "freeCancelled" : "cancelled";
  return null;
}

export type StepKey = "created" | "awaitingPayment" | "issued" | "confirmed" | "approved" | "refunded" | "ticketsCancelled" | "expired" | "cancelled";
export interface OrderStep {
  key: StepKey;
  done: boolean;
  tone?: "danger" | "muted";
}

// Linha do tempo do pedido. Pedido gratuito de evento cancelado fica
// CANCELLED, mas chegou a ser confirmado e ter ingressos: a linha mostra
// isso, em vez de parecer um pedido que nunca saiu do lugar.
export function orderSteps(order: { status: OrderStatus; totalAmount: number; tickets?: unknown[] | null }): OrderStep[] {
  const created: OrderStep = { key: "created", done: true };
  const free = order.totalAmount === 0;
  const confirmed: OrderStep = { key: free ? "confirmed" : "approved", done: true };
  switch (order.status) {
    case "PENDING":
      return [created, { key: "awaitingPayment", done: false }, { key: "issued", done: false }];
    case "PAID":
      return [created, confirmed, { key: "issued", done: true }];
    case "REFUNDED":
      return [created, confirmed, { key: free ? "ticketsCancelled" : "refunded", done: true, tone: "muted" }];
    case "CANCELLED":
      if (free && (order.tickets ?? []).length > 0) return [created, confirmed, { key: "ticketsCancelled", done: true, tone: "muted" }];
      return [created, { key: "cancelled", done: true, tone: "danger" }];
    default:
      return [created, { key: "expired", done: true, tone: "danger" }];
  }
}
