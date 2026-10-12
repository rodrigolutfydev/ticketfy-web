import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { couponErrorMessage } from "./coupon";
import { SALES_CLOSED_MESSAGE, isSalesClosedError, orderErrorMessage, salesPanel } from "./sales";

const problem = (status: number, type: string, message = "x") => new ApiError(status, message, [], null, type);

describe("salesPanel", () => {
  it("keeps sales open when the API does not close them", () => {
    expect(salesPanel({ cancelledAt: null, salesClosed: false })).toBe("open");
  });

  it("closes sales when the API says so", () => {
    expect(salesPanel({ cancelledAt: null, salesClosed: true })).toBe("closed");
  });

  it("shows the cancellation before the closed sales", () => {
    expect(salesPanel({ cancelledAt: "2026-10-08T20:00:00Z", salesClosed: true })).toBe("cancelled");
  });
});

describe("sales-closed errors", () => {
  it("recognizes the problem type", () => {
    expect(isSalesClosedError(problem(409, "sales-closed"))).toBe(true);
    expect(isSalesClosedError(problem(409, "insufficient-stock"))).toBe(false);
    expect(isSalesClosedError(new Error("x"))).toBe(false);
  });

  it("translates the order error and keeps the others", () => {
    expect(orderErrorMessage(problem(409, "sales-closed", "Ticket sales for this event have ended"))).toBe(SALES_CLOSED_MESSAGE);
    expect(orderErrorMessage(problem(409, "insufficient-stock", "Not enough tickets"))).toBe("Not enough tickets");
    expect(orderErrorMessage(null)).toBeNull();
  });

  it("translates the coupon preview error", () => {
    expect(couponErrorMessage(problem(409, "sales-closed"))).toBe(SALES_CLOSED_MESSAGE);
  });
});
