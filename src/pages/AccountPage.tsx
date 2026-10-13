import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, errorMessage, fieldError, hasUnmappedError } from "../api/client";
import { changePassword, deleteAccount, exportMyData, logoutAll, updateAvatar } from "../api/endpoints";
import { saveBlob } from "../utils/download";
import type { UserProfile } from "../api/types";
import Avatar from "../components/Avatar";
import { passwordStrength, safeImageUrl } from "../utils/security";
import { BadgeCheck, Check, Clock, Download, KeyRound, Languages, Lock, LogOut, Mail, MonitorSmartphone, ShieldCheck, Timer, Trash2, UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import BackendNotice from "../components/BackendNotice";
import BecomeOrganizer from "../components/BecomeOrganizer";
import { ConfirmButton } from "../components/ConfirmDialog";
import { ErrorMessage, Loading } from "../components/StateMessage";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { Alert, Button, ButtonLink, Card, Field, InfoRow, Input, PageTitle, PasswordInput } from "../components/ui";
import { formatTime } from "../utils/format";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";
import { LOCALES } from "../i18n/locale";

const TABS = ["perfil", "seguranca", "organizador", "privacidade"] as const;

export default function AccountPage() {
  const { t } = useI18n();
  usePageTitle(t.account.pageTitle);
  const [tab, setTab] = useTabParam(TABS, "perfil");
  const { me, isLoading, error, endpointMissing } = useMe();

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t.account.title} />
      <Tabs
        label={t.account.tabsLabel}
        idPrefix="conta"
        value={tab}
        onChange={setTab}
        items={[
          { key: "perfil", label: t.account.tabs.profile, icon: <UserRound size={16} /> },
          { key: "seguranca", label: t.account.tabs.security, icon: <ShieldCheck size={16} /> },
          { key: "organizador", label: t.account.tabs.organizer, icon: <BadgeCheck size={16} /> },
          { key: "privacidade", label: t.buyer.privacy.tab, icon: <Lock size={16} /> },
        ]}
      />
      <TabPanel idPrefix="conta" activeKey={tab}>
        {tab !== "seguranca" && tab !== "privacidade" && isLoading && <Loading />}
        {tab !== "seguranca" && tab !== "privacidade" && endpointMissing && (
          <BackendNotice title={t.account.profileUnavailable}>
            <p>{t.account.profileUnavailableText}</p>
          </BackendNotice>
        )}
        {tab !== "seguranca" && tab !== "privacidade" && error && !endpointMissing && <ErrorMessage message={errorMessage(error) ?? ""} />}

        {tab === "privacidade" && <PrivacyTab />}

        {tab === "perfil" && me && (
          <div className="space-y-5">
            <ProfileTab me={me} />
            <LanguageCard />
          </div>
        )}

        {tab === "seguranca" && <SecurityTab />}

        {tab === "organizador" && me && (
          <Card>
            {me.role === "USER" ? (
              <>
                <h2 className="mb-5 text-lg font-extrabold text-ink">{t.account.wantToSell}</h2>
                <BecomeOrganizer />
              </>
            ) : (
              <>
                <h2 className="text-lg font-extrabold text-ink">{t.account.isOrganizer}</h2>
                <p className="mb-5 mt-1 text-muted">{t.account.isOrganizerText}</p>
                <ButtonLink to="/organizer">{t.account.openOrganizer}</ButtonLink>
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
function LanguageCard() {
  const { locale, t, changeLocale, saving, saveError } = useI18n();
  const [changed, setChanged] = useState(false);
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
        <Languages size={18} className="text-accent-text" aria-hidden /> {t.language.accountTitle}
      </h2>
      <p className="mt-1 text-sm text-muted">{t.language.accountHint}</p>
      <div role="radiogroup" aria-label={t.language.label} className="mt-5 grid gap-3 sm:grid-cols-2">
        {LOCALES.map((option) => {
          const selected = option === locale;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              lang={option}
              disabled={saving}
              onClick={() => {
                setChanged(true);
                changeLocale(option);
              }}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left font-semibold transition-colors disabled:cursor-wait ${
                selected ? "border-accent bg-accent/5 text-ink" : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              {t.language.names[option]}
              {selected && <Check size={18} className="text-accent-text" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="mt-4" aria-live="polite">
        {saveError && <Alert>{t.language.saveError}</Alert>}
        {changed && !saving && !saveError && <Alert type="success">{t.language.saved}</Alert>}
      </div>
    </Card>
  );
}

function ProfileTab({ me }: { me: UserProfile }) {
  const { t } = useI18n();
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
          <p className="mt-1 text-muted">{t.labels.roles[me.role] ?? me.role}</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4 border-t border-line pt-8">
        <Field
          label={t.account.photo}
          hint={t.account.photoHint}
          error={invalid ? t.account.photoInvalid : fieldError(mutation.error, "avatarUrl")}
        >
          <Input type="url" inputMode="url" maxLength={500} placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        {mutation.error && hasUnmappedError(mutation.error, ["avatarUrl"]) && <Alert>{errorMessage(mutation.error)}</Alert>}
        {mutation.isSuccess && !changed && <Alert type="success">{t.account.photoSaved}</Alert>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={mutation.isPending && mutation.variables !== ""} disabled={invalid || !changed || mutation.isPending}>
            {t.account.savePhoto}
          </Button>
          {me.avatarUrl && (
            <Button variant="ghost" loading={mutation.isPending && mutation.variables === ""} disabled={mutation.isPending} onClick={() => mutation.mutate("")}>
              <Trash2 size={16} aria-hidden /> {t.account.removePhoto}
            </Button>
          )}
        </div>
      </form>

      <dl className="mt-8 grid gap-5 border-t border-line pt-8 sm:grid-cols-2">
        <InfoRow icon={<Mail size={18} />} label={t.account.email}>
          <span className="break-all">{me.email}</span>
        </InfoRow>
        <InfoRow icon={<BadgeCheck size={18} />} label={t.account.role}>
          {t.labels.roles[me.role] ?? me.role}
        </InfoRow>
      </dl>
    </Card>
  );
}

function SecurityTab() {
  const { t, locale } = useI18n();
  const s = t.account.security;
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
    { icon: <MonitorSmartphone size={18} />, label: s.sessionLabel, text: s.sessionText },
    { icon: <Timer size={18} />, label: s.idleLabel, text: s.idleText },
    {
      icon: <Clock size={18} />,
      label: s.validityLabel,
      text: expiresAt ? s.validityText(formatTime(new Date(expiresAt).toISOString(), locale)) : s.noSession,
    },
    { icon: <KeyRound size={18} />, label: s.passwordLabel, text: s.passwordText },
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
          <p className="font-bold text-ink">{s.signOutTitle}</p>
          <p className="text-sm text-muted">{s.signOutText}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            signOut();
            navigate("/");
          }}
        >
          <LogOut size={16} aria-hidden /> {s.signOut}
        </Button>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold text-ink">{s.signOutAllTitle}</p>
            <p className="text-sm text-muted">{s.signOutAllText}</p>
          </div>
          <ConfirmButton
            title={s.signOutAllConfirmTitle}
            description={s.signOutAllConfirmText}
            confirmLabel={s.signOutAll}
            danger
            loading={logoutAllMutation.isPending}
            onConfirm={() => logoutAllMutation.mutate()}
          >
            <MonitorSmartphone size={16} aria-hidden /> {s.signOutAll}
          </ConfirmButton>
        </div>
        {logoutAllMutation.error && <Alert>{errorMessage(logoutAllMutation.error)}</Alert>}
      </Card>
    </div>
  );
}

const PASSWORD_FIELDS = ["currentPassword", "newPassword"] as const;

function PasswordCard() {
  const { t } = useI18n();
  const p = t.account.passwordCard;
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
      if (error instanceof ApiError && error.problemType === "too-many-password-attempts") setLockSeconds(error.retryAfter ?? 60);
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
  const problemType = error instanceof ApiError ? error.problemType : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (form.next !== form.confirm) return setLocalError(p.newMismatch);
    if (form.next === form.current) return setLocalError(p.sameAsCurrent);
    if (strength.score < 2) return setLocalError(p.weak);
    mutation.mutate();
  }

  const errorText =
    problemType === "invalid-password"
      ? errorMessage(error, "password-change")
      : problemType === "too-many-password-attempts"
        ? null
        : error && hasUnmappedError(error, PASSWORD_FIELDS)
          ? errorMessage(error)
          : null;

  return (
    <Card>
      <h2 className="text-lg font-extrabold text-ink">{p.title}</h2>
      <p className="mt-1 text-sm text-muted">{p.text}</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label={p.current} error={fieldError(error, "currentPassword")}>
          <PasswordInput required maxLength={100} autoComplete="current-password" value={form.current} onChange={set("current")} />
        </Field>
        <Field
          label={p.next}
          hint={
            form.next
              ? `${t.password.strength}: ${t.password.levels[strength.score]}${
                  strength.tips.length > 0 ? ` · ${strength.tips.map((tip) => t.password.tips[tip]).join(" ")}` : ""
                }`
              : t.password.lengthHint
          }
          error={fieldError(error, "newPassword")}
        >
          <PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={form.next} onChange={set("next")} />
        </Field>
        <Field label={p.confirm} error={form.confirm && form.confirm !== form.next ? t.password.mismatch : undefined}>
          <PasswordInput required maxLength={72} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
        </Field>
        {localError && <Alert>{localError}</Alert>}
        {errorText && <Alert>{errorText}</Alert>}
        {locked && (
          <Alert type="warning">
            {p.lockedBefore} <span className="tabular font-bold">{t.common.seconds(lockSeconds)}</span>.
          </Alert>
        )}
        {mutation.isSuccess && <Alert type="success">{p.success}</Alert>}
        <Button type="submit" loading={mutation.isPending} disabled={locked}>
          {locked ? t.common.wait(lockSeconds) : p.submit}
        </Button>
      </form>
    </Card>
  );
}

function useLockCountdown() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds] as const;
}

function PrivacyTab() {
  return (
    <div className="space-y-5">
      <ExportCard />
      <DeleteAccountCard />
    </div>
  );
}

function ExportCard() {
  const { t } = useI18n();
  const p = t.buyer.privacy;
  const [password, setPassword] = useState("");
  const [lockSeconds, setLockSeconds] = useLockCountdown();
  const mutation = useMutation({
    mutationFn: () => exportMyData(password),
    onSuccess: ({ blob, filename }) => {
      saveBlob(blob, filename ?? "ticketfy-data.json");
      setPassword("");
    },
    onError: (error) => {
      setPassword("");
      if (error instanceof ApiError && error.problemType === "too-many-password-attempts") setLockSeconds(error.retryAfter ?? 60);
    },
  });
  const error = mutation.error;
  const problemType = error instanceof ApiError ? error.problemType : null;
  const locked = lockSeconds > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!locked && password) mutation.mutate();
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
        <Download size={18} className="text-accent-text" aria-hidden /> {p.exportTitle}
      </h2>
      <p className="mt-1 text-sm text-muted">{p.exportText}</p>
      <p className="mt-1 text-xs text-subtle">{p.exportLimit(3, 24)}</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label={p.password} error={problemType === "invalid-password" ? errorMessage(error) ?? undefined : fieldError(error, "password")}>
          <PasswordInput required maxLength={100} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && problemType !== "invalid-password" && problemType !== "too-many-password-attempts" && hasUnmappedError(error, ["password"]) && (
          <Alert>{errorMessage(error)}</Alert>
        )}
        {locked && (
          <Alert type="warning">
            {p.lockedBefore} <span className="tabular font-bold">{t.common.seconds(lockSeconds)}</span>.
          </Alert>
        )}
        {mutation.isSuccess && <Alert type="success">{p.exported}</Alert>}
        <Button type="submit" variant="secondary" loading={mutation.isPending} disabled={locked}>
          <Download size={16} aria-hidden /> {locked ? t.common.wait(lockSeconds) : p.exportSubmit}
        </Button>
      </form>
    </Card>
  );
}

