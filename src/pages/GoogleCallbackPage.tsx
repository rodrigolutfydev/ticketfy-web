import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, errorMessage } from "../api/client";
import { loginWithGoogle } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { consumeGoogleCallback, GOOGLE_CALLBACK_PATH, isGoogleLoginEnabled, startGoogleSignIn, type GoogleCallbackError } from "../auth/google";
import { LogoMark } from "../components/Logo";
import NeonSign from "../components/NeonSign";
import { Button, buttonClass } from "../components/ui";
import { usePageTitle } from "../hooks/usePageTitle";
import { useI18n } from "../i18n/LocaleContext";
import { loginThrottle } from "../utils/security";

type Failure = { from: string } & ({ kind: "local"; error: GoogleCallbackError } | { kind: "api"; error: unknown });

export default function GoogleCallbackPage() {
  const { t } = useI18n();
  usePageTitle(t.google.pageTitle);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const result = consumeGoogleCallback({ search: window.location.search, origin: window.location.origin });
    navigate(GOOGLE_CALLBACK_PATH, { replace: true });
    if (!result.ok) {
      setFailure({ kind: "local", error: result.error, from: result.from });
      return;
    }
    loginWithGoogle({ code: result.code, codeVerifier: result.codeVerifier, redirectUri: result.redirectUri })
      .then((data) => {
        loginThrottle.registerSuccess();
        signIn(data);
        navigate(result.from, { replace: true });
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.problemType === "too-many-login-attempts") loginThrottle.lockFor(error.retryAfter ?? 60);
        setFailure({ kind: "api", error, from: result.from });
      });
  }, [navigate, signIn]);

  if (failure) {
    const message = failure.kind === "local" ? t.google.errors[failure.error] : errorMessage(failure.error) ?? t.google.errors["missing-code"];
    const retry = async () => {
      setRetrying(true);
      try {
        await startGoogleSignIn(failure.from);
      } catch {
        setRetrying(false);
      }
    };
    return (
      <main id="conteudo" className="flex min-h-screen items-center justify-center p-4 sm:p-10">
        <div className="w-full max-w-[880px]">
          <NeonSign
            word={t.look.neon.error}
            title={t.google.errorTitle}
            hint={<span role="alert">{message}</span>}
            compact
            wordSize="text-[clamp(64px,17vw,200px)]"
          >
            {isGoogleLoginEnabled() && (
              <Button size="lg" loading={retrying} onClick={retry}>
                {t.google.retry}
              </Button>
            )}
            <Link to="/login" state={{ from: failure.from }} className={buttonClass("secondary", "lg")}>
              {t.google.backToLogin}
            </Link>
          </NeonSign>
        </div>
      </main>
    );
  }

  return (
    <main id="conteudo" className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <div className="tf-topglow pointer-events-none absolute inset-x-0 top-0 h-[480px]" aria-hidden />
      <div className="relative" aria-hidden>
        <div className="tf-paper tf-cut-y tf-auth-ticket tf-signing-ticket -rotate-[4deg]">
          <div className="flex items-center justify-between px-5 pt-4 text-[11px] font-bold tracking-[0.18em]">
            <span className="text-accent-text">{t.look.auth.ticketTop}</span>
            <span className="tf-pulse text-accent-text">●</span>
          </div>
          <div className="flex h-[96px] items-center justify-center">
            <LogoMark size={72} />
          </div>
          <div className="flex h-[84px] items-center justify-center px-5">
            <span className="tf-signing-bar" />
          </div>
          <span className="tf-holo" />
        </div>
      </div>
      <div className="relative mt-10 max-w-md" role="status" aria-live="polite">
        <h1 className="font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.04em] text-ink">{t.google.loadingTitle}</h1>
        <p className="mt-3 text-muted">{t.google.loadingText}</p>
      </div>
    </main>
  );
}
