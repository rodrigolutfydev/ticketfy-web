import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { errorMessage, fieldError, hasUnmappedError } from "../api/client";
import { requestPasswordReset } from "../api/endpoints";
import AuthShell from "../components/AuthShell";
import { Alert, Button, ButtonLink, Field, Form, Input } from "../components/ui";
import { useLockCountdown } from "../hooks/useLockCountdown";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";
import { resetRetryAfter } from "../utils/passwordReset";
import { safeRedirectPath } from "../utils/security";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const f = t.forgotPassword;
  usePageTitle(f.pageTitle);
  const location = useLocation();
  const state = location.state as { email?: unknown; from?: unknown } | null;
  const from = safeRedirectPath(state?.from);
  const [email, setEmail] = useState(typeof state?.email === "string" ? state.email.trim().slice(0, 254) : "");
  const [lockSeconds, setLockSeconds] = useLockCountdown();

  // A API responde 202 exista a conta ou não; a tela repete isso e mostra
  // sempre o mesmo texto, sem dizer se o e-mail tem cadastro.
  const mutation = useMutation({
    mutationFn: () => requestPasswordReset(email.trim()),
    onError: (error) => setLockSeconds(resetRetryAfter(error)),
  });

  const locked = lockSeconds > 0;
  const error = mutation.error;
  const errorText = error && resetRetryAfter(error) === 0 && hasUnmappedError(error, ["email"]) ? errorMessage(error) : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    mutation.mutate();
  }

  return (
    <AuthShell
      eyebrow={f.eyebrow}
      title={f.title}
      subtitle={f.subtitle}
      switchLink={
        <span className="flex items-center gap-2.5 text-muted">
          <span className="hidden sm:inline">{f.remembered}</span>
          <Link to="/login" state={{ from }} className="whitespace-nowrap font-semibold text-ink rounded-lg bg-white/[0.07] px-3 py-1.5 transition-colors hover:bg-white/[0.12]">
            {f.signIn}
          </Link>
        </span>
      }
    >
      {mutation.isSuccess ? (
        <ForgotPasswordSent
          onOtherEmail={() => {
            mutation.reset();
            setEmail("");
          }}
          from={from}
        />
      ) : (
        <Form onSubmit={submit} className="space-y-4">
          <Field label={f.email} error={fieldError(error, "email")}>
            <Input
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              inputMode="email"
              placeholder={t.login.emailPlaceholder}
              value={email}
              onChange={(e) => {
                if (mutation.isError) mutation.reset();
                setEmail(e.target.value);
              }}
            />
          </Field>
          {errorText && <Alert>{errorText}</Alert>}
          {locked && (
            <Alert type="warning">
              {f.lockedBefore} <span className="tabular font-bold">{t.common.seconds(lockSeconds)}</span>.
            </Alert>
          )}
          <Button type="submit" className="w-full" loading={mutation.isPending} disabled={locked}>
            {locked ? t.common.wait(lockSeconds) : f.submit}
          </Button>
          <p className="text-center text-[0.8125rem] leading-relaxed text-subtle">{f.googleHint}</p>
        </Form>
      )}
    </AuthShell>
  );
}

export function ForgotPasswordSent({ onOtherEmail, from }: { onOtherEmail: () => void; from: string }) {
  const { t } = useI18n();
  const f = t.forgotPassword;
  return (
    <div className="space-y-4">
      <Alert type="success">{f.sent}</Alert>
      <ButtonLink to="/login" state={{ from }} className="w-full">
        {f.backToLogin}
      </ButtonLink>
      <Button variant="ghost" className="w-full" onClick={onOtherEmail}>
        {f.otherEmail}
      </Button>
    </div>
  );
}
