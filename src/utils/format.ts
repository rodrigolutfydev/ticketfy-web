import { getLocale, type Locale } from "../i18n/locale";
import { MESSAGES } from "../i18n/messages";

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const numberFormatters = new Map<string, Intl.NumberFormat>();

function dateFormatter(locale: Locale, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

function numberFormatter(locale: Locale, options: Intl.NumberFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

const DATE: Intl.DateTimeFormatOptions = {
  weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
};
const SHORT_DATE: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" };
const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
const LONG_DAY: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };
const FULL_DAY: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
const PRICE: Intl.NumberFormatOptions = { style: "currency", currency: "BRL" };

export const formatDate = (iso: string, locale: Locale = getLocale()) => dateFormatter(locale, DATE).format(new Date(iso));
export const formatShortDate = (iso: string, locale: Locale = getLocale()) => dateFormatter(locale, SHORT_DATE).format(new Date(iso));
export const formatTime = (iso: string, locale: Locale = getLocale()) => dateFormatter(locale, TIME).format(new Date(iso));
export const formatLongDay = (iso: string, locale: Locale = getLocale()) => dateFormatter(locale, LONG_DAY).format(new Date(iso));
export const formatFullDay = (iso: string, locale: Locale = getLocale()) => dateFormatter(locale, FULL_DAY).format(new Date(iso));
export const formatPrice = (value: number, locale: Locale = getLocale()) => numberFormatter(locale, PRICE).format(value);
export const formatNumber = (value: number, maximumFractionDigits: number, locale: Locale = getLocale()) =>
  numberFormatter(locale, { maximumFractionDigits }).format(value);

const clean = (value: string) => value.replace(".", "");

export function dateParts(iso: string, locale: Locale = getLocale()) {
  const d = new Date(iso);
  return {
    day: dateFormatter(locale, { day: "2-digit" }).format(d),
    month: clean(dateFormatter(locale, { month: "short" }).format(d)),
    weekday: clean(dateFormatter(locale, { weekday: "short" }).format(d)),
  };
}

export function relativeDay(iso: string, locale: Locale = getLocale()): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86_400_000);
  return MESSAGES[locale].common.relativeDay(days);
}

export const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

// A API trabalha com Instant (momento absoluto, ISO 8601 em UTC, ex.: "2026-12-10T23:00:00Z").
// O input datetime-local trabalha com horário local sem fuso (ex.: "2026-12-10T20:00").
// As duas funções abaixo fazem a conversão nos dois sentidos, usando o fuso do navegador.

const pad = (n: number) => String(n).padStart(2, "0");

// "2026-12-10T23:00:00Z" -> "2026-12-10T20:00" (em São Paulo)
export function toInputDateTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "2026-12-10T20:00" (horário local) -> "2026-12-10T23:00:00.000Z"
// Sem fuso na string, o Date interpreta como horário local; toISOString devolve em UTC.
export const fromInputDateTime = (value: string) => new Date(value).toISOString();

// Os 8 primeiros caracteres do UUID, para mostrar "Pedido #3F2A9C1B".
export const shortId = (id: string) => id.slice(0, 8).toUpperCase();

// Plural simples: plural(2, "ingresso") -> "2 ingressos".
export const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
  `${n} ${n === 1 ? singular : pluralForm}`;

// Siglas dos estados, para o seletor de UF no formulário de evento.
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function eventStamp(iso: string, locale: Locale = getLocale()) {
  const parts = dateFormatter(locale, { weekday: "short", day: "2-digit", month: "short" }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value.replace(".", "") ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")} • ${formatTime(iso, locale)}`.toUpperCase();
}

export const formatPercent = (value: number | null | undefined, locale: Locale = getLocale()) =>
  value === null || value === undefined ? "—" : `${formatNumber(value, 1, locale)}%`;
export const formatMaybePrice = (value: number | null | undefined, locale: Locale = getLocale()) =>
  value === null || value === undefined ? "—" : formatPrice(value, locale);
export const formatInt = (value: number, locale: Locale = getLocale()) => numberFormatter(locale, {}).format(value);
