import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { approvePayout, listPayoutsForReview, rejectPayout } from "../../api/endpoints";
import type { AdminPayout } from "../../api/types";
import { ConfirmButton } from "../../components/ConfirmDialog";
import Pagination from "../../components/Pagination";
import { Empty, ErrorMessage } from "../../components/StateMessage";
import { Alert, Button, PageTitle, Skeleton } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { formatPrice } from "../../utils/format";
import { formatDateTime } from "../organizer/finance/payoutMeta";
import { errorMessage } from "../../api/client";
import { useI18n } from "../../i18n/LocaleContext";
import ReasonDialog from "./ReasonDialog";

export default function AdminPayoutsPage() {
  const { t } = useI18n();
  const p = t.admin.payouts;
  usePageTitle(p.pageTitle);
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-payouts", page],
    queryFn: () => listPayoutsForReview(page),
    placeholderData: (previous) => previous,
  });

  return (
    <div>
      <PageTitle title={p.title} subtitle={p.subtitle} />
      {isLoading && <Skeleton className="h-40 rounded-2xl" />}
      {error && <ErrorMessage message={errorMessage(error) ?? ""} />}
      {data &&
        (data.content.length === 0 ? (
          <Empty icon={<ClipboardCheck size={22} />} title={p.emptyTitle} hint={p.emptyHint} />
        ) : (
          <>
            <ul className="tf-panel overflow-hidden">
              {data.content.map((payout) => (
                <PayoutReviewRow key={payout.id} payout={payout} />
              ))}
            </ul>
            <Pagination page={data.page.number} totalPages={data.page.totalPages} onChange={setPage} />
          </>
        ))}
    </div>
  );
}

function PayoutReviewRow({ payout }: { payout: AdminPayout }) {
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const p = t.admin.payouts;
  const [rejecting, setRejecting] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
  const approve = useMutation({ mutationFn: () => approvePayout(payout.id), onSettled: refresh });
  const reject = useMutation({
    mutationFn: (reason: string) => rejectPayout(payout.id, reason),
    onSuccess: () => {
      setRejecting(false);
      refresh();
    },
  });

  return (
    <li className="border-b border-line px-4 py-4 last:border-0 sm:px-5">
      <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <p className="tabular text-lg font-semibold text-ink">{formatPrice(payout.amount, locale)}</p>
          <p className="truncate text-sm text-ink">
            {payout.organizerName ?? p.organizer} <span className="text-muted">· {payout.organizerEmail}</span>
          </p>
          <p className="truncate text-xs text-muted">
            {p.requested(formatDateTime(payout.requestedAt, locale))} · {t.labels.pixKeyTypes[payout.pixKeyType]}{" "}
            <span className="tabular">{payout.pixKey}</span> · {p.holder(payout.holderName)}
          </p>
          {payout.organizerPayoutsBlocked && <p className="text-xs text-warning">{p.blocked}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setRejecting(true)} disabled={approve.isPending}>
            {p.reject}
          </Button>
          <ConfirmButton
            variant="primary"
            title={p.approveTitle}
            description={p.approveText(formatPrice(payout.amount, locale))}
            confirmLabel={p.approve}
            loading={approve.isPending}
            onConfirm={() => approve.mutate()}
          >
            {p.approve}
          </ConfirmButton>
        </div>
      </div>
      {approve.error && (
        <div className="mt-3">
          <Alert>{errorMessage(approve.error)}</Alert>
        </div>
      )}
      <ReasonDialog
        open={rejecting}
        title={p.rejectTitle}
        description={p.rejectText(formatPrice(payout.amount, locale))}
        confirmLabel={p.rejectConfirm}
        loading={reject.isPending}
        error={errorMessage(reject.error)}
        onConfirm={(reason) => reject.mutate(reason)}
        onClose={() => setRejecting(false)}
      />
    </li>
  );
}
