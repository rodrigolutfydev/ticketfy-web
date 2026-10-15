import { useState } from "react";
import { isGoogleLoginEnabled, startGoogleSignIn } from "../auth/google";
import { useI18n } from "../i18n/LocaleContext";
import { Alert } from "./ui";

// Botão "Entrar com o Google" no padrão visual do Google (fundo claro ou
// escuro conforme o tema, borda cinza, "G" colorido de 18 px à esquerda),
// seguido do separador "ou". Sem VITE_GOOGLE_CLIENT_ID, não aparece.
export default function GoogleSignIn({ mode, from }: { mode: "signIn" | "signUp"; from: unknown }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!isGoogleLoginEnabled()) return null;

  async function start() {
    setFailed(false);
    setPending(true);
    try {
      await startGoogleSignIn(from);
    } catch {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div>
      <button type="button" onClick={start} disabled={pending} aria-busy={pending || undefined} className="tf-google-btn">
        <span className="tf-google-btn-icon">
          {pending ? <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-current border-t-transparent" /> : <GoogleLogo />}
        </span>
        <span className="tf-google-btn-label">{mode === "signIn" ? t.google.signIn : t.google.signUp}</span>
      </button>
      {failed && (
        <div className="mt-3">
          <Alert>{t.google.startError}</Alert>
        </div>
      )}
      <div className="my-7 flex items-center gap-4 text-[13px] font-medium uppercase tracking-[0.14em] text-subtle">
        <span className="h-px flex-1 bg-line" aria-hidden />
        {t.google.or}
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>
    </div>
  );
}

export function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
