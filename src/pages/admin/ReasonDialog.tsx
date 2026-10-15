import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Field, Textarea } from "../../components/ui";
import { useI18n } from "../../i18n/LocaleContext";

interface Props {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  loading: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export default function ReasonDialog({ open, title, description, confirmLabel, loading, error, onConfirm, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (reason.trim()) onConfirm(reason.trim());
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && !loading && onClose()}
      aria-labelledby="reason-title"
      className="tf-panel m-auto w-[min(92vw,480px)] p-0 text-ink shadow-[inset_0_0_0_1px_var(--card-ring),0_30px_80px_rgb(0_0_0/0.6)]"
    >
      <form onSubmit={submit} className="space-y-4 p-6">
        <div>
          <h2 id="reason-title" className="text-lg font-bold">
            {title}
          </h2>
          <div className="mt-1 text-sm text-muted">{description}</div>
        </div>
        <Field label={t.admin.reason.label} hint={t.admin.reason.hint}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} required autoFocus />
        </Field>
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t.admin.reason.back}
          </Button>
          <Button type="submit" variant="danger" loading={loading} disabled={!reason.trim()}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
