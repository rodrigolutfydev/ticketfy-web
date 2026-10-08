import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, fieldError, hasUnmappedError } from "../api/client";
import { changePassword, logoutAll, updateAvatar } from "../api/endpoints";
import type { UserProfile } from "../api/types";
import Avatar from "../components/Avatar";
import { passwordStrength, safeImageUrl } from "../utils/security";
import { BadgeCheck, Clock, KeyRound, LogOut, Mail, MonitorSmartphone, ShieldCheck, Timer, Trash2, UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import BackendNotice, { Code } from "../components/BackendNotice";
import BecomeOrganizer from "../components/BecomeOrganizer";
import { ConfirmButton } from "../components/ConfirmDialog";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { Alert, Button, ButtonLink, Card, Field, InfoRow, Input, PageTitle, PasswordInput } from "../components/ui";
import { formatTime } from "../utils/format";
import { usePageTitle } from "../hooks/usePageTitle";

const roleLabels = { USER: "Comprador", ORGANIZER: "Organizador", ADMIN: "Administrador" };
const TABS = ["perfil", "seguranca", "organizador"] as const;

export default function AccountPage() {
  usePageTitle("Minha conta");
  const [tab, setTab] = useTabParam(TABS, "perfil");
  const { me, isLoading, error, endpointMissing } = useMe();

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Minha conta" />
      <Tabs
        label="Seções da conta"
        idPrefix="conta"
        value={tab}
        onChange={setTab}
        items={[
          { key: "perfil", label: "Perfil", icon: <UserRound size={16} /> },
          { key: "seguranca", label: "Segurança", icon: <ShieldCheck size={16} /> },
          { key: "organizador", label: "Organizador", icon: <BadgeCheck size={16} /> },
        ]}
      />
      <TabPanel idPrefix="conta" activeKey={tab}>
        {tab !== "seguranca" && isLoading && <Loading />}
        {tab !== "seguranca" && endpointMissing && (
          <BackendNotice title="Perfil indisponível">
            <p>
              A API ainda não tem a rota <Code>GET /users/me</Code>, então não dá para mostrar seus dados aqui.
            </p>
          </BackendNotice>
        )}
        {tab !== "seguranca" && error && !endpointMissing && <ErrorMessage message={error.message} />}

        {tab === "perfil" && me && <ProfileTab me={me} />}

        {tab === "seguranca" && <SecurityTab />}

        {tab === "organizador" && me && (
          <Card>
            {me.role === "USER" ? (
              <>
                <h2 className="mb-5 text-lg font-extrabold text-ink">Quer vender ingressos?</h2>
                <BecomeOrganizer />
              </>
            ) : (
              <>
                <h2 className="text-lg font-extrabold text-ink">Sua conta é organizadora</h2>
                <p className="mb-5 mt-1 text-muted">Crie eventos, cadastre lotes e faça o check-in na entrada.</p>
                <ButtonLink to="/organizer">Abrir área do organizador</ButtonLink>
              </>
            )}
          </Card>
        )}
      </TabPanel>
    </div>
  );
}

// Aba de segurança: mostra como a sessão é protegida e permite sair.
// Perfil com foto: a foto é um endereço https (a API não recebe upload de arquivo).
// A prévia muda enquanto a pessoa digita; "Remover foto" manda "" para a API.
function ProfileTab({ me }: { me: UserProfile }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState(me.avatarUrl ?? "");
  const trimmed = url.trim();
  const preview = trimmed ? safeImageUrl(trimmed) : null;
  const invalid = trimmed !== "" && !preview;
  const changed = trimmed !== (me.avatarUrl ?? "");

  const mutation = useMutation({
    mutationFn: (value: string) => updateAvatar(value),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile); // menu e perfil mudam na hora
      setUrl(profile.avatarUrl ?? "");
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (invalid || !changed) return;
    mutation.mutate(trimmed);
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <Avatar name={me.name} url={preview ?? (trimmed ? null : me.avatarUrl)} size={112} />
        <div className="text-center sm:text-left">
          <p className="font-display text-3xl font-semibold tracking-tight text-ink">{me.name}</p>
          <p className="mt-1 text-muted">{roleLabels[me.role] ?? me.role}</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4 border-t border-line pt-8">
        <Field
          label="Foto de perfil"
          hint="Cole o endereço de uma imagem que comece com https://. Quadrada fica melhor."
          error={invalid ? "Use um endereço que comece com https://" : fieldError(mutation.error, "avatarUrl")}
        >
          <Input type="url" inputMode="url" maxLength={500} placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        {mutation.error && hasUnmappedError(mutation.error, ["avatarUrl"]) && <Alert>{mutation.error.message}</Alert>}
        {mutation.isSuccess && !changed && <Alert type="success">Foto atualizada.</Alert>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={mutation.isPending && mutation.variables !== ""} disabled={invalid || !changed || mutation.isPending}>
            Salvar foto
          </Button>
          {me.avatarUrl && (
            <Button variant="ghost" loading={mutation.isPending && mutation.variables === ""} disabled={mutation.isPending} onClick={() => mutation.mutate("")}>
              <Trash2 size={16} aria-hidden /> Remover foto
            </Button>
          )}
        </div>
      </form>

      <dl className="mt-8 grid gap-5 border-t border-line pt-8 sm:grid-cols-2">
        <InfoRow icon={<Mail size={18} />} label="E-mail">
          <span className="break-all">{me.email}</span>
        </InfoRow>
        <InfoRow icon={<BadgeCheck size={18} />} label="Perfil">
          {roleLabels[me.role] ?? me.role}
        </InfoRow>
      </dl>
    </Card>
  );
}

function SecurityTab() {
  const { signOut, expiresAt } = useAuth();
  const navigate = useNavigate();
  const logoutAllMutation = useMutation({
    mutationFn: logoutAll,
    onSuccess: () => {
      signOut("manual", { notifyServer: false });
      navigate("/login", { replace: true });
    },
  });

  const items = [
    { icon: <MonitorSmartphone size={18} />, label: "Sessão neste navegador", text: "As abas abertas compartilham a mesma sessão. Sair em uma encerra todas." },
    { icon: <Timer size={18} />, label: "Inatividade", text: "Depois de 30 minutos sem uso em nenhuma aba, você sai automaticamente." },
    {
      icon: <Clock size={18} />,
      label: "Validade do acesso",
      text: expiresAt
        ? `O acesso é renovado enquanto você usa o site. O atual vale até ${formatTime(new Date(expiresAt).toISOString())}.`
        : "Sessão não iniciada.",
    },
    { icon: <KeyRound size={18} />, label: "Senha", text: "Use uma senha longa e que você não usa em outros sites." },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <dl className="grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <InfoRow key={item.label} icon={item.icon} label={item.label}>
              <span className="font-normal text-muted">{item.text}</span>
            </InfoRow>
          ))}
        </dl>
      </Card>
      <PasswordCard />
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold text-ink">Sair desta sessão</p>
          <p className="text-sm text-muted">Use num computador compartilhado antes de sair de perto.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            signOut();
            navigate("/");
          }}
        >
          <LogOut size={16} aria-hidden /> Sair da conta
        </Button>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold text-ink">Sair de todos os dispositivos</p>
            <p className="text-sm text-muted">Encerra as sessões em todos os navegadores e aparelhos, inclusive esta.</p>
          </div>
          <ConfirmButton
            title="Sair de todos os dispositivos?"
            description="Todas as sessões da sua conta serão encerradas, inclusive esta. Você vai precisar entrar de novo."
            confirmLabel="Sair de todos"
            danger
            loading={logoutAllMutation.isPending}
            onConfirm={() => logoutAllMutation.mutate()}
          >
            <MonitorSmartphone size={16} aria-hidden /> Sair de todos
          </ConfirmButton>
        </div>
        {logoutAllMutation.error && <Alert>{logoutAllMutation.error.message}</Alert>}
      </Card>
    </div>
  );
}

