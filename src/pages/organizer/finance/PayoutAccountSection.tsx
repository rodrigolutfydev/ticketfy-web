import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Landmark, Pencil } from "lucide-react";
import { ApiError, errorMessage, fieldError, hasUnmappedError } from "../../../api/client";
import { useI18n } from "../../../i18n/LocaleContext";
import { savePayoutAccount } from "../../../api/endpoints";
import type { DocumentType, PayoutAccount, PixKeyType } from "../../../api/types";
import { useMe } from "../../../auth/useMe";
import PasswordRequiredNotice from "../../../components/PasswordRequiredNotice";
import { Alert, Button, Card, Field, Form, Input, PasswordInput, Select } from "../../../components/ui";
import { needsPasswordSetup } from "../../../utils/account";
import { PIX_KEY_TYPES, formatDateTime, pixKeyPlaceholder } from "./payoutMeta";

const FIELDS = ["documentType", "document", "holderName", "pixKeyType", "pixKey", "password"] as const;

export default function PayoutAccountSection({ account }: { account: PayoutAccount | null }) {
  const [editing, setEditing] = useState(false);
  const { t, locale } = useI18n();
  const a = t.organizer.payoutAccount;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Landmark size={18} aria-hidden /> {a.title}
          </h2>
          <p className="mt-1 text-sm text-muted">{a.text}</p>
        </div>
        {account && !editing && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={15} aria-hidden /> {a.edit}
          </Button>
        )}
      </div>

      {account && !editing && (
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <Item label={a.holder} value={account.holderName} />
          <Item label={t.labels.documentTypes[account.documentType]} value={account.document} />
          <Item label={a.keyType} value={t.labels.pixKeyTypes[account.pixKeyType]} />
          <Item label={a.pixKey} value={account.pixKey} />
          {account.payoutsBlockedUntil && (
            <div className="sm:col-span-2">
              <Alert type="warning">{a.cooldown(formatDateTime(account.payoutsBlockedUntil, locale))}</Alert>
            </div>
          )}
        </dl>
      )}

      {(!account || editing) && (
        <AccountForm account={account} onDone={() => setEditing(false)} onCancel={account ? () => setEditing(false) : undefined} />
      )}
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="tabular mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}

function AccountForm({ account, onDone, onCancel }: { account: PayoutAccount | null; onDone: () => void; onCancel?: () => void }) {
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const a = t.organizer.payoutAccount;
  const [documentType, setDocumentType] = useState<DocumentType>(account?.documentType ?? "CPF");
  const [document, setDocument] = useState("");
  const [holderName, setHolderName] = useState(account?.holderName ?? "");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(account?.pixKeyType ?? "CPF");
  const [pixKey, setPixKey] = useState("");
  const [password, setPassword] = useState("");
  const { me } = useMe();

  const mutation = useMutation({
    mutationFn: () => savePayoutAccount({ documentType, document, holderName, pixKeyType, pixKey, password }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["payout-account"], saved);
      setPassword("");
      onDone();
    },
    onError: () => setPassword(""),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const error = mutation.error;
  const wrongPassword = error instanceof ApiError && error.problemType === "invalid-password";
  const noPassword = needsPasswordSetup(me, error);

  return (
    <Form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label={a.documentType} error={fieldError(error, "documentType")}>
        <Select value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType)}>
          <option value="CPF">{t.labels.documentTypes.CPF}</option>
          <option value="CNPJ">{t.labels.documentTypes.CNPJ}</option>
        </Select>
      </Field>
      <Field label={a.holderDocument(t.labels.documentTypes[documentType])} error={fieldError(error, "document")}>
        <Input
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          placeholder={pixKeyPlaceholder(documentType, locale)}
          autoComplete="off"
          maxLength={25}
          required
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label={a.holderName} error={fieldError(error, "holderName")}>
          <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} maxLength={150} required />
        </Field>
      </div>
      <Field label={a.pixKeyType} error={fieldError(error, "pixKeyType")}>
        <Select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}>
          {PIX_KEY_TYPES.map((type) => (
            <option key={type} value={type}>
              {t.labels.pixKeyTypes[type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={a.pixKey} error={fieldError(error, "pixKey")}>
        <Input
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder={pixKeyPlaceholder(pixKeyType, locale)}
          autoComplete="off"
          maxLength={100}
          required
        />
      </Field>
      <div className="sm:col-span-2">
        {noPassword ? (
          <PasswordRequiredNotice />
        ) : (
          <Field
            label={a.password}
            error={wrongPassword ? a.wrongPassword : fieldError(error, "password")}
            hint={account ? a.keyChangeHint : undefined}
          >
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={100} required />
          </Field>
        )}
      </div>
      {error && !wrongPassword && !noPassword && hasUnmappedError(error, FIELDS) && (
        <div className="sm:col-span-2">
          <Alert>{errorMessage(error)}</Alert>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
            {a.cancel}
          </Button>
        )}
        <Button type="submit" loading={mutation.isPending} disabled={noPassword}>
          {a.save}
        </Button>
      </div>
    </Form>
  );
}
