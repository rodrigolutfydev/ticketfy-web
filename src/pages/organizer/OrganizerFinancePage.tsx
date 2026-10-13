import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Download, ReceiptText } from "lucide-react";
import { downloadLedgerCsv, getBalance, getPayoutAccount, listLedger, listMyEvents } from "../../api/endpoints";
import type { Balance, LedgerEntry } from "../../api/types";
import { useMe } from "../../auth/useMe";
import Pagination from "../../components/Pagination";
import { Empty, ErrorMessage } from "../../components/StateMessage";
import { Alert, Button, Card, PageTitle, Select, Skeleton } from "../../components/ui";
import PayoutAccountSection from "./finance/PayoutAccountSection";
import PayoutDialog from "./finance/PayoutDialog";
import PayoutHistory from "./finance/PayoutHistory";
import { payoutBlockedReason } from "./finance/payoutMeta";
import { formatDate, formatPrice, formatTime, shortId } from "../../utils/format";
import { errorMessage } from "../../api/client";
import { useI18n } from "../../i18n/LocaleContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { saveBlob } from "../../utils/download";

export default function OrganizerFinancePage() {
  const { t } = useI18n();
  usePageTitle(t.organizer.finance.pageTitle);
  const { isAdmin } = useMe();

  if (isAdmin) {
    return (
      <div>
        <PageTitle title={t.organizer.finance.title} />
        <Card>
          <p className="text-muted">{t.organizer.finance.adminNote}</p>
        </Card>
      </div>
    );
  }

  return <Finance />;
}

