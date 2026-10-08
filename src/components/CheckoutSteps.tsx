import { Check } from "lucide-react";

// Indicador de etapas da compra, mostrado no cabeçalho do modo "caixa".
const STEPS = ["Revisão", "Pagamento", "Confirmação"];

export default function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-start" aria-label="Etapas da compra">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-start" aria-current={active ? "step" : undefined}>
            <div className="flex w-20 flex-col items-center gap-1.5 sm:w-24">
              <span
                className={`tabular flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  done || active ? "bg-accent text-accent-ink" : "border border-line-strong text-subtle"
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} aria-hidden /> : index + 1}
              </span>
              <span className={`text-[11px] font-semibold ${active ? "text-ink" : "text-subtle"}`}>
                {label}
                {done && <span className="sr-only"> (concluída)</span>}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span className={`mt-3.5 h-px w-6 sm:w-12 ${done ? "bg-accent" : "bg-line-strong"}`} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
