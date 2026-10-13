import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { errorMessage, fieldError, hasUnmappedError } from "../api/client";
import { login, register } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/LocaleContext";
import AuthShell from "../components/AuthShell";
import { Alert, Button, Field, Input, PasswordInput } from "../components/ui";
import { passwordStrength, safeRedirectPath } from "../utils/security";
import { usePageTitle } from "../hooks/usePageTitle";

const REGISTER_FIELDS = ["name", "email", "password"] as const;

export default function RegisterPage() {
  const { t, locale } = useI18n();
  usePageTitle(t.register.pageTitle);
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
      await register({ ...data, language: locale });
      return login({ email: data.email, password: data.password });
    },
    onSuccess: (data) => {
      setForm({ name: "", email: "", password: "", confirm: "" });
      signIn(data);
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
    if (form.password !== form.confirm) return setLocalError(t.password.mismatch);
    if (strength.score < 2) return setLocalError(t.register.weak);
    mutation.mutate();
  }

  return (
    <AuthShell eyebrow={t.register.eyebrow} title={t.register.title} subtitle={t.register.subtitle}>
      <form onSubmit={submit} className="space-y-5">
        <Field label={t.register.name} error={fieldError(mutation.error, "name")}>
          <Input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={set("name")} />
        </Field>
        <Field label={t.register.email} error={fieldError(mutation.error, "email")}>
          <Input type="email" required maxLength={254} autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label={t.register.password} hint={t.password.lengthHint} error={fieldError(mutation.error, "password")}>
          <PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={set("password")} />
        </Field>
        {form.password && <StrengthMeter {...strength} />}
        <Field label={t.register.confirm} error={form.confirm && form.confirm !== form.password ? t.password.mismatch : undefined}>
          <PasswordInput required maxLength={72} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
        </Field>
        {localError && <Alert>{localError}</Alert>}
        {!localError && mutation.error && hasUnmappedError(mutation.error, REGISTER_FIELDS) && <Alert>{errorMessage(mutation.error)}</Alert>}
        <p className="text-xs text-muted">
          {t.legal.registerConsent.before}
          <Link to="/terms" target="_blank" className="font-semibold text-accent-text hover:underline">
            {t.legal.registerConsent.terms}
          </Link>
          {t.legal.registerConsent.middle}
          <Link to="/privacy" target="_blank" className="font-semibold text-accent-text hover:underline">
            {t.legal.registerConsent.privacy}
          </Link>
          {t.legal.registerConsent.after}
        </p>
        <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
          {t.register.submit}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        {t.register.haveAccount}{" "}
        <Link to="/login" state={{ from }} className="font-semibold text-accent-text hover:underline">
          {t.register.signIn}
        </Link>
      </p>
    </AuthShell>
  );
}

// Barra de força da senha: 4 segmentos que acendem conforme a pontuação.
function StrengthMeter({ score, tips }: ReturnType<typeof passwordStrength>) {
  const { t } = useI18n();
  const color = score <= 1 ? "bg-danger" : score === 2 ? "bg-warning" : "bg-success";
  return (
    <div className="-mt-2" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={`h-1.5 flex-1 rounded-full ${score >= step ? color : "bg-raised"}`} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {t.password.strength}: <span className="font-semibold text-ink">{t.password.levels[score]}</span>
        {tips.length > 0 && ` · ${tips.map((tip) => t.password.tips[tip]).join(" ")}`}
      </p>
    </div>
  );
}