const PASSWORD_FIELDS = ["currentPassword", "newPassword"] as const;

function PasswordCard() {
  const { replaceSession } = useAuth();
  const { me } = useMe();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [localError, setLocalError] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setTimeout(() => setLockSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [lockSeconds]);

  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword: form.current, newPassword: form.next }),
    onSuccess: (data) => {
      replaceSession(data);
      setForm({ current: "", next: "", confirm: "" });
    },
    onError: (error) => {
      setForm((current) => ({ ...current, current: "" }));
      if (error instanceof ApiError && error.status === 429) setLockSeconds(error.retryAfter ?? 60);
    },
  });

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setLocalError(null);
    if (mutation.isSuccess || mutation.isError) mutation.reset();
    setForm((current) => ({ ...current, [field]: e.target.value }));
  };

  const strength = passwordStrength(form.next, [me?.name ?? "", me?.email ?? ""]);
  const locked = lockSeconds > 0;
  const error = mutation.error;
  const status = error instanceof ApiError ? error.status : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (form.next !== form.confirm) return setLocalError("As senhas novas não conferem.");
    if (form.next === form.current) return setLocalError("A senha nova precisa ser diferente da atual.");
    if (strength.score < 2) return setLocalError("Escolha uma senha mais forte.");
    mutation.mutate();
  }

  const errorText =
    status === 403
      ? "Senha atual incorreta."
      : status === 429
        ? null
        : error && hasUnmappedError(error, PASSWORD_FIELDS)
          ? error.message
          : null;

  return (
    <Card>
      <h2 className="text-lg font-extrabold text-ink">Trocar senha</h2>
      <p className="mt-1 text-sm text-muted">Ao trocar a senha, as sessões em outros aparelhos são encerradas. Esta continua aberta.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Senha atual" error={fieldError(error, "currentPassword")}>
          <PasswordInput required maxLength={100} autoComplete="current-password" value={form.current} onChange={set("current")} />
        </Field>
        <Field
          label="Nova senha"
          hint={form.next ? `Força: ${strength.label}${strength.tips.length > 0 ? ` · ${strength.tips.join(" ")}` : ""}` : "Entre 8 e 72 caracteres."}
          error={fieldError(error, "newPassword")}
        >
          <PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={form.next} onChange={set("next")} />
        </Field>
        <Field label="Confirmar nova senha" error={form.confirm && form.confirm !== form.next ? "As senhas não conferem." : undefined}>
          <PasswordInput required maxLength={72} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
        </Field>
        {localError && <Alert>{localError}</Alert>}
        {errorText && <Alert>{errorText}</Alert>}
        {locked && (
          <Alert type="warning">
            Muitas tentativas com a senha errada. Tente novamente em <span className="tabular font-bold">{lockSeconds} s</span>.
          </Alert>
        )}
        {mutation.isSuccess && <Alert type="success">Senha alterada. As sessões em outros aparelhos foram encerradas.</Alert>}
        <Button type="submit" loading={mutation.isPending} disabled={locked}>
          {locked ? `Aguarde ${lockSeconds} s` : "Trocar senha"}
        </Button>
      </form>
    </Card>
  );
}
