import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { errorMessage, fieldError, hasUnmappedError } from "../api/client";
import { login, register } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/LocaleContext";
import AuthShell from "../components/AuthShell";
import { showFlash } from "../components/FlashNotice";
import GoogleSignIn from "../components/GoogleSignIn";
import { Alert, Button, Field, Form, Input, PasswordInput } from "../components/ui";
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
  const confirmRef = useRef<HTMLInputElement>(null);

  // Cadastra e já faz login, para o usuário não digitar a senha duas vezes.
  const mutation = useMutation({
    mutationFn: async () => {
      const data = { name: form.name.trim(), email: form.email.trim(), password: form.password };
      await register({ ...data, language: locale });
      return login({ email: data.email, password: data.password });
    },
    onSuccess: (data) => {
      showFlash(t.layout.flash.welcome(form.name.trim().split(/\s+/)[0] || null), from);
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
    if (form.password !== form.confirm) return confirmRef.current?.focus();
    if (strength.score < 2) return setLocalError(t.register.weak);
    mutation.mutate();
  }

  return (
    <AuthShell
      eyebrow={t.register.eyebrow}
      title={t.register.title}
      subtitle={t.register.subtitle}
      switchLink={
        <span className="flex items-center gap-2.5 text-muted">
          <span className="hidden sm:inline">{t.register.haveAccount}</span>
          <Link to="/login" state={{ from }} className="whitespace-nowrap font-semibold text-ink rounded-lg bg-white/[0.07] px-3 py-1.5 transition-colors hover:bg-white/[0.12]">
            {t.register.signIn}
          </Link>
        </span>
      }
    >
      <GoogleSignIn mode="signUp" from={from} />
      <Form onSubmit={submit} className="space-y-3.5">
        <Field label={t.register.name} error={fieldError(mutation.error, "name")}>
          <Input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={set("name")} />
        </Field>
        <Field label={t.register.email} error={fieldError(mutation.error, "email")}>
          <Input type="email" required maxLength={254} autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} />
        </Field>
        <div className="grid items-start gap-3.5 sm:gap-4 sm:grid-cols-2">
          <Field label={t.register.password} error={fieldError(mutation.error, "password")}>
            <PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={set("password")} />
          </Field>
          <Field label={t.register.confirm} error={form.confirm && form.confirm !== form.password ? t.password.mismatch : undefined}>
            <PasswordInput ref={confirmRef} required maxLength={72} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
          </Field>
        </div>
        {form.password ? <StrengthMeter {...strength} /> : <p className="-mt-2 text-[0.8125rem] text-muted">{t.password.lengthHint}</p>}
        {localError && <Alert>{localError}</Alert>}
        {!localError && mutation.error && hasUnmappedError(mutation.error, REGISTER_FIELDS) && <Alert>{errorMessage(mutation.error)}</Alert>}
        <Button type="submit" className="w-full" loading={mutation.isPending}>
          {t.register.submit}
        </Button>
        <p className="text-center text-xs leading-relaxed text-subtle">
          {t.legal.registerConsent.before}
          <Link to="/terms" target="_blank" className="font-semibold text-ink underline-offset-4 hover:underline">
            {t.legal.registerConsent.terms}
          </Link>
          {t.legal.registerConsent.middle}
          <Link to="/privacy" target="_blank" className="font-semibold text-ink underline-offset-4 hover:underline">
            {t.legal.registerConsent.privacy}
          </Link>
          {t.legal.registerConsent.after}
        </p>
      </Form>
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
