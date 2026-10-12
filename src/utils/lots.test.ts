import { describe, expect, it } from "vitest";
import { maxPerBuyerChange, suggestedMaxPerBuyer } from "./lots";

describe("suggestedMaxPerBuyer", () => {
  it("suggests 2 when the lot becomes free and the field was not touched", () => {
    expect(suggestedMaxPerBuyer("0", "", false)).toBe("2");
    expect(suggestedMaxPerBuyer("0.00", "", false)).toBe("2");
  });

  it("removes the suggestion when the lot stops being free", () => {
    expect(suggestedMaxPerBuyer("50", "2", false)).toBe("");
  });

  it("never changes a value the organizer typed", () => {
    expect(suggestedMaxPerBuyer("0", "", true)).toBe("");
    expect(suggestedMaxPerBuyer("0", "5", true)).toBe("5");
    expect(suggestedMaxPerBuyer("50", "2", true)).toBe("2");
  });

  it("does not suggest anything before a price is typed", () => {
    expect(suggestedMaxPerBuyer("", "", false)).toBe("");
  });
});

describe("maxPerBuyerChange", () => {
  it("sends 0 to remove an existing limit", () => {
    expect(maxPerBuyerChange(3, "")).toBe(0);
  });

  it("sends nothing when there is no change", () => {
    expect(maxPerBuyerChange(null, "")).toBeUndefined();
    expect(maxPerBuyerChange(3, "3")).toBeUndefined();
  });

  it("sends the new limit", () => {
    expect(maxPerBuyerChange(null, "4")).toBe(4);
    expect(maxPerBuyerChange(3, "1")).toBe(1);
  });
});
