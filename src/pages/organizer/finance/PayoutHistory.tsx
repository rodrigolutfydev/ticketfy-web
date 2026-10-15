import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine } from "lucide-react";
import { cancelPayout, listPayouts } from "../../../api/endpoints";
import type { Payout } from "../../../api/types";
import { ConfirmButton } from "../../../components/ConfirmDialog";
import Pagination from "../../../components/Pagination";
import { Empty, ErrorMessage } from "../../../components/StateMessage";
import { Alert, Skeleton } from "../../../components/ui";
import { formatPrice } from "../../../utils/format";
import { CANCELLABLE_STATUSES, PAYOUT_STATUS_STYLES, formatDateTime } from "./payoutMeta";
import { errorMessage } from "../../../api/client";
import { useI18n } from "../../../i18n/LocaleContext";

export default function PayoutHistory() {
  const { t } = useI18n();
  const h = t.organizer.payoutHistory;
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useQuery({
    queryKey: ["organizer-payouts", page],
    queryFn: () => listPayouts(page),
    placeholderData: (previous) => previous,
  });

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold tracking-[-0.035em] text-ink">{h.title}</h2>
      {isLoading && <Skeleton className="h-32 rounded-2xl" />}
      {error && <ErrorMessage message={errorMessage(error) ?? ""} />}
      {data &&
        (data.content.length === 0 ? (
          <Empty icon={<ArrowDownToLine size={22} />} title={h.emptyTitle} hint={h.emptyHint} />
        ) : (
          <>
            <ul className="tf-panel overflow-hidden">
              {data.content.map((payout) => (
                <PayoutRow key={payout.id} payout={payout} />
              ))}
            </ul>
            <Pagination page={data.page.number} totalPages={data.page.totalPages} onChange={setPage} />
          </>
        ))}
    </section>
  );
}

function PayoutRow({ payout }: { payout: Payout }) {
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const h = t.organizer.payoutHistory;
  const label = t.labels.payoutStatus[payout.status];
  const style = PAYOUT_STATUS_STYLES[payout.status];
  const cancel = useMutation({
    mutationFn: () => cancelPayout(payout.id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-balance"] });
      queryClient.invalidateQueries({ queryKey: ["organizer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["organizer-payouts"] });
    },
  });

  return (
    <li className="border-b border-line px-4 py-4 last:border-0 sm:px-5">
      <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <p className="tabular font-semibold text-ink">{formatPrice(payout.amount, locale)}</p>
          <p className="truncate text-sm text-muted">
            {t.labels.pixKeyTypes[payout.pixKeyType]} <span className="tabular">{payout.pixKey}</span>
            {h.requested(formatDateTime(payout.requestedAt, locale))}
          </p>
          {payout.finishedAt && payout.status !== "CANCELLED" && payout.status !== "REJECTED" && (
            <p className="text-xs text-subtle">{h.finished(formatDateTime(payout.finishedAt, locale))}</p>
          )}
          {payout.status === "UNDER_REVIEW" && <p className="text-xs text-subtle">{h.underReview}</p>}
          {payout.failureReason && <p className="text-xs text-danger">{h.failure(payout.failureReason)}</p>}
          {payout.rejectionReason && <p className="text-xs text-danger">{h.rejected(payout.rejectionReason)}</p>}
        </div>
        <span className={`tf-status shrink-0 ${style}`}>{label}</span>
        {CANCELLABLE_STATUSES.includes(payout.status) && (
          <ConfirmButton
            variant="secondary"
            title={h.cancelTitle}
            description={h.cancelText}
            confirmLabel={h.cancelConfirm}
            cancelLabel={h.keep}
            danger
            loading={cancel.isPending}
            onConfirm={() => cancel.mutate()}
          >
            {h.cancel}
          </ConfirmButton>
        )}
      </div>
      {cancel.error && (
        <div className="mt-3">
          <Alert>{errorMessage(cancel.error)}</Alert>
        </div>
      )}
    </li>
  );
}
