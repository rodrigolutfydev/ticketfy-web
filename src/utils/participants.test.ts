import { describe, expect, it } from "vitest";
import type { TicketTypeDetails } from "../api/types";
import { lotToggleCopy, maskedCode, participantsQuery } from "./participants";

const lot = (id: string, active: boolean): TicketTypeDetails => ({
  id,
  name: `Lote ${id}`,
  description: null,
  price: 50,
  quantityTotal: 100,
  quantitySold: 0,
  available: 100,
  maxPerOrder: null,
  active,
  maxPerBuyer: null,
});

describe("participantsQuery", () => {
  it("returns an empty string without filters", () => {
    expect(participantsQuery({})).toBe("");
    expect(participantsQuery({ q: "   ", page: 0 })).toBe("");
  });

  it("sends only the filters in use, with the search trimmed", () => {
    expect(participantsQuery({ ticketTypeId: "abc", status: "USED", q: "  Ana ", page: 2, size: 20 })).toBe(
      "?ticketTypeId=abc&status=USED&q=Ana&page=2&size=20",
    );
  });

  it("encodes the search text", () => {
    expect(participantsQuery({ q: "Dani_100% & cia" })).toBe("?q=Dani_100%25+%26+cia");
  });

  it("limits the search to 100 characters", () => {
    expect(participantsQuery({ q: "a".repeat(150) })).toBe(`?q=${"a".repeat(100)}`);
  });
});

describe("maskedCode", () => {
  it("shows only the suffix", () => {
    expect(maskedCode("AB12")).toBe("••••AB12");
  });
});

describe("lotToggleCopy", () => {
  it("warns when deactivating the last active lot", () => {
    const only = lot("1", true);
    const copy = lotToggleCopy(only, [only, lot("2", false)]);
    expect(copy.confirmLabel).toBe("Desativar");
    expect(copy.description).toMatch(/último lote à venda/);
  });

  it("does not warn when other lots stay on sale", () => {
    const first = lot("1", true);
    expect(lotToggleCopy(first, [first, lot("2", true)]).description).not.toMatch(/último lote/);
  });

  it("explains the reactivation", () => {
    const inactive = lot("1", false);
    const copy = lotToggleCopy(inactive, [inactive]);
    expect(copy.confirmLabel).toBe("Reativar");
    expect(copy.title).toMatch(/Reativar/);
  });

  it("writes the copy in English", () => {
    const only = lot("1", true);
    const copy = lotToggleCopy(only, [only], "en");
    expect(copy.confirmLabel).toBe("Deactivate");
    expect(copy.description).toMatch(/last batch on sale/);
  });
});
