// Duas faixas cruzadas (uma clara, uma laranja) que deslizam em sentidos
// opostos conforme a página rola. São decorativas: o leitor de tela pula.
// A faixa clara mostra os locais reais dos eventos à venda; sem locais
// suficientes, mostra as categorias do catálogo.

import { useScrollShift } from "../hooks/motion";

// Repete a lista até a faixa ficar comprida o bastante para cruzar a tela.
export function tapeItems(items: string[], minimum = 18) {
  const clean = [...new Set(items.map((item) => item.trim().toLocaleUpperCase("pt-BR")).filter(Boolean))];
  if (clean.length === 0) return [];
  const out: string[] = [];
  while (out.length < minimum) out.push(...clean);
  return out;
}

export default function CrossedTapes({ paper, brand }: { paper: string[]; brand: string[] }) {
  const ref = useScrollShift<HTMLDivElement>(220);
  const paperItems = tapeItems(paper);
  const brandItems = tapeItems(brand, 14);
  return (
    <div ref={ref} className="tf-tapes" data-hero-slot aria-hidden>
      {paperItems.length > 0 && (
        <div className="tf-tape tf-tape-paper">
          {paperItems.map((item, i) => (
            <span key={i} className="flex items-center gap-7">
              {item}
              <span className="text-xs text-accent">●</span>
            </span>
          ))}
        </div>
      )}
      <div className="tf-tape tf-tape-brand">
        {brandItems.map((item, i) => (
          <span key={i} className="flex items-center gap-7">
            {item}
            <span>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
