import type { ReactNode } from "react";
import { Wrench } from "lucide-react";

// Aviso quando uma tela depende de algo que a API ainda não oferece.
// Em vez de mostrar botões que dariam erro, a tela explica o que falta.
export default function BackendNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-warning/35 bg-warning/10 p-5 text-ink">
      <Wrench size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-1 space-y-1 text-sm text-muted">{children}</div>
      </div>
    </div>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs text-ink">{children}</code>;
}
