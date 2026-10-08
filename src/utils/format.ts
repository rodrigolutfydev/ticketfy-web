// Formatação de datas, preços e IDs para exibição em português.
// Intl é a API de internacionalização do próprio navegador: sabe escrever
// "sáb., 10 de dez." e "R$ 80,00" sem nenhuma biblioteca.

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const longDayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const priceFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));
export const formatShortDate = (iso: string) => shortDateFormatter.format(new Date(iso));
export const formatTime = (iso: string) => timeFormatter.format(new Date(iso));
export const formatLongDay = (iso: string) => longDayFormatter.format(new Date(iso));
export const formatPrice = (value: number) => priceFormatter.format(value);

// Pedaços da data para o "selo" dos cartões (ex.: 10 / dez / sáb).
export function dateParts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("pt-BR", { day: "2-digit" }),
    month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
    weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
  };
}

// "em 3 dias", "amanhã", "hoje", "já aconteceu".
export function relativeDay(iso: string): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86_400_000);
  if (days < 0) return "já aconteceu";
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days < 30) return `em ${days} dias`;
  const months = Math.round(days / 30);
  return months === 1 ? "em 1 mês" : `em ${months} meses`;
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

// Carimbo de data dos cartões, como no Figma: "SÁB, 18 JAN • 16:00".
const stampDay = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
export function eventStamp(iso: string) {
  const parts = stampDay.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value.replace(".", "") ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")} • ${formatTime(iso)}`.toUpperCase();
}

// Dashboard: percentuais de 0 a 100 e valores que podem não existir (null vira "—").
const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const formatPercent = (value: number | null | undefined) => (value === null || value === undefined ? "—" : `${percentFormatter.format(value)}%`);
export const formatMaybePrice = (value: number | null | undefined) => (value === null || value === undefined ? "—" : formatPrice(value));
const integerFormatter = new Intl.NumberFormat("pt-BR");
export const formatInt = (value: number) => integerFormatter.format(value);
