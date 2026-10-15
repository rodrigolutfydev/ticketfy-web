import type { EventCancellationPreview, EventCancellationResult } from "../api/types";

export type PreviewLine = "refund" | "free" | "pending" | "manual" | "used";
export type ResultLine = "refunded" | "cancelledFree" | "cancelled" | "used";

// Linhas da confirmação de cancelamento, na ordem da tela, sem as que dão zero.
export function previewLines(preview: EventCancellationPreview): { key: PreviewLine; count: number }[] {
  const lines: { key: PreviewLine; count: number }[] = [
    { key: "refund", count: preview.ordersToRefund },
    { key: "free", count: preview.freeOrdersToCancel },
    { key: "pending", count: preview.pendingOrdersToCancel },
    { key: "manual", count: preview.ordersRequiringManualAction },
    { key: "used", count: preview.usedTickets },
  ];
  return lines.filter((line) => line.count > 0);
}

// Resumo do que o cancelamento fez. Reembolsos que falharam (pendingOrders)
// e pedidos com ação manual (requiresManualAction) aparecem em avisos à parte.
export function resultLines(result: EventCancellationResult): { key: ResultLine; count: number }[] {
  const lines: { key: ResultLine; count: number }[] = [
    { key: "refunded", count: result.refundedOrders },
    { key: "cancelledFree", count: result.cancelledFreeOrders ?? 0 },
    { key: "cancelled", count: result.cancelledOrders },
    { key: "used", count: result.usedTickets ?? 0 },
  ];
  return lines.filter((line) => line.count > 0);
}
