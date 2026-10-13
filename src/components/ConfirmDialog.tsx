// Janela de confirmação para ações que não têm volta (cancelar pedido,
// excluir evento, pedir reembolso). Substitui o window.confirm, que não
// segue o visual do site e não deixa explicar a consequência da ação.
//
// Usa o elemento nativo <dialog> com showModal(): o próprio navegador
// prende o foco dentro da janela, fecha com Esc e escurece o fundo.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/LocaleContext";
import { Button } from "./ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open, title, description, confirmLabel, cancelLabel, danger = false, loading = false, onConfirm, onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();

  // Sincroniza a prop "open" com o estado real do <dialog>.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clique no fundo escuro (fora da caixa) também fecha.
      onClick={(e) => e.target === ref.current && !loading && onClose()}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,440px)] elevated rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-lg font-bold">
          {title}
        </h2>
        <div className="mt-2 text-sm text-muted">{description}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading} autoFocus>
            {cancelLabel ?? t.ui.confirmBack}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

// Atalho: um botão que abre a confirmação antes de executar a ação.
export function ConfirmButton({
  children, onConfirm, loading, variant = "danger", ...dialog
}: Omit<ConfirmDialogProps, "open" | "onClose" | "onConfirm"> & {
  children: ReactNode;
  onConfirm: () => void;
  variant?: "danger" | "secondary" | "primary";
}) {
  const [open, setOpen] = useState(false);
  // Fecha a janela quando a ação termina (loading volta a false).
  useEffect(() => {
    if (!loading) setOpen(false);
  }, [loading]);

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} loading={loading}>
        {children}
      </Button>
      <ConfirmDialog {...dialog} open={open} loading={loading} onClose={() => setOpen(false)} onConfirm={onConfirm} />
    </>
  );
}
