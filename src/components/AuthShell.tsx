import type { ReactNode } from "react";
import { Link } from "react-router";
import { Check } from "lucide-react";
import { useFloat, useTilt } from "../hooks/motion";
import { useI18n } from "../i18n/LocaleContext";
import CrossedTapes from "./CrossedTapes";
import LanguageSwitcher from "./LanguageSwitcher";
import Logo, { LogoMark } from "./Logo";

// "Porta de entrada": tela dividida. À esquerda (só no computador), o palco
// com as fitas cruzadas, um ingresso 3D e a frase da marca; à direita, o
// formulário. Os campos daqui ficam neutros (classe tf-auth-form): o laranja
// sobra para o botão principal e alguns detalhes.
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
    <div className="relative min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <AuthArt />
      <div className="relative flex min-h-screen flex-col">
        <div className="tf-topglow pointer-events-none absolute inset-x-0 top-0 h-[420px] lg:hidden" aria-hidden />
        <div className="relative flex h-[84px] items-center justify-between gap-3 px-4 sm:px-10">
          <Logo />
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to="/" className="hidden text-sm font-medium text-muted transition-colors hover:text-ink sm:inline">
              {t.authShell.backHome}
            </Link>
          </div>
        </div>
        <main id="conteudo" className="tf-auth-form relative flex flex-1 justify-center px-4 pb-16 pt-6 sm:px-10 sm:pt-12 lg:items-center lg:pt-6">
          <div className="w-full max-w-[420px] 2xl:max-w-[460px]">
            <div className="mb-8 flex flex-col gap-2.5">
              <p className="eyebrow">{eyebrow}</p>
              <h1 className="text-[clamp(1.875rem,3vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink">{title}</h1>
              <p className="text-muted">{subtitle}</p>
            </div>
            {children}
          </div>
        </main>
        <div className="overflow-hidden lg:hidden">
          <CrossedTapes paper={t.look.home.tapeBrand} brand={["TICKETFY"]} />
        </div>
      </div>
    </div>
  );
}

const BARS = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1];

function AuthArt() {
  const { t } = useI18n();
  const a = t.look.auth;
  const floatRef = useFloat<HTMLDivElement>(7, 7000);
  const tiltRef = useTilt<HTMLDivElement>(8);

  let x = 0;
  const bars = BARS.map((width) => {
    const bar = { x, width };
    x += width + 2;
    return bar;
  });

  return (
    <aside
      className="tf-auth-art sticky top-4 m-4 hidden h-[calc(100vh-2rem)] min-h-[600px] flex-col justify-between p-10 lg:flex xl:p-12"
      aria-hidden
    >
      <p className="relative z-[3] max-w-[22ch] font-display text-[clamp(28px,2.6vw,44px)] font-extrabold leading-[1.08] tracking-[-0.04em]">
        {a.quoteTop} <span className="text-accent">{a.quoteAccent}</span>
      </p>

      <div className="relative flex flex-1 items-center justify-center py-8">
        <div className="tf-auth-tapes -inset-x-10 xl:-inset-x-12">
          <CrossedTapes paper={t.look.home.tapeBrand} brand={["TICKETFY"]} />
        </div>

        <div className="relative z-[2] w-full max-w-[340px] xl:max-w-[360px] 2xl:max-w-[420px]">
          <div ref={floatRef} className="-rotate-[5deg]">
            <div ref={tiltRef} className="tf-paper tf-cut-y tf-auth-ticket">
              <div className="flex justify-between px-5 pb-2 pt-4 text-[11px] font-bold tracking-[0.18em]">
                <span className="text-accent-text">{a.ticketTop}</span>
                <span className="tf-pulse text-accent-text">●</span>
              </div>
              <div className="px-5 pb-6 pt-2">
                <p className="font-display text-[clamp(24px,2vw,30px)] font-extrabold leading-[1.1] tracking-[-0.04em] text-ink">{a.ticketTitle}</p>
                <ul className="mt-5 space-y-2.5">
                  {t.look.home.trust.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] text-muted">
                      <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex h-[84px] items-center justify-between px-5 pt-1.5">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.16em] text-accent-text">{a.stubLabel}</p>
                  <p className="font-display text-[22px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">{a.stubValue}</p>
                </div>
                <svg width="104" height="36" viewBox={`0 0 ${x} 32`} preserveAspectRatio="none" className="fill-current text-ink opacity-85">
                  {bars.map((bar) => (
                    <rect key={bar.x} x={bar.x} width={bar.width} height="32" />
                  ))}
                </svg>
              </div>
              <span className="tf-holo" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[3] flex items-center gap-4">
        <span className="h-px flex-1 bg-white/20" />
        <LogoMark size={30} />
        <span className="h-px flex-1 bg-white/20" />
      </div>
    </aside>
  );
}
