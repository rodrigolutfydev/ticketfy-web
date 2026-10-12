import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { couponErrorMessage } from "./coupon";
import { isSalesClosedError, salesPanel } from "./sales";

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

  it("uses the translated message in the coupon preview", () => {
    expect(couponErrorMessage(problem(409, "sales-closed", "As vendas deste evento foram encerradas."))).toBe(
      "As vendas deste evento foram encerradas.",
    );
  });
});
