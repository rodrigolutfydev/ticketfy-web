import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "../api/client";
import { login } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/LocaleContext";
import AuthShell from "../components/AuthShell";
import GoogleSignIn from "../components/GoogleSignIn";
import { Alert, Button, Field, Form, Input, PasswordInput } from "../components/ui";
import { accountSuspendedMessage, loginErrorMessage } from "../utils/account";
import { loginThrottle, safeRedirectPath } from "../utils/security";
import { usePageTitle } from "../hooks/usePageTitle";

export default function LoginPage() {
  const { t } = useI18n();
  usePageTitle(t.login.pageTitle);
  const { signIn, isAuthenticated, lastSignOutReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: unknown; registered?: boolean; passwordReset?: boolean } | null;
  // Para onde voltar depois de entrar. safeRedirectPath garante que é uma
  // página do próprio site (nada de redirecionar para um domínio externo).
  const from = safeRedirectPath(state?.from);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lockSeconds, setLockSeconds] = useState(() => Math.ceil(loginThrottle.remainingMs() / 1000));

  // Contagem regressiva do bloqueio de tentativas.
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setInterval(() => setLockSeconds(Math.ceil(loginThrottle.remainingMs() / 1000)), 1000);
    return () => clearInterval(timer);
  }, [lockSeconds]);

  const mutation = useMutation({
    mutationFn: () => login({ email: email.trim(), password }),
    onSuccess: (data) => {
      loginThrottle.registerSuccess();
      setPassword(""); // não deixa a senha parada na memória do componente
      signIn(data);
      navigate(from, { replace: true });
    },
    onError: (error) => {
      // Só conta como tentativa errada se a API recusou as credenciais.
      if (error instanceof ApiError && (error.problemType === "invalid-credentials" || error.problemType === "validation-failed")) {
        loginThrottle.registerFailure();
        setLockSeconds(Math.ceil(loginThrottle.remainingMs() / 1000));
      }
      // too-many-login-attempts: a API bloqueou novas tentativas e diz por quanto tempo (Retry-After).
      if (error instanceof ApiError && error.problemType === "too-many-login-attempts") {
        loginThrottle.lockFor(error.retryAfter ?? 60);
        setLockSeconds(Math.ceil(loginThrottle.remainingMs() / 1000));
      }
      setPassword("");
    },
  });

  if (isAuthenticated && !mutation.isSuccess) return <Navigate to={from} replace />;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (loginThrottle.remainingMs() > 0) return;
    mutation.mutate();
  }

  // Mensagem genérica para credenciais erradas: não revela se o e-mail
  // existe (isso ajudaria alguém a descobrir quem tem conta no site).
  const errorText = loginErrorMessage(mutation.error);

  const locked = lockSeconds > 0;
  const signOutMessage =
    lastSignOutReason === "suspended"
      ? accountSuspendedMessage()
      : lastSignOutReason && lastSignOutReason !== "manual"
        ? t.login.signOutReasons[lastSignOutReason]
        : null;

  return (
    <AuthShell
      eyebrow={t.login.eyebrow}
      title={t.login.title}
      subtitle={t.login.subtitle}
      switchLink={
        <span className="flex items-center gap-2.5 text-muted">
          <span className="hidden sm:inline">{t.login.noAccount}</span>
          <Link to="/register" state={{ from }} className="whitespace-nowrap font-semibold text-ink rounded-lg bg-white/[0.07] px-3 py-1.5 transition-colors hover:bg-white/[0.12]">
            {t.login.createAccount}
          </Link>
        </span>
      }
    >
      {(state?.registered || state?.passwordReset || (signOutMessage && !mutation.error)) && (
        <div className="mb-6 space-y-4">
          {state?.registered && <Alert type="success">{t.login.registered}</Alert>}
          {state?.passwordReset && <Alert type="success">{t.login.passwordReset}</Alert>}
          {signOutMessage && !mutation.error && <Alert type="info">{signOutMessage}</Alert>}
        </div>
      )}
      <GoogleSignIn mode="signIn" from={from} />
      <Form onSubmit={submit} className="space-y-4">
        <Field label={t.login.email}>
          <Input type="email" required maxLength={254} autoComplete="email" inputMode="email" placeholder={t.login.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t.login.password}>
          <PasswordInput required maxLength={72} autoComplete="current-password" placeholder={t.login.passwordPlaceholder} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="-mt-1.5 flex justify-end">
          <Link
            to="/forgot-password"
            state={{ email: email.trim(), from }}
            className="rounded-md text-[0.8125rem] font-medium text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {t.login.forgot}
          </Link>
        </div>
        {errorText && !locked && <Alert>{errorText}</Alert>}
        {locked && (
          <Alert type="warning">
            {t.login.lockedBefore} <span className="tabular font-bold">{t.common.seconds(lockSeconds)}</span>.
          </Alert>
        )}
        <Button type="submit" className="w-full" loading={mutation.isPending} disabled={locked}>
          {locked ? t.common.wait(lockSeconds) : t.login.submit}
        </Button>
      </Form>
    </AuthShell>
  );
}
