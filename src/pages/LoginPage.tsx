import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "../api/client";
import { login } from "../api/endpoints";
import { useAuth, type SignOutReason } from "../auth/AuthContext";
import AuthShell from "../components/AuthShell";
import { Alert, Button, Field, Input, PasswordInput } from "../components/ui";
import { loginThrottle, safeRedirectPath } from "../utils/security";
import { usePageTitle } from "../hooks/usePageTitle";

// Explica por que a pessoa caiu na tela de login sem ter clicado em "Sair".
const reasonMessages: Record<SignOutReason, string | null> = {
  manual: null,
  idle: "Sua sessão foi encerrada após 30 minutos sem atividade.",
  expired: "Sua sessão expirou. Entre de novo para continuar.",
  unauthorized: "Sua sessão não é mais válida. Entre de novo para continuar.",
};

export default function LoginPage() {
  usePageTitle("Entrar");
  const { signIn, isAuthenticated, lastSignOutReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: unknown; registered?: boolean } | null;
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
      if (error instanceof ApiError && (error.status === 400 || error.status === 401)) {
        loginThrottle.registerFailure();
        setLockSeconds(Math.ceil(loginThrottle.remainingMs() / 1000));
      }
      // 429: a API bloqueou novas tentativas e diz por quanto tempo (Retry-After).
      if (error instanceof ApiError && error.status === 429) {
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
  const errorText =
    mutation.error instanceof ApiError && (mutation.error.status === 400 || mutation.error.status === 401)
      ? "E-mail ou senha incorretos."
      : mutation.error instanceof ApiError && mutation.error.status === 403
        ? "Não foi possível entrar a partir desta página. Recarregue e tente de novo."
        : mutation.error?.message;

  const locked = lockSeconds > 0;

  return (
    <AuthShell eyebrow="Bem-vindo de volta" title="Entre na sua conta" subtitle="Acesse seus ingressos e pedidos.">
      <div className="space-y-4">
        {state?.registered && <Alert type="success">Conta criada. Faça login para continuar.</Alert>}
        {lastSignOutReason && reasonMessages[lastSignOutReason] && !mutation.error && (
          <Alert type="info">{reasonMessages[lastSignOutReason]}</Alert>
        )}
      </div>
      <form onSubmit={submit} className="mt-4 space-y-5">
        <Field label="E-mail">
          <Input type="email" required maxLength={254} autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha">
          <PasswordInput required maxLength={72} autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {errorText && !locked && <Alert>{errorText}</Alert>}
        {locked && (
          <Alert type="warning">
            Muitas tentativas. Tente novamente em <span className="tabular font-bold">{lockSeconds} s</span>.
          </Alert>
        )}
        <Button type="submit" size="lg" className="w-full" loading={mutation.isPending} disabled={locked}>
          {locked ? `Aguarde ${lockSeconds} s` : "Entrar"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link to="/register" state={{ from }} className="font-semibold text-accent-text hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}
