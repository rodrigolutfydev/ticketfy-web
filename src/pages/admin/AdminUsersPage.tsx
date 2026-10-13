import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldOff, UserX } from "lucide-react";
import { blockOrganizerPayouts, findUserByEmail, reactivateUser, suspendUser, unblockOrganizerPayouts } from "../../api/endpoints";
import type { AdminUser } from "../../api/types";
import { errorMessage } from "../../api/client";
import { useI18n } from "../../i18n/LocaleContext";
import { ConfirmButton } from "../../components/ConfirmDialog";
import { ErrorMessage } from "../../components/StateMessage";
import { Alert, Button, Card, Field, Input, PageTitle } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { suspensionConsequences } from "../../utils/account";
import { formatDateTime } from "../organizer/finance/payoutMeta";
import ReasonDialog from "./ReasonDialog";

export default function AdminUsersPage() {
  const { t } = useI18n();
  const u = t.admin.users;
  usePageTitle(u.pageTitle);
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
      <PageTitle title={u.title} subtitle={u.subtitle} />
      <Card>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Field label={u.email}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={150} />
            </Field>
          </div>
          <Button type="submit" loading={isFetching}>
            {u.search}
          </Button>
        </form>
      </Card>
      <div className="mt-6 space-y-6">
        {error && <ErrorMessage message={errorMessage(error) ?? ""} />}
        {data && <UserCard user={data} searched={searched!} />}
      </div>
    </div>
  );
}

function UserCard({ user, searched }: { user: AdminUser; searched: string }) {
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const u = t.admin.users;
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
          <p className="mt-1 text-xs text-subtle">{t.labels.roles[user.role]}</p>
          <p className="tabular mt-1 text-xs text-subtle">{user.id}</p>
        </div>
        {user.role === "ADMIN" ? null : user.suspended ? (
          <ConfirmButton
            variant="secondary"
            title={u.reactivateTitle}
            description={u.reactivateText}
            confirmLabel={u.reactivateConfirm}
            loading={reactivate.isPending}
            onConfirm={() => reactivate.mutate()}
          >
            {u.reactivate}
          </ConfirmButton>
        ) : (
          <Button variant="danger" onClick={() => setSuspending(true)}>
            <UserX size={16} aria-hidden /> {u.suspend}
          </Button>
        )}
      </div>
      <div className="mt-4">
        {user.role === "ADMIN" ? (
          <Alert type="info">{u.adminNotice}</Alert>
        ) : user.suspended ? (
          <Alert type="warning">
            {u.suspended(user.suspendedAt ? formatDateTime(user.suspendedAt, locale) : null, user.suspensionReason ?? "")}
          </Alert>
        ) : (
          <Alert type="success">{u.active}</Alert>
        )}
      </div>
      {reactivate.error && (
        <div className="mt-3">
          <Alert>{errorMessage(reactivate.error)}</Alert>
        </div>
      )}
      {user.role === "ORGANIZER" && <PayoutBlockSection user={user} searched={searched} />}
      <ReasonDialog
        open={suspending}
        title={u.suspendTitle}
        description={
          <>
            <p>{u.suspendIntro}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {suspensionConsequences(user.role, locale).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-2">{u.suspendPrivacy}</p>
          </>
        }
        confirmLabel={u.suspend}
        loading={suspend.isPending}
        error={errorMessage(suspend.error)}
        onConfirm={(reason) => suspend.mutate(reason)}
        onClose={() => setSuspending(false)}
      />
    </Card>
  );
}

function PayoutBlockSection({ user, searched }: { user: AdminUser; searched: string }) {
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const u = t.admin.users;
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
        <p className="font-semibold text-ink">{u.payouts}</p>
        {user.payoutsBlocked ? (
          <ConfirmButton
            variant="secondary"
            title={u.unblockTitle}
            description={u.unblockText}
            confirmLabel={u.unblockConfirm}
            loading={unblock.isPending}
            onConfirm={() => unblock.mutate()}
          >
            {u.unblock}
          </ConfirmButton>
        ) : (
          <Button variant="danger" onClick={() => setBlocking(true)}>
            <ShieldOff size={16} aria-hidden /> {u.block}
          </Button>
        )}
      </div>
      <div className="mt-3 space-y-3">
        {user.payoutsBlocked ? (
          <Alert type="warning">
            {u.blocked(user.payoutBlockedAt ? formatDateTime(user.payoutBlockedAt, locale) : null, user.payoutBlockReason ?? "")}
          </Alert>
        ) : user.suspended ? (
          <Alert type="warning">{u.heldWhileSuspended}</Alert>
        ) : (
          <Alert type="success">{u.released}</Alert>
        )}
        {unblock.error && <Alert>{errorMessage(unblock.error)}</Alert>}
      </div>
      <ReasonDialog
        open={blocking}
        title={u.blockTitle}
        description={u.blockText}
        confirmLabel={u.block}
        loading={block.isPending}
        error={errorMessage(block.error)}
        onConfirm={(reason) => block.mutate(reason)}
        onClose={() => setBlocking(false)}
      />
    </div>
  );
}
