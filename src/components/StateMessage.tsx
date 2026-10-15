// Estados que toda tela tem: carregando, erro e vazio.
// Ter um componente para cada um deixa o visual igual em todo lugar.

import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { useI18n } from "../i18n/LocaleContext";

export function Loading({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
      {text ?? t.common.loading}
    </div>
  );
}

export function ErrorMessage({ message, action }: { message: string; action?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex gap-3 rounded-[18px] bg-danger/10 px-5 py-4 text-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--danger)_40%,transparent)]">
      <TriangleAlert size={20} className="mt-0.5 shrink-0 text-danger" aria-hidden />
      <div>
        <p className="font-semibold">{t.common.loadErrorTitle}</p>
        <p className="text-sm text-muted">{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function Empty({ title, hint, icon, children }: { title: string; hint?: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-3xl border-2 border-dashed border-line px-6 py-14 text-center">
      {icon && <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-accent-soft text-accent-text">{icon}</div>}
      <p className="font-display text-xl font-bold tracking-[-0.03em] text-ink">{title}</p>
      {hint && <p className="max-w-md text-muted">{hint}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
