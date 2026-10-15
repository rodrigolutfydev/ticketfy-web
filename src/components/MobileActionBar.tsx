import type { ReactNode } from "react";

// Barra presa no rodapé do celular com o total e a ação principal da compra.
// No computador o resumo lateral já mostra os dois, então ela some (lg:hidden).
export default function MobileActionBar({ label, total, message, children }: { label: string; total: string; message?: ReactNode; children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
      {message && <div className="mb-2 text-sm text-danger" role="alert">{message}</div>}
      <div className="flex items-center gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="tabular truncate font-display text-xl font-extrabold tracking-[-0.03em] text-ink">{total}</p>
        </div>
        <div className="ml-auto flex shrink-0">{children}</div>
      </div>
    </div>
  );
}
