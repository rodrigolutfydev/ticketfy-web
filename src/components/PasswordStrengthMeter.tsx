import { useI18n } from "../i18n/LocaleContext";
import type { passwordStrength } from "../utils/security";

type PasswordStrength = ReturnType<typeof passwordStrength>;

// Barra de força da senha: 4 segmentos que acendem conforme a pontuação.
export default function PasswordStrengthMeter({ score, tips }: PasswordStrength) {
  const { t } = useI18n();
  const color = score <= 1 ? "bg-danger" : score === 2 ? "bg-warning" : "bg-success";
  return (
    <div className="-mt-2" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={`h-1.5 flex-1 rounded-full ${score >= step ? color : "bg-raised"}`} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {t.password.strength}: <span className="font-semibold text-ink">{t.password.levels[score]}</span>
        {tips.length > 0 && ` · ${tips.map((tip) => t.password.tips[tip]).join(" ")}`}
      </p>
    </div>
  );
}
