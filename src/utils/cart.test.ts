import { describe, expect, it } from "vitest";
import { decodeItems, encodeItems, type CartItem } from "./cart";

const LOT_A = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const LOT_B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

describe("encodeItems", () => {
  it("monta lote:quantidade separados por vírgula", () => {
    expect(encodeItems([{ ticketTypeId: LOT_A, quantity: 2 }, { ticketTypeId: LOT_B, quantity: 1 }])).toBe(`${LOT_A}:2,${LOT_B}:1`);
  });

  it("lista vazia vira texto vazio", () => {
    expect(encodeItems([])).toBe("");
  });

  it("ida e volta pela URL do checkout preserva os itens", () => {
    const items: CartItem[] = [
      { ticketTypeId: LOT_A, quantity: 3 },
      { ticketTypeId: LOT_B, quantity: 20 },
    ];
    const params = new URLSearchParams({ event: "evento-1", items: encodeItems(items) });
    const url = new URL(`/checkout?${params}`, "https://ticketfy.test");
    expect(decodeItems(url.searchParams.get("items"))).toEqual(items);
  });
});

describe("decodeItems", () => {
  it("lê os itens válidos na ordem da URL", () => {
    expect(decodeItems(`${LOT_A}:2,${LOT_B}:5`)).toEqual([
      { ticketTypeId: LOT_A, quantity: 2 },
      { ticketTypeId: LOT_B, quantity: 5 },
    ]);
  });

  it("ausente ou vazio vira carrinho vazio", () => {
    expect(decodeItems(null)).toEqual([]);
    expect(decodeItems("")).toEqual([]);
    expect(decodeItems(",,,")).toEqual([]);
  });

  it("aceita os limites de quantidade 1 e 20 e recusa 0 e 21", () => {
    expect(decodeItems("a:1,b:20,c:0,d:21")).toEqual([
      { ticketTypeId: "a", quantity: 1 },
      { ticketTypeId: "b", quantity: 20 },
    ]);
  });

  it("recusa quantidades inválidas ou adulteradas", () => {
    const values = ["-1", "1.5", "2.0", "abc", "", " 2", "2 ", "+2", "1e1", "0x5", "NaN", "Infinity", "99999999999999999999", "２"];
    for (const quantity of values) {
      expect(decodeItems(`${LOT_A}:${quantity}`)).toEqual([]);
    }
  });

  it("recusa itens sem quantidade, sem lote ou com partes a mais", () => {
    for (const value of [LOT_A, `${LOT_A}:`, ":2", `${LOT_A}:2:3`, `${LOT_A}::2`, `${LOT_A};2`]) {
      expect(decodeItems(value)).toEqual([]);
    }
  });

  it("recusa IDs de lote com injeção de rota", () => {
    const ids = ["..", "../users/me", "..%2Fusers%2Fme", "a/b", "a?x=1", "a#b", "<script>", "a b", "a".repeat(65)];
    for (const id of ids) {
      expect(decodeItems(`${id}:1`)).toEqual([]);
    }
  });

  it("o mesmo lote repetido vale só a primeira vez e não soma", () => {
    expect(decodeItems(`${LOT_A}:2,${LOT_A}:5,${LOT_B}:1`)).toEqual([
      { ticketTypeId: LOT_A, quantity: 2 },
      { ticketTypeId: LOT_B, quantity: 1 },
    ]);
  });

  it("mantém os válidos e descarta só os itens ruins", () => {
    expect(decodeItems(`${LOT_A}:2,lixo,../x:1,${LOT_B}:0,b:3`)).toEqual([
      { ticketTypeId: LOT_A, quantity: 2 },
      { ticketTypeId: "b", quantity: 3 },
    ]);
  });

  it("lê no máximo 10 itens da URL", () => {
    const value = Array.from({ length: 15 }, (_, i) => `lote-${i}:1`).join(",");
    const items = decodeItems(value);
    expect(items).toHaveLength(10);
    expect(items.at(-1)).toEqual({ ticketTypeId: "lote-9", quantity: 1 });
  });

  it("itens inválidos também contam no limite de 10", () => {
    const value = [...Array.from({ length: 10 }, () => "lixo"), `${LOT_A}:1`].join(",");
    expect(decodeItems(value)).toEqual([]);
  });
});
