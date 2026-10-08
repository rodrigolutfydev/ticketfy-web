import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, fieldError, hasUnmappedError } from "../../../api/client";
import { requestPayout } from "../../../api/endpoints";
import type { Balance, PayoutAccount } from "../../../api/types";
import { Alert, Button, Field, Input, PasswordInput } from "../../../components/ui";
import { formatPrice } from "../../../utils/format";
import { newIdempotencyKey } from "../../../utils/idempotency";
import { PIX_KEY_LABELS } from "./payoutMeta";

interface Props {
  open: boolean;
  balance: Balance;
  account: PayoutAccount;
  onClose: () => void;
}

export default function PayoutDialog({ open, balance, account, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);

  const mutation = useMutation({
    mutationFn: () => requestPayout(Number(amount), password, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-balance"] });
      queryClient.invalidateQueries({ queryKey: ["organizer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["organizer-payouts"] });
      onClose();
    },
    onError: () => setPassword(""),
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const error = mutation.error;
  const wrongPassword = error instanceof ApiError && error.problemType === "invalid-password";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && !mutation.isPending && onClose()}
      aria-labelledby="payout-title"
      className="m-auto w-[min(92vw,460px)] elevated rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      <form onSubmit={submit} className="space-y-4 p-6">
        <div>
          <h2 id="payout-title" className="text-lg font-bold">
            Sacar saldo
          </h2>
          <p className="mt-1 text-sm text-muted">
            Disponível: <span className="tabular font-semibold text-ink">{formatPrice(balance.available)}</span>. O valor vai por Pix para a
            chave {PIX_KEY_LABELS[account.pixKeyType]} <span className="tabular">{account.pixKey}</span>.
          </p>
        </div>
        <Field label="Valor" hint={`Mínimo de ${formatPrice(balance.minPayoutAmount)}`} error={fieldError(error, "amount")}>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={balance.minPayoutAmount}
            max={balance.available}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Confirme sua senha" error={wrongPassword ? "Senha incorreta." : fieldError(error, "password")}>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={100} required />
        </Field>
        {error && !wrongPassword && hasUnmappedError(error, ["amount", "password"]) && <Alert>{error.message}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Voltar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Solicitar saque
          </Button>
        </div>
      </form>
    </dialog>
  );
}