function Finance() {
  const { t, locale } = useI18n();
  const f = t.organizer.finance;
  const balance = useQuery({ queryKey: ["organizer-balance"], queryFn: getBalance });
  const account = useQuery({ queryKey: ["payout-account"], queryFn: getPayoutAccount });
  const [dialogSession, setDialogSession] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const ready = balance.data !== undefined && account.data !== undefined;
  const blockedReason = ready ? payoutBlockedReason(balance.data!, account.data!, locale) : null;

  return (
    <div>
      <PageTitle
        title={f.title}
        subtitle={f.subtitle}
        actions={
          <div className="flex flex-col items-end gap-1">
            <span title={blockedReason ?? undefined}>
              <Button
                disabled={!ready || blockedReason !== null}
                onClick={() => {
                  setDialogSession((n) => n + 1);
                  setDialogOpen(true);
                }}
                aria-describedby={blockedReason ? "payout-blocked-reason" : undefined}
              >
                <ArrowDownToLine size={17} aria-hidden /> {f.withdraw}
              </Button>
            </span>
            {blockedReason && (
              <p id="payout-blocked-reason" className="max-w-xs text-right text-xs text-muted">
                {blockedReason}
              </p>
            )}
          </div>
        }
      />
      {balance.data?.payoutsBlocked && (
        <div className="mb-6">
          <Alert type="warning">{f.blockedNotice}</Alert>
        </div>
      )}
      <BalanceCards balance={balance.data} isLoading={balance.isLoading} error={balance.error} />
      <div className="mt-8">
        {account.isLoading && <Skeleton className="h-40 rounded-2xl" />}
        {account.error && <ErrorMessage message={errorMessage(account.error) ?? ""} />}
        {account.data !== undefined && <PayoutAccountSection account={account.data} />}
      </div>
      <PayoutHistory />
      <Ledger />
      {ready && account.data && (
        <PayoutDialog
          key={dialogSession}
          open={dialogOpen}
          balance={balance.data!}
          account={account.data}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

function BalanceCards({ balance, isLoading, error }: { balance: Balance | undefined; isLoading: boolean; error: Error | null }) {
  const { t } = useI18n();
  const f = t.organizer.finance;
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorMessage message={errorMessage(error) ?? ""} />;
  if (!balance) return null;
  const b = balance;
  const showHeld = b.held !== 0;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${showHeld ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
      <BalanceCard label={f.pending} value={b.pending} hint={f.pendingHint(b.releaseDelayDays)} />
      <BalanceCard label={f.available} value={b.available} hint={f.availableHint} accent />
      <BalanceCard label={f.inPayout} value={b.inPayout} hint={f.inPayoutHint} />
      {showHeld && <BalanceCard label={f.held} value={b.held} hint={f.heldHint} />}
      <BalanceCard label={f.total} value={b.total} hint={f.totalHint} />
    </div>
  );
}

function BalanceCard({ label, value, hint, accent }: { label: string; value: number; hint: string; accent?: boolean }) {
  const { locale } = useI18n();
  const negative = value < 0;
  return (
    <div className="elevated rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`font-display tabular mt-2 text-3xl font-semibold tracking-tight ${
          negative ? "text-danger" : accent ? "text-accent-text" : "text-ink"
        }`}
      >
        {formatPrice(value, locale)}
      </p>
      <p className="mt-2 text-xs text-subtle">{hint}</p>
    </div>
  );
}

function Ledger() {
  const { t, locale } = useI18n();
  const f = t.organizer.finance;
  const [eventId, setEventId] = useState("");
  const [page, setPage] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const events = useQuery({ queryKey: ["my-events-options"], queryFn: () => listMyEvents(0, 100) });
  const { data, isLoading, error } = useQuery({
    queryKey: ["organizer-ledger", eventId, page],
    queryFn: () => listLedger({ eventId: eventId || undefined, page }),
    placeholderData: (previous) => previous,
  });

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{f.ledger}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <ExportButton eventId={eventId || undefined} onError={setExportError} />
          <label className="flex items-center gap-2 text-sm text-muted">
            {f.event}
            <Select
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setPage(0);
              }}
              className="w-64"
            >
              <option value="">{f.allEvents}</option>
              {events.data?.content.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>
      {exportError && (
        <div className="mb-4">
          <Alert>{exportError}</Alert>
        </div>
      )}

      {isLoading && <Skeleton className="h-64 rounded-2xl" />}
      {error && <ErrorMessage message={errorMessage(error) ?? ""} />}

      {data &&
        (data.content.length === 0 ? (
          <Empty icon={<ReceiptText size={22} />} title={f.emptyLedger} hint={f.emptyLedgerHint} />
        ) : (
          <>
            <ul className="elevated overflow-hidden rounded-2xl border border-line bg-surface">
              {data.content.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-4 last:border-0 sm:flex-nowrap sm:px-5">
                  <div className="w-28 shrink-0">
                    <p className="tabular text-sm text-ink">{formatDate(entry.createdAt, locale)}</p>
                    <p className="tabular text-xs text-subtle">{formatTime(entry.createdAt, locale)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{t.labels.ledgerEntries[entry.type]}</p>
                    <EntryReference entry={entry} />
                  </div>
                  <p className={`tabular w-32 text-right font-semibold ${entry.amount < 0 ? "text-danger" : "text-ink"}`}>
                    {formatPrice(entry.amount, locale)}
                  </p>
                </li>
              ))}
            </ul>
            <Pagination page={data.page.number} totalPages={data.page.totalPages} onChange={setPage} />
          </>
        ))}
    </section>
  );
}

function EntryReference({ entry }: { entry: LedgerEntry }) {
  const { t } = useI18n();
  const f = t.organizer.finance;
  if (entry.payoutId) {
    return <p className="truncate text-sm text-muted">{f.payoutRef(shortId(entry.payoutId))}</p>;
  }
  return (
    <p className="truncate text-sm text-muted">
      {entry.eventId && (
        <Link to={`/organizer/events/${entry.eventId}`} className="hover:text-ink hover:underline">
          {entry.eventName}
        </Link>
      )}
      {entry.orderId && f.orderRef(shortId(entry.orderId))}
    </p>
  );
}

function ExportButton({ eventId, onError }: { eventId?: string; onError: (message: string | null) => void }) {
  const { t } = useI18n();
  const f = t.organizer.finance;
  const [loading, setLoading] = useState(false);

  const exportCsv = async () => {
    setLoading(true);
    onError(null);
    try {
      const { blob, filename } = await downloadLedgerCsv({ eventId });
      saveBlob(blob, filename ?? f.csvName);
    } catch (error) {
      onError(error instanceof Error ? errorMessage(error) : f.exportFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" loading={loading} onClick={exportCsv}>
      <Download size={15} aria-hidden /> {f.exportCsv}
    </Button>
  );
}
