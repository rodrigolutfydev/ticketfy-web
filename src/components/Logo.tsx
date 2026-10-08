import { Link } from "react-router";

// Marca do Ticketfy: um ingresso em contorno coral, com o picote no meio.
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.75)} viewBox="0 0 32 24" aria-hidden className="text-accent">
      <path
        d="M4 3h24a2 2 0 0 1 2 2v4a3 3 0 0 0 0 6v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a3 3 0 0 0 0-6V5a2 2 0 0 1 2-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M16 8v8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="font-display flex items-center gap-2 text-[1.35rem] font-bold tracking-tight text-ink" aria-label="Ticketfy, página inicial">
      <LogoMark />
      ticketfy
    </Link>
  );
}
