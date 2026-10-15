import { describe, expect, it } from "vitest";
import { MESSAGES } from "../i18n/messages";
import type { EventCancellationPreview, EventCancellationResult } from "../api/types";
import { previewLines, resultLines } from "./cancellation";

const preview: EventCancellationPreview = {
  eventId: "8c1d",
  ordersToRefund: 12,
  freeOrdersToCancel: 2,
  pendingOrdersToCancel: 3,
  ordersRequiringManualAction: 1,
  usedTickets: 4,
};

const result: EventCancellationResult = {
  eventId: "8c1d",
  cancelledAt: "2026-10-08T17:00:00Z",
  refundedOrders: 12,
  cancelledFreeOrders: 2,
  cancelledOrders: 3,
  pendingOrders: 0,
  requiresManualAction: 1,
  usedTickets: 4,
};

describe("cancellation preview", () => {
  it("lists each kind of order separately, in order", () => {
    expect(previewLines(preview)).toEqual([
      { key: "refund", count: 12 },
      { key: "free", count: 2 },
      { key: "pending", count: 3 },
      { key: "manual", count: 1 },
      { key: "used", count: 4 },
    ]);
  });

  it("omits the lines with zero", () => {
    expect(previewLines({ ...preview, ordersToRefund: 0, pendingOrdersToCancel: 0, usedTickets: 0 })).toEqual([
      { key: "free", count: 2 },
      { key: "manual", count: 1 },
    ]);
    expect(previewLines({ ...preview, ordersToRefund: 0, freeOrdersToCancel: 0, pendingOrdersToCancel: 0, ordersRequiringManualAction: 0, usedTickets: 0 })).toEqual([]);
  });

  it("writes every line with the right plural in both languages", () => {
    const pt = MESSAGES["pt-BR"].organizer.settings.preview;
    expect(pt.refund(1)).toBe("1 pedido pago será reembolsado");
    expect(pt.refund(12)).toBe("12 pedidos pagos serão reembolsados");
    expect(pt.free(2)).toBe("2 pedidos gratuitos serão cancelados, sem reembolso");
    expect(pt.pending(1)).toBe("1 pedido aguardando pagamento será cancelado");
    expect(pt.manual(1)).toBe("1 pedido pago com ingresso já usado vai precisar de reembolso manual");
    expect(pt.used(4)).toBe("4 ingressos já passaram pelo check-in e continuam como utilizados");
    const en = MESSAGES.en.organizer.settings.preview;
    expect(en.free(1)).toBe("1 free order will be cancelled, with nothing to refund");
    expect(en.used(1)).toBe("1 ticket has already been checked in and will stay marked as used");
  });
});

describe("cancellation result", () => {
  it("summarizes refunded, free, pending and used counts without zeros", () => {
    expect(resultLines(result)).toEqual([
      { key: "refunded", count: 12 },
      { key: "cancelledFree", count: 2 },
      { key: "cancelled", count: 3 },
      { key: "used", count: 4 },
    ]);
    expect(resultLines({ ...result, refundedOrders: 0, cancelledOrders: 0, usedTickets: 0 })).toEqual([{ key: "cancelledFree", count: 2 }]);
  });

  it("writes the summary lines in both languages", () => {
    const pt = MESSAGES["pt-BR"].organizer.settings.result;
    expect(pt.cancelledFree(1)).toBe("1 pedido gratuito cancelado");
    expect(pt.refunded(12)).toBe("12 pedidos reembolsados");
    expect(MESSAGES.en.organizer.settings.result.used(2)).toBe("2 used tickets kept as used");
  });
});
