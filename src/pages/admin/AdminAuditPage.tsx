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
import { AUDIT_TARGET_TYPES, UUID_PATTERN } from "./adminMeta";
import { errorMessage } from "../../api/client";
import { useI18n } from "../../i18n/LocaleContext";

type Filters = { targetType?: AuditTargetType; targetId?: string; actorId?: string; from?: string; to?: string };

export default function AdminAuditPage() {
  const { t } = useI18n();
  const a = t.admin.audit;
  usePageTitle(a.pageTitle);
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
      setFormError(a.invalidIds);
      return;
    }
    if (draft.from && draft.to && draft.from > draft.to) {
      setFormError(a.invalidDates);
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
      <PageTitle title={a.title} subtitle={a.subtitle} />
      <Card>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={a.targetType}>
            <Select value={draft.targetType} onChange={(e) => setDraft({ ...draft, targetType: e.target.value })}>
              <option value="">{a.all}</option>
              {AUDIT_TARGET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t.labels.auditTargets[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={a.targetId} error={formError ?? undefined}>
            <Input value={draft.targetId} onChange={(e) => setDraft({ ...draft, targetId: e.target.value })} placeholder="UUID" />
          </Field>
          <Field label={a.actorId}>
            <Input value={draft.actorId} onChange={(e) => setDraft({ ...draft, actorId: e.target.value })} placeholder="UUID" />
          </Field>
          <Field label={a.from}>
            <Input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          </Field>
          <Field label={a.to}>
            <Input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Button type="submit">{a.filter}</Button>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        {isLoading && <Skeleton className="h-64 rounded-2xl" />}
        {error && <ErrorMessage message={errorMessage(error) ?? ""} />}
        {data &&
          (data.content.length === 0 ? (
            <Empty icon={<ScrollText size={22} />} title={a.emptyTitle} hint={a.emptyHint} />
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
  const { t, locale } = useI18n();
  const a = t.admin.audit;
  const actions: Record<string, string> = t.labels.auditActions;
  const targets: Record<string, string> = t.labels.auditTargets;
  const actor = entry.actorType === "SYSTEM" ? a.system : entry.actorName ?? entry.actorEmail ?? entry.actorId;
  const details = Object.entries(entry.details);

  return (
    <li className="border-b border-line px-4 py-4 text-sm last:border-0 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-ink">{actions[entry.action] ?? entry.action}</p>
        <p className="tabular text-xs text-subtle">{formatDateTime(entry.createdAt, locale)}</p>
      </div>
      <p className="mt-1 text-muted">
        {actor}
        {entry.actorEmail && entry.actorName && <span className="text-subtle"> · {entry.actorEmail}</span>}
      </p>
      <p className="tabular mt-1 break-all text-xs text-subtle">
        {targets[entry.targetType] ?? entry.targetType} {entry.targetId}
        {entry.correlationId && a.request(entry.correlationId)}
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
