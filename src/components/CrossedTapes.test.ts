import { describe, expect, it } from "vitest";
import { tapeItems } from "./CrossedTapes";

describe("tapeItems", () => {
  it("deixa os nomes em maiúsculas, sem repetidos nem vazios", () => {
    expect(tapeItems(["Arena Horizonte", "arena horizonte", "  ", "Casa Aurora"], 2)).toEqual(["ARENA HORIZONTE", "CASA AURORA"]);
  });

  it("repete a lista até a faixa ficar comprida o bastante", () => {
    const items = tapeItems(["Galpão Norte", "Armazém do Cais"], 5);
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.slice(0, 4)).toEqual(["GALPÃO NORTE", "ARMAZÉM DO CAIS", "GALPÃO NORTE", "ARMAZÉM DO CAIS"]);
  });

  it("sem nomes, a faixa fica vazia (não inventa locais)", () => {
    expect(tapeItems([])).toEqual([]);
    expect(tapeItems(["", " "])).toEqual([]);
  });
});
