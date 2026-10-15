import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, errorMessage, fieldError, hasUnmappedError } from "../../../api/client";
import { useI18n } from "../../../i18n/LocaleContext";
import { requestPayout } from "../../../api/endpoints";
import type { Balance, PayoutAccount } from "../../../api/types";
import { useMe } from "../../../auth/useMe";
import PasswordRequiredNotice from "../../../components/PasswordRequiredNotice";
import { Alert, Button, Field, Form, Input, PasswordInput } from "../../../components/ui";
import { needsPasswordSetup } from "../../../utils/account";
import { formatPrice } from "../../../utils/format";
import { newIdempotencyKey } from "../../../utils/idempotency";

interface Props {
  open: boolean;
  balance: Balance;
  account: PayoutAccount;
  onClose: () => void;
}

export default function PayoutDialog({ open, balance, account, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const d = t.organizer.payoutDialog;
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);
  const { me } = useMe();

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
  const noPassword = needsPasswordSetup(me, error);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && !mutation.isPending && onClose()}
      aria-labelledby="payout-title"
      className="tf-panel m-auto w-[min(92vw,460px)] p-0 text-ink shadow-[inset_0_0_0_1px_var(--card-ring),0_30px_80px_rgb(0_0_0/0.6)]"
    >
      <Form onSubmit={submit} className="space-y-4 p-6">
        <div>
          <h2 id="payout-title" className="text-lg font-bold">
            {d.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {d.available} <span className="tabular font-semibold text-ink">{formatPrice(balance.available, locale)}</span>.{" "}
            {d.destination(t.labels.pixKeyTypes[account.pixKeyType])} <span className="tabular">{account.pixKey}</span>.
          </p>
        </div>
        <Field label={d.amount} hint={d.minimum(formatPrice(balance.minPayoutAmount, locale))} error={fieldError(error, "amount")}>
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
        {noPassword ? (
          <PasswordRequiredNotice />
        ) : (
          <Field label={d.password} error={wrongPassword ? d.wrongPassword : fieldError(error, "password")}>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={100} required />
          </Field>
        )}
        {error && !wrongPassword && !noPassword && hasUnmappedError(error, ["amount", "password"]) && <Alert>{errorMessage(error)}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            {d.back}
          </Button>
          <Button type="submit" loading={mutation.isPending} disabled={noPassword}>
            {d.submit}
          </Button>
        </div>
      </Form>
    </dialog>
  );
}
