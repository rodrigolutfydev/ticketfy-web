export type Locale = "pt-BR" | "en";

export const LOCALES: readonly Locale[] = ["pt-BR", "en"];

export const DEFAULT_LOCALE: Locale = "pt-BR";

export const LOCALE_STORAGE_KEY = "ticketfy.locale";

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const lower = tag.trim().toLowerCase();
  if (lower === "pt" || lower.startsWith("pt-")) return "pt-BR";
  if (lower === "en" || lower.startsWith("en-")) return "en";
  return null;
}

export function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    return;
  }
}

export function browserLocale(languages: readonly string[] | undefined): Locale | null {
  for (const tag of languages ?? []) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return null;
}

export function detectLocale(): Locale {
  const languages = typeof navigator === "undefined" ? undefined : navigator.languages ?? [navigator.language];
  return readStoredLocale() ?? browserLocale(languages) ?? DEFAULT_LOCALE;
}

let currentLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<(locale: Locale) => void>();

export const getLocale = () => currentLocale;

export function setLocale(locale: Locale) {
  if (!isLocale(locale) || locale === currentLocale) return;
  currentLocale = locale;
  if (typeof document !== "undefined") document.documentElement.lang = locale;
  listeners.forEach((listener) => listener(locale));
}

export function subscribeLocale(listener: (locale: Locale) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
