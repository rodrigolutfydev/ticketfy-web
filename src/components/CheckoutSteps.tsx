import { Check } from "lucide-react";
import { useI18n } from "../i18n/LocaleContext";

// Etapas da compra: concluídas em verde com visto, a atual acesa em laranja.
// No celular só a etapa atual mostra o nome (as outras ficam só com o número).
export default function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  const { t } = useI18n();
  const steps = t.checkoutSteps.steps;
  return (
    <ol className="flex items-center gap-2.5" aria-label={t.checkoutSteps.label}>
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={index} className="flex items-center gap-2.5" aria-current={active ? "step" : undefined}>
            {index > 0 && <span className={`h-0.5 w-5 rounded-full sm:w-11 ${index <= current ? "bg-success" : "bg-line"}`} aria-hidden />}
            <span
              className={`tabular flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                done
                  ? "bg-success text-[#04110a]"
                  : active
                    ? "bg-accent text-accent-ink shadow-[0_0_0_5px_color-mix(in_srgb,var(--accent)_18%,transparent)]"
                    : "text-muted shadow-[inset_0_0_0_1.5px_var(--line)]"
              }`}
            >
              {done ? <Check size={14} strokeWidth={3} aria-hidden /> : index + 1}
            </span>
            <span className={`text-[0.9375rem] font-semibold ${active ? "text-ink" : done ? "hidden text-ink sm:inline" : "hidden text-muted sm:inline"}`}>
              {label}
              {done && <span className="sr-only">{t.checkoutSteps.done}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
