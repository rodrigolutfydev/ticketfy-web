// A seleção de ingressos viaja na URL do checkout:
//   /checkout?event=ID&items=LOTE:2,LOTE:1
// Assim ela sobrevive ao login e ao cadastro (o endereço completo volta depois).
//
// Como a URL pode ser editada por qualquer pessoa, a leitura (decodeItems)
// desconfia de tudo: ignora IDs estranhos, quantidades inválidas e listas
// grandes demais. A API confere de novo estoque e limite por pedido.

import { isValidId } from "./security";

export type CartItem = { ticketTypeId: string; quantity: number };

const MAX_LINES = 10; // nenhum evento real tem mais de 10 lotes num pedido
const MAX_QUANTITY = 20; // teto por lote; o limite real vem do maxPerOrder da API
const ITEM_PATTERN = /^([^:]+):(\d{1,3})$/;

export function encodeItems(items: CartItem[]) {
  return items.map((i) => `${i.ticketTypeId}:${i.quantity}`).join(",");
}

export function decodeItems(value: string | null): CartItem[] {
  if (!value) return [];
  const seen = new Set<string>();
  return value
    .split(",")
    .slice(0, MAX_LINES)
    .map((pair) => {
      const match = ITEM_PATTERN.exec(pair);
      return match ? { ticketTypeId: match[1], quantity: Number(match[2]) } : { ticketTypeId: "", quantity: 0 };
    })
    .filter((item) => {
      const ok =
        isValidId(item.ticketTypeId) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= MAX_QUANTITY &&
        !seen.has(item.ticketTypeId); // o mesmo lote duas vezes na URL não soma
      if (ok) seen.add(item.ticketTypeId);
      return ok;
    });
}
