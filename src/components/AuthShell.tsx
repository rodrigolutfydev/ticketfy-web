import type { ReactNode } from "react";
import { Baby, Drama, GraduationCap, Laugh, Mic, Music, Palette, PartyPopper, Trophy, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { EventCategory } from "../api/types";
import { categoryLabel } from "../i18n/categories";
import { useI18n } from "../i18n/LocaleContext";
import LanguageSwitcher from "./LanguageSwitcher";
import Logo from "./Logo";

// "Porta de entrada": um cartão de vidro fosco sobre o fundo preto liso. À
// esquerda, o formulário compacto, com o atalho para a outra tela (entrar/
// criar conta) no topo; à direita (só no computador), contornos de ingresso
// com feixes laranja, a frase da marca e as categorias de evento. A classe
// tf-auth-form deixa campos, links e seleção em tons neutros: o laranja sobra
// para o botão principal e os feixes.
const CATEGORIES: [EventCategory, LucideIcon][] = [
  ["MUSIC", Music],
  ["THEATER", Drama],
  ["COMEDY", Laugh],
  ["PARTIES", PartyPopper],
  ["SPORTS", Trophy],
  ["COURSES", GraduationCap],
  ["TALKS", Mic],
  ["ARTS", Palette],
  ["FOOD", UtensilsCrossed],
  ["KIDS", Baby],
];

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  switchLink,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  switchLink: ReactNode;
  children: ReactNode;
}) {
  const { t, locale } = useI18n();
  const a = t.look.auth;
  return (
    <div data-theme="dark" className="bg-black text-ink">
      <div className="tf-auth-form flex min-h-screen bg-black lg:items-center lg:justify-center lg:p-6">
        <div className="tf-auth-card grid w-full lg:h-[min(860px,calc(100vh-3rem))] lg:max-w-[1240px] lg:grid-cols-2">
          <section className="flex min-h-screen flex-col px-5 sm:px-10 lg:min-h-0">
            <header className="flex h-16 shrink-0 items-center justify-between gap-3 sm:h-[72px]">
              <Logo />
              <div className="flex min-w-0 items-center gap-3 text-sm">
                {switchLink}
                <div className="hidden sm:block">
                  <LanguageSwitcher />
                </div>
              </div>
            </header>
            <main id="conteudo" className="flex flex-1 flex-col items-center pb-6 pt-2">
              <div className="flex-[1]" />
              <div className="w-full max-w-[380px]">
                <div className="mb-6 text-center">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-subtle">{eyebrow}</p>
                  <h1 className="mt-2 font-sans text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-ink">{title}</h1>
                  <p className="mt-1.5 text-[0.9375rem] text-muted">{subtitle}</p>
                </div>
                {children}
                <div className="mt-8 flex justify-center sm:hidden">
                  <LanguageSwitcher />
                </div>
              </div>
              <div className="flex-[2]" />
            </main>
          </section>

          <aside className="tf-auth-panel relative isolate hidden flex-col items-center overflow-hidden px-10 pb-6 pt-[72px] text-center lg:flex">
            <TicketLines />
            <div className="flex-[1]" />
            <h2 className="font-sans text-[1.75rem] font-semibold tracking-[-0.025em] text-ink">{a.panelTitle}</h2>
            <p className="mt-3 max-w-[440px] text-[0.9375rem] leading-relaxed text-muted">{a.panelText}</p>
            <span className="tf-auth-glowline mt-8" aria-hidden />
            <ul className="mt-8 flex max-w-[520px] flex-wrap justify-center gap-x-7 gap-y-5" aria-label={a.panelCategories}>
              {CATEGORIES.map(([category, Icon]) => (
                <li key={category} className="flex items-center gap-2 text-[0.875rem] font-semibold text-[#d6d1db]">
                  <Icon size={17} strokeWidth={2.2} aria-hidden />
                  {categoryLabel(category, locale)}
                </li>
              ))}
            </ul>
            <div className="flex-[2]" />
          </aside>
        </div>
      </div>
    </div>
  );
}

// Contornos de ingresso em linha fina (recorte nas laterais e picote), saindo
// dos cantos do painel, com um feixe de luz laranja que percorre a borda dos
// dois principais (tf-auth-trace). Vetor nítido, só decoração.
function TicketLines() {
  const ticket = "M24 0h352a24 24 0 0 1 24 24v72a28 28 0 0 0 0 56v72a24 24 0 0 1-24 24H24A24 24 0 0 1 0 224v-72a28 28 0 0 0 0-56V24A24 24 0 0 1 24 0z";
  return (
    <svg className="tf-auth-tickets" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g transform="translate(-70 10) rotate(-12 200 124)">
        <path d={ticket} />
        <path d="M300 18v212" className="tf-auth-perf" />
        <path d={ticket} pathLength={1000} className="tf-auth-trace" />
      </g>
      <g transform="translate(-20 120) rotate(-12 200 124)" className="tf-auth-tickets-faint">
        <path d={ticket} />
      </g>
      <g transform="translate(470 640) rotate(-12 200 124)">
        <path d={ticket} />
        <path d="M100 18v212" className="tf-auth-perf" />
        <path d={ticket} pathLength={1000} className="tf-auth-trace tf-auth-trace-late" />
      </g>
      <g transform="translate(420 530) rotate(-12 200 124)" className="tf-auth-tickets-faint">
        <path d={ticket} />
      </g>
    </svg>
  );
}

