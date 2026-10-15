import { useEffect, useState } from "react";
import { useI18n } from "../i18n/LocaleContext";

// Quanto falta para a reserva do pedido expirar (mm:ss).
// O relógio de verdade é o da API: quando o tempo acaba aqui, a tela
// recarrega o pedido para ver o status que a API decidiu.

// Fração da reserva que ainda resta (1 = acabou de reservar, 0 = expirou).
export function remainingFraction(remainingMs: number, totalMs: number) {
  if (!(totalMs > 0)) return 0;
  return Math.min(1, Math.max(0, remainingMs / totalMs));
}

// Duração da reserva para o anel: criação → expiração do pedido. Se o dado
// vier estranho (sem data, negativo ou maior que 1 h), usa os 15 min da API.
export const DEFAULT_HOLD_MS = 15 * 60 * 1000;
export function reservationTotal(from: string | null | undefined, until: string) {
  const total = from ? new Date(until).getTime() - new Date(from).getTime() : NaN;
  return Number.isFinite(total) && total > 0 && total <= 60 * 60 * 1000 ? total : DEFAULT_HOLD_MS;
}

export function formatClock(remainingMs: number) {
  const safe = Math.max(0, remainingMs);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function useRemaining(until: string, onExpire?: () => void) {
  const target = new Date(until).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const left = target - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    // Função de limpeza: o React chama ao sair da tela, e o intervalo para.
    return () => clearInterval(interval);
  }, [target, onExpire]);

  return remaining;
}

export default function Countdown({ until, onExpire }: { until: string; onExpire?: () => void }) {
  const { t } = useI18n();
  const remaining = useRemaining(until, onExpire);
  if (remaining <= 0) return <span className="font-semibold text-danger">{t.payment.expired}</span>;
  const urgent = remaining < 2 * 60 * 1000;
  return (
    // aria-live="off": o leitor de tela não anuncia cada segundo (seria insuportável).
    <span aria-live="off" className={`font-display text-xl font-extrabold tabular-nums ${urgent ? "text-danger" : "text-ink"}`}>
      {formatClock(remaining)}
    </span>
  );
}

// Timer da reserva no estilo do layout: anel que esvazia e o tempo grande.
// O total do anel vem da própria reserva (criação → expiração do pedido).
export function ReservationTimer({ from, until, label, onExpire }: { from?: string | null; until: string; label: string; onExpire?: () => void }) {
  const { t } = useI18n();
  const remaining = useRemaining(until, onExpire);
  const total = reservationTotal(from, until);
  const fraction = remainingFraction(remaining, total);
  const urgent = remaining < 2 * 60 * 1000;
  const circumference = 138.2; // 2π × 22 (raio do círculo)
  return (
    <div
      role="timer"
      aria-label={t.look.timer.left}
      className={`flex items-center gap-4 rounded-[18px] px-5 py-4 ${
        urgent
          ? "bg-[linear-gradient(110deg,color-mix(in_srgb,var(--danger)_22%,var(--surface)),var(--surface)_70%)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--danger)_50%,transparent)]"
          : "bg-[linear-gradient(110deg,color-mix(in_srgb,var(--accent)_22%,var(--surface)),var(--surface)_70%)] shadow-[inset_0_0_0_1px_var(--accent-line)]"
      }`}
    >
      <svg viewBox="0 0 52 52" className="h-[52px] w-[52px] shrink-0 -rotate-90" aria-hidden>
        <circle cx="26" cy="26" r="22" fill="none" strokeWidth="4" className="stroke-ink/10" />
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={(circumference * (1 - fraction)).toFixed(1)}
          className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${urgent ? "stroke-danger" : "stroke-accent"}`}
        />
      </svg>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted">{label}</span>
        {remaining <= 0 ? (
          <span className="font-display text-2xl font-extrabold text-danger">{t.payment.expired}</span>
        ) : (
          <span aria-live="off" className="font-display text-[clamp(1.5rem,2.4vw,1.875rem)] font-extrabold tracking-[-0.03em] tabular-nums text-ink">
            {formatClock(remaining)}
          </span>
        )}
      </div>
    </div>
  );
}
