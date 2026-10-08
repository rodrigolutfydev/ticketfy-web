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
import { PIX_KEY_LABELS, formatDateTime } from "../organizer/finance/payoutMeta";
import ReasonDialog from "./ReasonDialog";

export default function AdminPayoutsPage() {
  usePageTitle("Saques em análise");
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-payouts", page],
    queryFn: () => listPayoutsForReview(page),
    placeholderData: (previous) => previous,
  });

  return (
    <div>
      <PageTitle title="Saques em análise" subtitle="Primeiros saques de cada organizador e saques acima do limite de análise." />
      {isLoading && <Skeleton className="h-40 rounded-2xl" />}
      {error && <ErrorMessage message={error.message} />}
      {data &&
        (data.content.length === 0 ? (
          <Empty icon={<ClipboardCheck size={22} />} title="Nenhum saque aguardando análise" hint="Os novos pedidos aparecem aqui." />
        ) : (
          <>
            <ul className="elevated overflow-hidden rounded-2xl border border-line bg-surface">
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
          <p className="tabular text-lg font-semibold text-ink">{formatPrice(payout.amount)}</p>
          <p className="truncate text-sm text-ink">
            {payout.organizerName ?? "Organizador"} <span className="text-muted">· {payout.organizerEmail}</span>
          </p>
          <p className="truncate text-xs text-muted">
            Solicitado em {formatDateTime(payout.requestedAt)} · {PIX_KEY_LABELS[payout.pixKeyType]}{" "}
            <span className="tabular">{payout.pixKey}</span> · titular {payout.holderName}
          </p>
          {payout.organizerPayoutsBlocked && <p className="text-xs text-warning">Os saques deste organizador estão bloqueados.</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setRejecting(true)} disabled={approve.isPending}>
            Recusar
          </Button>
          <ConfirmButton
            variant="primary"
            title="Aprovar este saque?"
            description={`${formatPrice(payout.amount)} serão enviados por Pix na próxima execução da rotina de saques.`}
            confirmLabel="Aprovar"
            loading={approve.isPending}
            onConfirm={() => approve.mutate()}
          >
            Aprovar
          </ConfirmButton>
        </div>
      </div>
      {approve.error && (
        <div className="mt-3">
          <Alert>{approve.error.message}</Alert>
        </div>
      )}
      <ReasonDialog
        open={rejecting}
        title="Recusar este saque?"
        description={`O valor de ${formatPrice(payout.amount)} volta para o saldo disponível do organizador, que verá o motivo.`}
        confirmLabel="Recusar saque"
        loading={reject.isPending}
        error={reject.error?.message ?? null}
        onConfirm={(reason) => reject.mutate(reason)}
        onClose={() => setRejecting(false)}
      />
    </li>
  );
}
