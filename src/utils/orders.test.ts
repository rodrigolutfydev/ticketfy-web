import { describe, expect, it } from "vitest";
import { MESSAGES } from "../i18n/messages";
import type { OrderTicket } from "../api/types";
import { formatDate } from "./format";
import { cancelledEventNote, orderEvent, orderSteps } from "./orders";

const ticket = (status: OrderTicket["status"]): OrderTicket => ({ id: status, ticketTypeName: "Pista", status, code: "ABCD1234EFGH5678", transferred: false });

describe("event of an order", () => {
  it("uses eventId, eventName and eventStartsAt", () => {
    expect(orderEvent({ eventId: "8c1d", eventName: "Festival de Inverno", eventStartsAt: "2026-11-20T22:00:00Z" })).toEqual({
      id: "8c1d",
      name: "Festival de Inverno",
      startsAt: "2026-11-20T22:00:00Z",
    });
  });

  it("shows nothing when the API does not send the event", () => {
    expect(orderEvent({})).toBeNull();
    expect(orderEvent({ eventId: "8c1d" })).toBeNull();
    expect(orderEvent({ eventId: "8c1d", eventName: "Festival" })).toEqual({ id: "8c1d", name: "Festival", startsAt: null });
  });

  it("formats the event start with date and time in the user's language", () => {
    expect(formatDate("2026-11-20T22:00:00Z", "pt-BR")).toMatch(/20 de nov\. de 2026.*\d{2}:\d{2}/);
    expect(formatDate("2026-11-20T22:00:00Z", "en")).toMatch(/Nov 20, 2026.*\d{1,2}:\d{2}/);
  });
});

describe("free order of a cancelled event", () => {
  const order = { status: "CANCELLED" as const, totalAmount: 0, eventCancelled: true, tickets: [ticket("CANCELLED"), ticket("USED")] };

  it("explains that there is nothing to refund", () => {
    expect(cancelledEventNote(order)).toBe("freeCancelled");
    expect(MESSAGES["pt-BR"].buyer.orderDetail.eventCancelledNotes.freeCancelled).toMatch(/gratuito.*não há valor a devolver/);
    expect(MESSAGES.en.buyer.orderDetail.eventCancelledNotes.freeCancelled).toMatch(/free.*nothing to refund/);
  });

  it("shows the Cancelled badge in both languages", () => {
    expect(MESSAGES["pt-BR"].labels.orderStatus.CANCELLED).toBe("Cancelado");
    expect(MESSAGES.en.labels.orderStatus.CANCELLED).toBe("Cancelled");
  });

  it("keeps the confirmation in the timeline and ends with the tickets cancelled", () => {
    expect(orderSteps(order)).toEqual([
      { key: "created", done: true },
      { key: "confirmed", done: true },
      { key: "ticketsCancelled", done: true, tone: "muted" },
    ]);
  });

  it("still treats a cancelled pending order as never confirmed", () => {
    const pending = { status: "CANCELLED" as const, totalAmount: 80, eventCancelled: true, tickets: [] };
    expect(cancelledEventNote(pending)).toBe("cancelled");
    expect(orderSteps(pending)).toEqual([{ key: "created", done: true }, { key: "cancelled", done: true, tone: "danger" }]);
  });
});

describe("note for other orders of a cancelled event", () => {
  it("matches what the API did with each order", () => {
    expect(cancelledEventNote({ status: "REFUNDED", totalAmount: 80, eventCancelled: true, tickets: [ticket("CANCELLED")] })).toBe("refunded");
    expect(cancelledEventNote({ status: "PAID", totalAmount: 80, eventCancelled: true, tickets: [ticket("USED")] })).toBe("manualRefund");
    expect(cancelledEventNote({ status: "PAID", totalAmount: 80, eventCancelled: true, tickets: [ticket("VALID")] })).toBe("refundProcessing");
    expect(cancelledEventNote({ status: "PAID", totalAmount: 80, eventCancelled: false, tickets: [] })).toBeNull();
  });
});
