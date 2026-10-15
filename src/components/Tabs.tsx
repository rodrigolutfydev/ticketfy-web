// Abas acessíveis, seguindo o padrão WAI-ARIA "tabs":
// - role="tablist" / "tab" / "tabpanel" para o leitor de tela entender a estrutura;
// - setas ← → (e Home/End) trocam de aba pelo teclado;
// - só a aba ativa entra na ordem do Tab (as outras têm tabIndex -1).
//
// A aba ativa pode ficar na URL (?tab=...) com o hook useTabParam: assim
// recarregar a página ou compartilhar o link mantém a aba aberta.

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router";

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon?: ReactNode;
  // Número opcional ao lado do nome (ex.: quantidade de itens).
  count?: number;
}

interface TabsProps<K extends string> {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  // Nome do grupo de abas, lido pelo leitor de tela.
  label: string;
  // Prefixo único para os ids que ligam cada aba ao seu painel.
  idPrefix: string;
}

export function Tabs<K extends string>({ items, value, onChange, label, idPrefix }: TabsProps<K>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: KeyboardEvent, index: number) {
    const last = items.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(items[next].key);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-7 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-ink/[0.04] p-[5px] shadow-[inset_0_0_0_1px_var(--card-ring)] [scrollbar-width:none]"
    >
      {items.map((item, index) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.key}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-[18px] py-[9px] text-[0.9375rem] transition-colors ${
              selected
                ? "bg-accent/[0.18] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--accent-line)]"
                : "font-medium text-muted hover:bg-ink/[0.06] hover:text-ink"
            }`}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span
                className={`tabular rounded-full px-2 py-0.5 text-xs font-semibold ${selected ? "bg-accent text-accent-ink" : "bg-ink/[0.08] text-muted"}`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idPrefix, activeKey, children }: { idPrefix: string; activeKey: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${activeKey}`} tabIndex={0} className="outline-none">
      {children}
    </div>
  );
}

// Guarda a aba ativa no parâmetro ?tab= da URL.
// Só aceita valores da lista: ?tab=<qualquer coisa> cai na aba padrão.
export function useTabParam<K extends string>(keys: readonly K[], fallback: K) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const value = (keys as readonly string[]).includes(raw ?? "") ? (raw as K) : fallback;

  function setValue(key: K) {
    const next = new URLSearchParams(searchParams);
    if (key === fallback) next.delete("tab");
    else next.set("tab", key);
    next.delete("page"); // trocar de aba volta para a primeira página
    // replace: trocar de aba não empilha entradas no "voltar" do navegador.
    setSearchParams(next, { replace: true });
  }

  return [value, setValue] as const;
}
