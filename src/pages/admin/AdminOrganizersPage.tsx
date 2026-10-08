import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldOff } from "lucide-react";
import { blockOrganizerPayouts, findOrganizerPayoutStatus, unblockOrganizerPayouts } from "../../api/endpoints";
import type { OrganizerPayoutStatus } from "../../api/types";
import { ConfirmButton } from "../../components/ConfirmDialog";
import { ErrorMessage } from "../../components/StateMessage";
import { Alert, Button, Card, Field, Input, PageTitle } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { formatDateTime } from "../organizer/finance/payoutMeta";
import ReasonDialog from "./ReasonDialog";

export default function AdminOrganizersPage() {
  usePageTitle("Organizadores");
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const { data, isFetching, error } = useQuery({
    queryKey: ["admin-organizer", searched],
    queryFn: () => findOrganizerPayoutStatus(searched!),
    enabled: searched !== null,
    retry: false,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSearched(email.trim());
  };

  return (
    <div>
      <PageTitle title="Organizadores" subtitle="Bloqueie ou libere os saques de um organizador. Vendas, eventos e extrato não são afetados." />
      <Card>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Field label="E-mail do organizador">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={150} />
            </Field>
          </div>
          <Button type="submit" loading={isFetching}>
            Buscar
          </Button>
        </form>
      </Card>
      <div className="mt-6">
        {error && <ErrorMessage message={error.message} />}
        {data && <OrganizerCard organizer={data} searched={searched!} />}
      </div>
    </div>
  );
}

function OrganizerCard({ organizer, searched }: { organizer: OrganizerPayoutStatus; searched: string }) {
  const queryClient = useQueryClient();
  const [blocking, setBlocking] = useState(false);
  const update = (status: OrganizerPayoutStatus) => queryClient.setQueryData(["admin-organizer", searched], status);
  const block = useMutation({
    mutationFn: (reason: string) => blockOrganizerPayouts(organizer.id, reason),
    onSuccess: (status) => {
      setBlocking(false);
      update(status);
    },
  });
  const unblock = useMutation({ mutationFn: () => unblockOrganizerPayouts(organizer.id), onSuccess: update });

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-ink">{organizer.name}</p>
          <p className="text-sm text-muted">{organizer.email}</p>
          <p className="tabular mt-1 text-xs text-subtle">{organizer.id}</p>
        </div>
        {organizer.payoutsBlocked ? (
          <ConfirmButton
            variant="secondary"
            title="Desbloquear os saques?"
            description="O organizador volta a poder solicitar saques, e os saques solicitados voltam a ser processados."
            confirmLabel="Desbloquear"
            loading={unblock.isPending}
            onConfirm={() => unblock.mutate()}
          >
            Desbloquear saques
          </ConfirmButton>
        ) : (
          <Button variant="danger" onClick={() => setBlocking(true)}>
            <ShieldOff size={16} aria-hidden /> Bloquear saques
          </Button>
        )}
      </div>
      <div className="mt-4">
        {organizer.payoutsBlocked ? (
          <Alert type="warning">
            Saques bloqueados{organizer.blockedAt ? ` desde ${formatDateTime(organizer.blockedAt)}` : ""}. Motivo: {organizer.blockReason}
          </Alert>
        ) : (
          <Alert type="success">Saques liberados.</Alert>
        )}
      </div>
      {unblock.error && (
        <div className="mt-3">
          <Alert>{unblock.error.message}</Alert>
        </div>
      )}
      <ReasonDialog
        open={blocking}
        title="Bloquear os saques deste organizador?"
        description="Novos saques serão recusados e os já solicitados não serão processados enquanto o bloqueio durar. Saques em processamento seguem até o fim."
        confirmLabel="Bloquear saques"
        loading={block.isPending}
        error={block.error?.message ?? null}
        onConfirm={(reason) => block.mutate(reason)}
        onClose={() => setBlocking(false)}
      />
    </Card>
  );
}
