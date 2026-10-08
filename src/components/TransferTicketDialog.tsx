import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, fieldError } from "../api/client";
import { transferTicket } from "../api/endpoints";
import type { TicketDetails } from "../api/types";
import { Alert, Button, Field, Input, PasswordInput } from "./ui";

interface Props {
  ticket: TicketDetails;
  onClose: () => void;
  onTransferred: (recipientEmail: string) => void;
}

const STALE_TICKET = new Set(["invalid-ticket-state", "invalid-event-state", "ticket-not-found", "ticket-transfer-closed", "ticket-transfer-limit-reached"]);

function minutes(seconds: number | null) {
  return Math.max(1, Math.ceil((seconds ?? 60) / 60));
}

interface TransferErrors {
  email?: string | null;
  password?: string | null;
  general?: string | null;
}

function describe(error: unknown): TransferErrors {
  if (!(error instanceof ApiError)) return { general: error instanceof Error ? error.message : null };
  switch (error.problemType) {
    case "invalid-password":
      return { password: "Senha incorreta." };
    case "self-transfer":
      return { email: "Informe o e-mail de outra pessoa." };
    case "transfer-recipient-unavailable":
      return { email: "Não foi possível transferir para este e-mail. Confira se a pessoa já tem conta no Ticketfy." };
    case "too-many-password-attempts":
    case "too-many-transfer-attempts":
      return { general: `Muitas tentativas. Tente de novo em ${minutes(error.retryAfter)} min.` };
    case "ticket-transfer-closed":
      return { general: "O evento já começou. Este ingresso não pode mais ser transferido." };
    case "ticket-transfer-limit-reached":
      return { general: "Este ingresso já atingiu o limite de transferências." };
    case "invalid-ticket-state":
    case "invalid-event-state":
    case "ticket-not-found":
      return { general: "Este ingresso não pode mais ser transferido." };
    default:
      return {
        email: fieldError(error, "recipientEmail"),
        password: fieldError(error, "password"),
        general: error.fieldErrors.length === 0 ? error.message : null,
      };
  }
}

export default function TransferTicketDialog({ ticket, onClose, onTransferred }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
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
      className="m-auto w-[min(92vw,460px)] elevated rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      <form onSubmit={submit} className="space-y-4 p-6">
        <div>
          <h2 id="transfer-title" className="text-lg font-bold">
            Transferir ingresso
          </h2>
          <p className="mt-1 text-sm text-muted">
            {ticket.ticketTypeName} · {ticket.eventName}. O ingresso vai para a conta da pessoa e sai da sua.
          </p>
        </div>
        <Field label="E-mail do destinatário" hint="A pessoa precisa ter conta no Ticketfy." error={errors.email ?? undefined}>
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
        <Field label="Confirme sua senha" error={errors.password ?? undefined}>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={100} required />
        </Field>
        <label className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-current"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            required
          />
          <span>
            Entendo que o código atual deixará de valer na hora e que o destinatário receberá um código novo. Se eu comprei este ingresso,
            o pedido não poderá mais ser reembolsado.
          </span>
        </label>
        {errors.general && <Alert>{errors.general}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => ref.current?.close()} disabled={mutation.isPending}>
            Voltar
          </Button>
          <Button type="submit" variant="danger" loading={mutation.isPending} disabled={!understood}>
            Transferir
          </Button>
        </div>
      </form>
    </dialog>
  );
}
