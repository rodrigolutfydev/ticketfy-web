import { Link } from "react-router";
import { useI18n } from "../i18n/LocaleContext";

// Marca do Ticketfy: um ingresso laranja inclinado, com o "T" vazado em preto.
// O "T" é desenhado (path), não texto: fica igual em qualquer fonte.
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round((size * 28) / 38)}
      viewBox="0 0 38 28"
      fill="none"
      aria-hidden
      className="shrink-0 transition-transform duration-500 group-hover:rotate-[8deg]"
    >
      <g transform="rotate(-8 19 14)">
        <path
          d="M7 4h24a4 4 0 0 1 4 4v3.2a2.8 2.8 0 0 0 0 5.6V20a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3.2a2.8 2.8 0 0 0 0-5.6V8a4 4 0 0 1 4-4z"
          fill="var(--accent)"
        />
        <path d="M13.4 9h11.2v2.7h-4.2V19h-2.8v-7.3h-4.2z" fill="var(--paper-ink)" />
      </g>
    </svg>
  );
}

export default function Logo({ to = "/" }: { to?: string }) {
  const { t } = useI18n();
  return (
    <Link
      to={to}
      className="group flex items-center gap-2.5 font-display text-[1.3rem] font-bold tracking-[-0.03em] text-ink"
      aria-label={t.layout.logoLabel}
    >
      <LogoMark />
      ticketfy
    </Link>
  );
}

// Nome gigante e apagado no pé do rodapé (decorativo).
export function Wordmark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none h-[0.76em] select-none overflow-hidden pt-[0.1em] text-center font-display text-[clamp(76px,18.2vw,262px)] font-extrabold leading-[0.8] tracking-[-0.035em] text-ink/[0.05]"
    >
      ticketfy
    </div>
  );
}
