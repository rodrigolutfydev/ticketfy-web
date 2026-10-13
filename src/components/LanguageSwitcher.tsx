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
        className="flex h-8 items-center rounded-full border border-line-strong bg-raised p-0.5"
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
              className={`h-[26px] rounded-full px-2 text-xs font-bold transition-colors disabled:cursor-wait ${
                active ? "bg-surface text-ink shadow" : "text-muted hover:text-ink"
              }`}
            >
              <span aria-hidden>{t.language.short[option]}</span>
              <span className="sr-only">{t.language.names[option]}</span>
            </button>
          );
        })}
      </div>
      {showError && saveError && (
        <p role="alert" className="absolute right-0 top-full z-40 mt-2 w-56 rounded-lg border border-danger/35 bg-surface px-3 py-2 text-xs text-danger shadow-xl">
          {t.language.saveError}
        </p>
      )}
    </div>
  );
}
