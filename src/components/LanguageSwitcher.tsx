import { Languages } from "lucide-react";
import { useI18n } from "../i18n/LocaleContext";
import { LOCALES } from "../i18n/locale";

export default function LanguageSwitcher({ showError = true }: { showError?: boolean }) {
  const { locale, t, changeLocale, saving, saveError } = useI18n();
  return (
    <div className="relative">
      <div
        role="group"
        aria-label={t.language.choose}
        aria-busy={saving || undefined}
        className="flex h-9 items-center rounded-full bg-ink/[0.04] p-[3px] shadow-[inset_0_0_0_1px_var(--card-ring)]"
      >
        <Languages size={14} className="mx-1.5 shrink-0 text-subtle" aria-hidden />
        {LOCALES.map((option) => {
          const active = option === locale;
          return (
            <button
              key={option}
              type="button"
              lang={option}
              aria-pressed={active}
              title={t.language.names[option]}
              onClick={() => changeLocale(option)}
              disabled={saving}
              className={`h-[30px] rounded-full px-2.5 text-xs font-bold transition-colors disabled:cursor-wait ${
                active ? "bg-accent/[0.18] text-ink shadow-[inset_0_0_0_1px_var(--accent-line)]" : "text-muted hover:text-ink"
              }`}
            >
              <span aria-hidden>{t.language.short[option]}</span>
              <span className="sr-only">{t.language.names[option]}</span>
            </button>
          );
        })}
      </div>
      {showError && saveError && (
        <p role="alert" className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl bg-surface px-3 py-2 text-xs text-danger shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--danger)_40%,transparent),0_24px_60px_rgb(0_0_0/0.5)]">
          {t.language.saveError}
        </p>
      )}
    </div>
  );
}
