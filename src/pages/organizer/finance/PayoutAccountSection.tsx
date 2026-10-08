import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Landmark, Pencil } from "lucide-react";
import { ApiError, fieldError, hasUnmappedError } from "../../../api/client";
import { savePayoutAccount } from "../../../api/endpoints";
import type { DocumentType, PayoutAccount, PixKeyType } from "../../../api/types";
import { Alert, Button, Card, Field, Input, PasswordInput, Select } from "../../../components/ui";
import { DOCUMENT_LABELS, PIX_KEY_LABELS, PIX_KEY_PLACEHOLDERS, formatDateTime } from "./payoutMeta";

const FIELDS = ["documentType", "document", "holderName", "pixKeyType", "pixKey", "password"] as const;

export default function PayoutAccountSection({ account }: { account: PayoutAccount | null }) {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Landmark size={18} aria-hidden /> Dados de recebimento
          </h2>
          <p className="mt-1 text-sm text-muted">Os saques são enviados por Pix para a chave cadastrada aqui.</p>
        </div>
        {account && !editing && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={15} aria-hidden /> Editar
          </Button>
        )}
      </div>

      {account && !editing && (
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <Item label="Titular" value={account.holderName} />
          <Item label={DOCUMENT_LABELS[account.documentType]} value={account.document} />
          <Item label="Tipo de chave" value={PIX_KEY_LABELS[account.pixKeyType]} />
          <Item label="Chave Pix" value={account.pixKey} />
          {account.payoutsBlockedUntil && (
            <div className="sm:col-span-2">
              <Alert type="warning">Saques bloqueados até {formatDateTime(account.payoutsBlockedUntil)} por causa da troca da chave Pix.</Alert>
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
  const [documentType, setDocumentType] = useState<DocumentType>(account?.documentType ?? "CPF");
  const [document, setDocument] = useState("");
  const [holderName, setHolderName] = useState(account?.holderName ?? "");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(account?.pixKeyType ?? "CPF");
  const [pixKey, setPixKey] = useState("");
  const [password, setPassword] = useState("");

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

  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Tipo de documento" error={fieldError(error, "documentType")}>
        <Select value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType)}>
          <option value="CPF">CPF</option>
          <option value="CNPJ">CNPJ</option>
        </Select>
      </Field>
      <Field label={`${DOCUMENT_LABELS[documentType]} do titular`} error={fieldError(error, "document")}>
        <Input
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          placeholder={PIX_KEY_PLACEHOLDERS[documentType]}
          autoComplete="off"
          maxLength={25}
          required
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Nome do titular" error={fieldError(error, "holderName")}>
          <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} maxLength={150} required />
        </Field>
      </div>
      <Field label="Tipo de chave Pix" error={fieldError(error, "pixKeyType")}>
        <Select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}>
          {(Object.keys(PIX_KEY_LABELS) as PixKeyType[]).map((type) => (
            <option key={type} value={type}>
              {PIX_KEY_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Chave Pix" error={fieldError(error, "pixKey")}>
        <Input
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder={PIX_KEY_PLACEHOLDERS[pixKeyType]}
          autoComplete="off"
          maxLength={100}
          required
        />
      </Field>
      <div className="sm:col-span-2">
        <Field
          label="Confirme sua senha"
          error={wrongPassword ? "Senha incorreta." : fieldError(error, "password")}
          hint={account ? "Trocar a chave Pix bloqueia os saques por 48 horas." : undefined}
        >
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={100} required />
        </Field>
      </div>
      {error && !wrongPassword && hasUnmappedError(error, FIELDS) && (
        <div className="sm:col-span-2">
          <Alert>{error.message}</Alert>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={mutation.isPending}>
          Salvar dados
        </Button>
      </div>
    </form>
  );
}
