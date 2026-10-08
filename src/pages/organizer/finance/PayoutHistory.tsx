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
import { CANCELLABLE_STATUSES, PAYOUT_STATUS_META, PIX_KEY_LABELS, formatDateTime } from "./payoutMeta";

export default function PayoutHistory() {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useQuery({
    queryKey: ["organizer-payouts", page],
    queryFn: () => listPayouts(page),
    placeholderData: (previous) => previous,
  });

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-ink">Saques</h2>
      {isLoading && <Skeleton className="h-32 rounded-2xl" />}
      {error && <ErrorMessage message={error.message} />}
      {data &&
        (data.content.length === 0 ? (
          <Empty icon={<ArrowDownToLine size={22} />} title="Nenhum saque ainda" hint="Os saques solicitados aparecem aqui com o status." />
        ) : (
          <>
            <ul className="elevated overflow-hidden rounded-2xl border border-line bg-surface">
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
  const [label, style] = PAYOUT_STATUS_META[payout.status];
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
          <p className="tabular font-semibold text-ink">{formatPrice(payout.amount)}</p>
          <p className="truncate text-sm text-muted">
            {PIX_KEY_LABELS[payout.pixKeyType]} <span className="tabular">{payout.pixKey}</span> · solicitado em {formatDateTime(payout.requestedAt)}
          </p>
          {payout.finishedAt && payout.status !== "CANCELLED" && payout.status !== "REJECTED" && (
            <p className="text-xs text-subtle">Concluído em {formatDateTime(payout.finishedAt)}</p>
          )}
          {payout.status === "UNDER_REVIEW" && (
            <p className="text-xs text-subtle">A equipe do Ticketfy está conferindo este saque antes do envio.</p>
          )}
          {payout.failureReason && <p className="text-xs text-danger">Motivo: {payout.failureReason}</p>}
          {payout.rejectionReason && <p className="text-xs text-danger">Recusado: {payout.rejectionReason}</p>}
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {label}
        </span>
        {CANCELLABLE_STATUSES.includes(payout.status) && (
          <ConfirmButton
            variant="secondary"
            title="Cancelar este saque?"
            description="O valor volta para o saldo disponível."
            confirmLabel="Cancelar saque"
            cancelLabel="Manter"
            danger
            loading={cancel.isPending}
            onConfirm={() => cancel.mutate()}
          >
            Cancelar
          </ConfirmButton>
        )}
      </div>
      {cancel.error && (
        <div className="mt-3">
          <Alert>{cancel.error.message}</Alert>
        </div>
      )}
    </li>
  );
}
