import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { errorMessage, fieldError, hasUnmappedError } from "../api/client";
import { confirmPasswordReset } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import AuthShell from "../components/AuthShell";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { Alert, Button, ButtonLink, Field, Form, PasswordInput } from "../components/ui";
import { useLockCountdown } from "../hooks/useLockCountdown";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";
import { PASSWORD_RESET_DONE, readResetToken, removeResetToken, resetLinkProblem, resetRetryAfter, type ResetLinkProblem } from "../utils/passwordReset";
import { passwordStrength } from "../utils/security";

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const r = t.resetPassword;
  usePageTitle(r.pageTitle);
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuth();
  // O token fica só na memória da tela: some da URL antes da primeira pintura.
  const [token] = useState(() => readResetToken(window.location.search));
  useLayoutEffect(() => removeResetToken(window.location, window.history), []);

  const [form, setForm] = useState({ next: "", confirm: "" });
  const [localError, setLocalError] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useLockCountdown();
  const confirmRef = useRef<HTMLInputElement>(null);

  // A API não abre sessão nova e encerra as que existiam: quem estava logado
  // neste navegador sai também, e todo mundo entra de novo pelo login.
  const mutation = useMutation({
    mutationFn: (value: string) => confirmPasswordReset(value, form.next),
    onSuccess: () => {
      setForm({ next: "", confirm: "" });
      if (isAuthenticated) signOut();
      navigate("/login", { replace: true, state: PASSWORD_RESET_DONE });
    },
    onError: (error) => setLockSeconds(resetRetryAfter(error)),
  });

  const problem = token ? resetLinkProblem(mutation.error) : "invalid";
  if (problem) return <ResetLinkProblemView problem={problem} />;

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setLocalError(null);
    if (mutation.isError) mutation.reset();
    setForm((current) => ({ ...current, [field]: e.target.value }));
  };

  const strength = passwordStrength(form.next, []);
  const locked = lockSeconds > 0;
  const error = mutation.error;
  const errorText = error && resetRetryAfter(error) === 0 && hasUnmappedError(error, ["newPassword"]) ? errorMessage(error) : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (locked || !token) return;
    if (form.next !== form.confirm) return confirmRef.current?.focus();
    if (strength.score < 2) return setLocalError(r.weak);
    mutation.mutate(token);
  }

  return (
    <AuthShell eyebrow={r.eyebrow} title={r.title} subtitle={r.subtitle} switchLink={<SignInLink />}>
      <Form onSubmit={submit} className="space-y-3.5">
        <Field label={r.next} error={fieldError(error, "newPassword")}>
          <PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={form.next} onChange={set("next")} />
        </Field>
        <Field label={r.confirm} error={form.confirm && form.confirm !== form.next ? t.password.mismatch : undefined}>
          <PasswordInput ref={confirmRef} required maxLength={72} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
        </Field>
        {form.next ? <PasswordStrengthMeter {...strength} /> : <p className="-mt-2 text-[0.8125rem] text-muted">{t.password.lengthHint}</p>}
        {localError && <Alert>{localError}</Alert>}
        {errorText && <Alert>{errorText}</Alert>}
        {locked && (
          <Alert type="warning">
            {r.lockedBefore} <span className="tabular font-bold">{t.common.seconds(lockSeconds)}</span>.
          </Alert>
        )}
        <Button type="submit" className="w-full" loading={mutation.isPending} disabled={locked}>
          {locked ? t.common.wait(lockSeconds) : r.submit}
        </Button>
      </Form>
    </AuthShell>
  );
}

// Link sem token, inválido, vencido ou já usado: não há o que salvar aqui,
// só pedir um link novo.
export function ResetLinkProblemView({ problem }: { problem: ResetLinkProblem }) {
  const { t } = useI18n();
  const r = t.resetPassword;
  return (
    <AuthShell eyebrow={r.eyebrow} title={r.linkTitle[problem]} subtitle={r.linkText[problem]} switchLink={<SignInLink />}>
      <div className="space-y-3">
        <ButtonLink to="/forgot-password" className="w-full">
          {r.requestNew}
        </ButtonLink>
        <ButtonLink to="/login" variant="ghost" className="w-full">
          {r.backToLogin}
        </ButtonLink>
      </div>
    </AuthShell>
  );
}

function SignInLink() {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-2.5 text-muted">
      <span className="hidden sm:inline">{t.forgotPassword.remembered}</span>
      <Link to="/login" className="whitespace-nowrap font-semibold text-ink rounded-lg bg-white/[0.07] px-3 py-1.5 transition-colors hover:bg-white/[0.12]">
        {t.forgotPassword.signIn}
      </Link>
    </span>
  );
}
