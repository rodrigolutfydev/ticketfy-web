// Estados que toda tela tem: carregando, erro e vazio.
// Ter um componente para cada um deixa o visual igual em todo lugar.

import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

export function Loading({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
      {text}
    </div>
  );
}

export function ErrorMessage({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-danger/35 bg-danger/10 px-5 py-4 text-danger">
      <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">Não deu para carregar</p>
        <p className="text-sm opacity-90">{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function Empty({ title, hint, icon, children }: { title: string; hint?: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-5 py-16 text-center">
      {icon && <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-raised text-accent-text">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{hint}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
