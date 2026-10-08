import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { listAudit } from "../../api/endpoints";
import type { AuditEntry, AuditTargetType } from "../../api/types";
import Pagination from "../../components/Pagination";
import { Empty, ErrorMessage } from "../../components/StateMessage";
import { Button, Card, Field, Input, PageTitle, Select, Skeleton } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { formatDateTime } from "../organizer/finance/payoutMeta";
import { AUDIT_ACTION_LABELS, AUDIT_TARGET_LABELS, UUID_PATTERN } from "./adminMeta";

type Filters = { targetType?: AuditTargetType; targetId?: string; actorId?: string; from?: string; to?: string };

export default function AdminAuditPage() {
  usePageTitle("Auditoria");
  const [draft, setDraft] = useState({ targetType: "", targetId: "", actorId: "", from: "", to: "" });
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-audit", filters, page],
    queryFn: () => listAudit({ ...filters, page }),
    placeholderData: (previous) => previous,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const targetId = draft.targetId.trim();
    const actorId = draft.actorId.trim();
    if ((targetId && !UUID_PATTERN.test(targetId)) || (actorId && !UUID_PATTERN.test(actorId))) {
      setFormError("Os ids precisam estar no formato UUID.");
      return;
    }
    if (draft.from && draft.to && draft.from > draft.to) {
      setFormError("A data inicial não pode ser depois da final.");
      return;
    }
    setFormError(null);
    setPage(0);
    setFilters({
      targetType: (draft.targetType || undefined) as AuditTargetType | undefined,
      targetId: targetId || undefined,
      actorId: actorId || undefined,
      from: draft.from || undefined,
      to: draft.to || undefined,
    });
  };

  return (
    <div>
      <PageTitle title="Auditoria" subtitle="Registro imutável das ações financeiras e administrativas, mais recentes primeiro." />
      <Card>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tipo do alvo">
            <Select value={draft.targetType} onChange={(e) => setDraft({ ...draft, targetType: e.target.value })}>
              <option value="">Todos</option>
              {(Object.keys(AUDIT_TARGET_LABELS) as AuditTargetType[]).map((type) => (
                <option key={type} value={type}>
                  {AUDIT_TARGET_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Id do alvo" error={formError ?? undefined}>
            <Input value={draft.targetId} onChange={(e) => setDraft({ ...draft, targetId: e.target.value })} placeholder="UUID" />
          </Field>
          <Field label="Id do autor">
            <Input value={draft.actorId} onChange={(e) => setDraft({ ...draft, actorId: e.target.value })} placeholder="UUID" />
          </Field>
          <Field label="De">
            <Input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          </Field>
          <Field label="Até">
            <Input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Button type="submit">Filtrar</Button>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        {isLoading && <Skeleton className="h-64 rounded-2xl" />}
        {error && <ErrorMessage message={error.message} />}
        {data &&
          (data.content.length === 0 ? (
            <Empty icon={<ScrollText size={22} />} title="Nenhum registro" hint="Ajuste os filtros para ver outros registros." />
          ) : (
            <>
              <ul className="elevated overflow-hidden rounded-2xl border border-line bg-surface">
                {data.content.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </ul>
              <Pagination page={data.page.number} totalPages={data.page.totalPages} onChange={setPage} />
            </>
          ))}
      </div>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const actor = entry.actorType === "SYSTEM" ? "Sistema (rotina)" : entry.actorName ?? entry.actorEmail ?? entry.actorId;
  const details = Object.entries(entry.details);

  return (
    <li className="border-b border-line px-4 py-4 text-sm last:border-0 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-ink">{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</p>
        <p className="tabular text-xs text-subtle">{formatDateTime(entry.createdAt)}</p>
      </div>
      <p className="mt-1 text-muted">
        {actor}
        {entry.actorEmail && entry.actorName && <span className="text-subtle"> · {entry.actorEmail}</span>}
      </p>
      <p className="tabular mt-1 break-all text-xs text-subtle">
        {AUDIT_TARGET_LABELS[entry.targetType] ?? entry.targetType} {entry.targetId}
        {entry.correlationId && <> · requisição {entry.correlationId}</>}
      </p>
      {details.length > 0 && (
        <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
          {details.map(([key, value]) => (
            <div key={key} className="flex min-w-0 gap-1.5">
              <dt className="shrink-0 text-subtle">{key}:</dt>
              <dd className="tabular break-all text-ink">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
