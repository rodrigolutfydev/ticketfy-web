import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, Users } from "lucide-react";
import { errorMessage } from "../../../api/client";
import { downloadParticipantsCsv, listManagedTicketTypes, listParticipants } from "../../../api/endpoints";
import type { ParticipantFilters, TicketStatus } from "../../../api/types";
import Pagination from "../../../components/Pagination";
import { Empty, ErrorMessage } from "../../../components/StateMessage";
import { Alert, Button, Input, Select, Skeleton } from "../../../components/ui";
import { saveBlob } from "../../../utils/download";
import { formatShortDate } from "../../../utils/format";
import { maskedCode } from "../../../utils/participants";
import { useI18n } from "../../../i18n/LocaleContext";
import { STATUS_TONES } from "../../../components/StatusBadge";

const STATUSES: TicketStatus[] = ["VALID", "USED", "CANCELLED"];
const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

const STATUS_STYLES: Record<TicketStatus, string> = {
  VALID: STATUS_TONES.success,
  USED: STATUS_TONES.accent,
  CANCELLED: STATUS_TONES.muted,
};

export default function EventParticipants({ eventId }: { eventId: string }) {
  const { t, locale } = useI18n();
  const p = t.organizer.participants;
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQ(qInput.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [qInput]);

  useEffect(() => setPage(0), [ticketTypeId, status, q]);

  const filters: ParticipantFilters = {
    ticketTypeId: ticketTypeId || undefined,
    status: status || undefined,
    q: q || undefined,
  };

  const lotsQuery = useQuery({ queryKey: ["ticket-types-manage", eventId], queryFn: () => listManagedTicketTypes(eventId) });
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["event-participants", eventId, { ...filters, page }],
    queryFn: () => listParticipants(eventId, { ...filters, page, size: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      const { blob, filename } = await downloadParticipantsCsv(eventId, filters);
      saveBlob(blob, filename ?? p.csvName);
    } catch (failure) {
      setExportError(errorMessage(failure));
    } finally {
      setExporting(false);
    }
  }

  const filtered = Boolean(ticketTypeId || status || q);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{p.searchLabel}</span>
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} maxLength={100} placeholder={p.searchPlaceholder} className="pl-10" />
        </label>
        <label className="lg:w-56">
          <span className="sr-only">{p.lot}</span>
          <Select value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)}>
            <option value="">{p.allLots}</option>
            {(lotsQuery.data ?? []).map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.name}
                {lot.active ? "" : p.inactiveLot}
              </option>
            ))}
          </Select>
        </label>
        <label className="lg:w-48">
          <span className="sr-only">{p.status}</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus | "")}>
            <option value="">{p.allStatuses}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.labels.ticketStatus[s]}
              </option>
            ))}
          </Select>
        </label>
        <Button variant="secondary" onClick={exportCsv} loading={exporting}>
          <Download size={16} aria-hidden /> {p.exportCsv}
        </Button>
      </div>
      <p className="text-xs text-muted">{p.privacyNote}</p>
      {exportError && <Alert>{exportError}</Alert>}

      {isLoading && <Skeleton className="h-64 rounded-2xl" />}
      {error && <ErrorMessage message={errorMessage(error) ?? ""} />}
      {data && data.content.length === 0 && (
        <Empty
          icon={<Users size={22} />}
          title={filtered ? p.emptyFilteredTitle : p.emptyTitle}
          hint={filtered ? p.emptyFilteredHint : p.emptyHint}
        />
      )}

      {data && data.content.length > 0 && (
        <div className={`tf-panel overflow-x-auto transition-opacity ${isFetching ?"opacity-70" : ""}`}>
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">{p.participant}</th>
                <th className="px-3 py-3 font-medium">{p.lot}</th>
                <th className="px-3 py-3 font-medium">{p.status}</th>
                <th className="px-3 py-3 font-medium">{p.checkIn}</th>
                <th className="px-3 py-3 font-medium">{p.code}</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((participant) => (
                <tr key={participant.ticketId} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink">{participant.holderName}</p>
                    {participant.transferred && (
                      <span className="mt-1 inline-block rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-warning">
                        {p.transferred}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-muted">{participant.ticketTypeName}</td>
                  <td className="px-3 py-3.5">
                    <span className={`tf-status ${STATUS_STYLES[participant.status]}`}>
                      {t.labels.ticketStatus[participant.status]}
                    </span>
                  </td>
                  <td className="tabular px-3 py-3.5 text-muted">{participant.checkedInAt ? formatShortDate(participant.checkedInAt, locale) : "—"}</td>
                  <td className="tabular px-3 py-3.5 font-mono text-muted">{maskedCode(participant.codeSuffix)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <p className="text-xs text-muted">{p.count(data.page.totalElements)}</p>
      )}
      {data && <Pagination page={page} totalPages={data.page.totalPages} onChange={setPage} />}
    </div>
  );
}
