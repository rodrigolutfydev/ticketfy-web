import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, errorMessage, fieldError } from "../api/client";
import { transferTicket } from "../api/endpoints";
import type { TicketDetails } from "../api/types";
import { useI18n } from "../i18n/LocaleContext";
import { Alert, Button, Field, Input, PasswordInput } from "./ui";

interface Props {
  ticket: TicketDetails;
  onClose: () => void;
  onTransferred: (recipientEmail: string) => void;
}

const STALE_TICKET = new Set(["invalid-ticket-state", "invalid-event-state", "ticket-not-found", "ticket-transfer-closed", "ticket-transfer-limit-reached"]);

interface TransferErrors {
  email?: string | null;
  password?: string | null;
  general?: string | null;
}

function describe(error: unknown): TransferErrors {
  if (!(error instanceof ApiError)) return { general: errorMessage(error) };
  const message = errorMessage(error, "transfer");
  switch (error.problemType) {
    case "invalid-password":
      return { password: message };
    case "self-transfer":
    case "transfer-recipient-unavailable":
      return { email: message };
    case "validation-failed":
      return {
        email: fieldError(error, "recipientEmail"),
        password: fieldError(error, "password"),
        general: error.fieldErrors.length === 0 ? message : null,
      };
    default:
      return { general: message };
  }
}

export default function TransferTicketDialog({ ticket, onClose, onTransferred }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const x = t.buyer.transfer;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);

  const mutation = useMutation({
    mutationFn: () => transferTicket(ticket.id, email.trim(), password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      onTransferred(email.trim());
    },
    onError: (error) => {
      setPassword("");
      if (error instanceof ApiError && error.problemType && STALE_TICKET.has(error.problemType)) {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }
    },
  });

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (understood) mutation.mutate();
  };

  const errors: TransferErrors = mutation.error ? describe(mutation.error) : {};

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && !mutation.isPending && ref.current?.close()}
      aria-labelledby="transfer-title"
      className="tf-panel m-auto w-[min(92vw,460px)] p-0 text-ink shadow-[inset_0_0_0_1px_var(--card-ring),0_30px_80px_rgb(0_0_0/0.6)]"
    >
      <form onSubmit={submit} className="space-y-4 p-6">
        <div>
          <h2 id="transfer-title" className="text-lg font-bold">
            {x.title}
          </h2>
          <p className="mt-1 text-sm text-muted">{x.subtitle(ticket.ticketTypeName, ticket.eventName)}</p>
        </div>
        <Field label={x.email} hint={x.emailHint} error={errors.email ?? undefined}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            maxLength={150}
            required
            autoFocus
          />
        </Field>
        <Field label={x.password} error={errors.password ?? undefined}>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={100} required />
        </Field>
        <label className="flex items-start gap-3 rounded-xl border border-accent-line bg-accent-soft p-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-current"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            required
          />
          <span>{x.understand}</span>
        </label>
        {errors.general && <Alert>{errors.general}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => ref.current?.close()} disabled={mutation.isPending}>
            {x.back}
          </Button>
          <Button type="submit" variant="danger" loading={mutation.isPending} disabled={!understood}>
            {x.submit}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
