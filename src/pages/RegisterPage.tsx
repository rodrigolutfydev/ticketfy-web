import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { login, register } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import AuthShell from "../components/AuthShell";
import { Alert, Button, Field, Input, PasswordInput } from "../components/ui";
import { passwordStrength, safeRedirectPath } from "../utils/security";
import { usePageTitle } from "../hooks/usePageTitle";

export default function RegisterPage() {
  usePageTitle("Criar conta");
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeRedirectPath((location.state as { from?: unknown } | null)?.from);

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [localError, setLocalError] = useState<string | null>(null);

  // Cadastra e já faz login, para o usuário não digitar a senha duas vezes.
  const mutation = useMutation({
    mutationFn: async () => {
      const data = { name: form.name.trim(), email: form.email.trim(), password: form.password };
      await register(data);
      return login({ email: data.email, password: data.password });
    },
    onSuccess: (data) => {
      setForm({ name: "", email: "", password: "", confirm: "" });
      signIn(data.token);
      navigate(from, { replace: true });
    },
  });

  if (isAuthenticated && !mutation.isSuccess) return <Navigate to="/" replace />;

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setLocalError(null);
    setForm((current) => ({ ...current, [field]: e.target.value }));
  };

  const strength = passwordStrength(form.password, [form.name, form.email]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) return setLocalError("As senhas não conferem.");
    if (strength.score < 2) return setLocalError("Escolha uma senha mais forte. Veja as dicas abaixo do campo.");
    mutation.mutate();
  }

  return (
    <AuthShell eyebrow="Comece agora" title="Crie sua conta" subtitle="Leva menos de um minuto.">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Nome">
          <Input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="E-mail">
          <Input type="email" required maxLength={254} autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Senha" hint="Entre 8 e 72 caracteres.">
          <PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={set("password")} />
        </Field>
        {form.password && <StrengthMeter {...strength} />}
        <Field label="Confirmar senha" error={form.confirm && form.confirm !== form.password ? "As senhas não conferem." : undefined}>
          <PasswordInput required maxLength={72} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
        </Field>
        {(localError || mutation.error) && <Alert>{localError ?? mutation.error?.message}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
          Criar conta
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link to="/login" state={{ from }} className="font-semibold text-accent-text hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}

// Barra de força da senha: 4 segmentos que acendem conforme a pontuação.
function StrengthMeter({ score, label, tips }: ReturnType<typeof passwordStrength>) {
  const color = score <= 1 ? "bg-danger" : score === 2 ? "bg-warning" : "bg-success";
  return (
    <div className="-mt-2" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={`h-1.5 flex-1 rounded-full ${score >= step ? color : "bg-raised"}`} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        Força: <span className="font-semibold text-ink">{label}</span>
        {tips.length > 0 && ` · ${tips.join(" ")}`}
      </p>
    </div>
  );
}
