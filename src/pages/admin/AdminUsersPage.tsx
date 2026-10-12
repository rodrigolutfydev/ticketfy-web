import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldOff, UserX } from "lucide-react";
import { blockOrganizerPayouts, findUserByEmail, reactivateUser, suspendUser, unblockOrganizerPayouts } from "../../api/endpoints";
import type { AdminUser, Role } from "../../api/types";
import { ConfirmButton } from "../../components/ConfirmDialog";
import { ErrorMessage } from "../../components/StateMessage";
import { Alert, Button, Card, Field, Input, PageTitle } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { suspensionConsequences } from "../../utils/account";
import { formatDateTime } from "../organizer/finance/payoutMeta";
import ReasonDialog from "./ReasonDialog";

const ROLE_LABELS: Record<Role, string> = { USER: "Cliente", ORGANIZER: "Organizador", ADMIN: "Administrador" };

export default function AdminUsersPage() {
  usePageTitle("Usuários");
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const { data, isFetching, error } = useQuery({
    queryKey: ["admin-user", searched],
    queryFn: () => findUserByEmail(searched!),
    enabled: searched !== null,
    retry: false,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSearched(email.trim());
  };

  return (
    <div>
      <PageTitle title="Usuários" subtitle="Encontre qualquer conta pelo e-mail para suspender, reativar ou, se for organizador, bloquear os saques." />
      <Card>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Field label="E-mail do usuário">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={150} />
            </Field>
          </div>
          <Button type="submit" loading={isFetching}>
            Buscar
          </Button>
        </form>
      </Card>
      <div className="mt-6 space-y-6">
        {error && <ErrorMessage message={error.message} />}
        {data && <UserCard user={data} searched={searched!} />}
      </div>
    </div>
  );
}

function UserCard({ user, searched }: { user: AdminUser; searched: string }) {
  const queryClient = useQueryClient();
  const [suspending, setSuspending] = useState(false);
  const update = (next: AdminUser) => queryClient.setQueryData(["admin-user", searched], next);
  const suspend = useMutation({
    mutationFn: (reason: string) => suspendUser(user.id, reason),
    onSuccess: (next) => {
      setSuspending(false);
      update(next);
    },
  });
  const reactivate = useMutation({ mutationFn: () => reactivateUser(user.id), onSuccess: update });

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-ink">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-subtle">{ROLE_LABELS[user.role]}</p>
          <p className="tabular mt-1 text-xs text-subtle">{user.id}</p>
        </div>
        {user.role === "ADMIN" ? null : user.suspended ? (
          <ConfirmButton
            variant="secondary"
            title="Reativar esta conta?"
            description="A pessoa volta a poder entrar. Se for organizador, as vendas dos eventos e o processamento dos saques voltam ao normal."
            confirmLabel="Reativar"
            loading={reactivate.isPending}
            onConfirm={() => reactivate.mutate()}
          >
            Reativar conta
          </ConfirmButton>
        ) : (
          <Button variant="danger" onClick={() => setSuspending(true)}>
            <UserX size={16} aria-hidden /> Suspender conta
          </Button>
        )}
      </div>
      <div className="mt-4">
        {user.role === "ADMIN" ? (
          <Alert type="info">Contas de administrador não podem ser suspensas.</Alert>
        ) : user.suspended ? (
          <Alert type="warning">
            Conta suspensa{user.suspendedAt ? ` desde ${formatDateTime(user.suspendedAt)}` : ""}. Motivo: {user.suspensionReason}
          </Alert>
        ) : (
          <Alert type="success">Conta ativa.</Alert>
        )}
      </div>
      {reactivate.error && (
        <div className="mt-3">
          <Alert>{reactivate.error.message}</Alert>
        </div>
      )}
      {user.role === "ORGANIZER" && <PayoutBlockSection user={user} searched={searched} />}
      <ReasonDialog
        open={suspending}
        title="Suspender esta conta?"
        description={
          <>
            <p>Ao confirmar:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {suspensionConsequences(user.role).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-2">O motivo fica só para a administração e a auditoria; a pessoa vê apenas que a conta está suspensa.</p>
          </>
        }
        confirmLabel="Suspender conta"
        loading={suspend.isPending}
        error={suspend.error?.message ?? null}
        onConfirm={(reason) => suspend.mutate(reason)}
        onClose={() => setSuspending(false)}
      />
    </Card>
  );
}

function PayoutBlockSection({ user, searched }: { user: AdminUser; searched: string }) {
  const queryClient = useQueryClient();
  const [blocking, setBlocking] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-user", searched] });
  const block = useMutation({
    mutationFn: (reason: string) => blockOrganizerPayouts(user.id, reason),
    onSuccess: () => {
      setBlocking(false);
      return refresh();
    },
  });
  const unblock = useMutation({ mutationFn: () => unblockOrganizerPayouts(user.id), onSuccess: refresh });

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-semibold text-ink">Saques</p>
        {user.payoutsBlocked ? (
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
      <div className="mt-3 space-y-3">
        {user.payoutsBlocked ? (
          <Alert type="warning">
            Saques bloqueados{user.payoutBlockedAt ? ` desde ${formatDateTime(user.payoutBlockedAt)}` : ""}. Motivo: {user.payoutBlockReason}
          </Alert>
        ) : user.suspended ? (
          <Alert type="warning">Saques retidos enquanto a conta estiver suspensa.</Alert>
        ) : (
          <Alert type="success">Saques liberados.</Alert>
        )}
        {unblock.error && <Alert>{unblock.error.message}</Alert>}
      </div>
      <ReasonDialog
        open={blocking}
        title="Bloquear os saques deste organizador?"
        description="Novos saques serão recusados e os já solicitados não serão processados enquanto o bloqueio durar. Saques em processamento seguem até o fim. Vendas e eventos não são afetados."
        confirmLabel="Bloquear saques"
        loading={block.isPending}
        error={block.error?.message ?? null}
        onConfirm={(reason) => block.mutate(reason)}
        onClose={() => setBlocking(false)}
      />
    </div>
  );
}