function DeleteAccountCard() {
  const { t } = useI18n();
  const p = t.buyer.privacy;
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useLockCountdown();
  const word = p.confirmationWord;

  const mutation = useMutation({
    mutationFn: () => deleteAccount(password, confirmation),
    onSuccess: () => {
      navigate("/account-deleted", { replace: true });
      signOut("manual", { notifyServer: false });
    },
    onError: (error) => {
      setPassword("");
      if (error instanceof ApiError && error.problemType === "too-many-password-attempts") setLockSeconds(error.retryAfter ?? 60);
    },
  });
  const error = mutation.error;
  const problemType = error instanceof ApiError ? error.problemType : null;
  const locked = lockSeconds > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (confirmation !== word) return setLocalError(p.confirmationMismatch(word));
    setLocalError(null);
    mutation.mutate();
  }

  const confirmationError = localError ?? (fieldError(error, "confirmation") ? p.confirmationMismatch(word) : undefined);

  return (
    <Card className="border-danger/35">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
        <Trash2 size={18} className="text-danger" aria-hidden /> {p.deleteTitle}
      </h2>
      <p className="mt-1 text-sm text-muted">{p.deleteText}</p>
      <p className="mt-2 text-sm text-muted">{p.deleteBlockers}</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label={p.password} error={problemType === "invalid-password" ? errorMessage(error) ?? undefined : fieldError(error, "password")}>
          <PasswordInput required maxLength={100} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label={p.confirmation(word)} error={confirmationError}>
          <Input
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            value={confirmation}
            onChange={(e) => {
              setLocalError(null);
              setConfirmation(e.target.value);
            }}
          />
        </Field>
        {error && problemType !== "invalid-password" && problemType !== "too-many-password-attempts" && hasUnmappedError(error, ["password", "confirmation"]) && (
          <Alert>{errorMessage(error)}</Alert>
        )}
        {locked && (
          <Alert type="warning">
            {p.lockedBefore} <span className="tabular font-bold">{t.common.seconds(lockSeconds)}</span>.
          </Alert>
        )}
        <p className="text-xs text-subtle">{p.irreversible}</p>
        <Button type="submit" variant="danger" loading={mutation.isPending} disabled={locked}>
          <Trash2 size={16} aria-hidden /> {locked ? t.common.wait(lockSeconds) : p.deleteSubmit}
        </Button>
      </form>
    </Card>
  );
}
