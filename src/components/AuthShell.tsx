import type { ReactNode } from "react";
import { Link } from "react-router";
import { useI18n } from "../i18n/LocaleContext";
import LanguageSwitcher from "./LanguageSwitcher";
import Logo from "./Logo";

// "Porta de entrada": tela dividida. À esquerda, o formulário; à direita
// (só no computador), a foto do palco em laranja com a frase da marca.
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="tf-topglow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden />
      <div className="relative flex flex-col">
        <div className="flex h-[84px] items-center justify-between gap-3 px-4 sm:px-10">
          <Logo />
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to="/" className="hidden text-sm font-medium text-muted transition-colors hover:text-accent-text sm:inline">
              {t.authShell.backHome}
            </Link>
          </div>
        </div>
        <main id="conteudo" className="flex flex-1 items-center justify-center px-4 pb-20 pt-10 sm:px-10">
          <div className="w-full max-w-[440px]">
            <div className="mb-8 flex flex-col gap-2.5">
              <p className="eyebrow">{eyebrow}</p>
              <h1 className="text-[clamp(1.875rem,3.4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink">{title}</h1>
              <p className="text-muted">{subtitle}</p>
            </div>
            {children}
          </div>
        </main>
      </div>

      <aside className="tf-auth-art sticky top-10 my-10 mr-10 hidden h-[calc(100vh-80px)] min-h-[520px] self-start lg:block" aria-hidden>
        <p className="absolute inset-x-9 bottom-8 font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.04em]">
          {t.look.auth.quoteTop} <span className="text-accent">{t.look.auth.quoteAccent}</span>
        </p>
      </aside>
    </div>
  );
}
