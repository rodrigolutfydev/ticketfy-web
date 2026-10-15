import { apiUrl } from "../api/client";

export interface CalendarEvent {
  id: string;
  name: string;
  startsAt: string;
  endsAt?: string | null;
  description?: string | null;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export const MAX_GOOGLE_DESCRIPTION = 1000;
export const MAX_GOOGLE_URL = 4000;
const GOOGLE_BASE = "https://calendar.google.com/calendar/render";
const ELLIPSIS = "…";
export const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

export const calendarFileUrl = (eventId: string) => apiUrl(`/events/${encodeURIComponent(eventId)}/calendar.ics`);

export const eventPageUrl = (origin: string, eventId: string) => `${origin.replace(/\/+$/, "")}/events/${encodeURIComponent(eventId)}`;

export function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[-:]/g, "");
}

// Evento sem horário de fim entra na agenda com 3 horas de duração.
export function eventEndsAt(event: Pick<CalendarEvent, "startsAt" | "endsAt">): string {
  return event.endsAt ?? new Date(new Date(event.startsAt).getTime() + DEFAULT_DURATION_MS).toISOString();
}

// O .ics vem da API sem DTEND quando o evento não tem fim; completa com o
// início + 3 horas, mantendo o resto do arquivo como veio.
export function withDefaultEnd(ics: string): string {
  if (/^DTEND[;:]/m.test(ics)) return ics;
  const newline = ics.includes("\r\n") ? "\r\n" : "\n";
  const lines = ics.split(newline);
  const index = lines.findIndex((line) => /^DTSTART:\d{8}T\d{6}Z$/.test(line));
  if (index < 0) return ics;
  const [, year, month, day, hour, minute, second] = /^DTSTART:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(lines[index])!;
  const end = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second) + DEFAULT_DURATION_MS;
  lines.splice(index + 1, 0, `DTEND:${utcStamp(new Date(end).toISOString())}`);
  return lines.join(newline);
}

export function truncateText(text: string, maxLength: number): string {
  const characters = Array.from(text.trim());
  if (characters.length <= maxLength) return characters.join("");
  const cut = characters.slice(0, Math.max(0, maxLength - 1)).join("");
  const lastSpace = cut.search(/\s\S*$/);
  const base = lastSpace > cut.length * 0.8 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}${ELLIPSIS}`;
}

export function eventLocation(event: CalendarEvent): string {
  const cityAndState = [event.city, event.state].filter((part) => part && part.trim()).join(" - ");
  return [event.venueName, event.address, cityAndState].filter((part) => part && part.trim()).join(", ");
}

function buildUrl(event: CalendarEvent, details: string): string {
  const start = utcStamp(event.startsAt);
  const end = utcStamp(eventEndsAt(event));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${start}/${end}`,
    details,
    location: eventLocation(event),
  });
  return `${GOOGLE_BASE}?${params}`;
}

export function googleCalendarUrl(event: CalendarEvent, pageUrl: string): string {
  const description = event.description?.trim() ?? "";
  const details = (text: string) => (text ? `${text}\n\n${pageUrl}` : pageUrl);
  let limit = Math.min(MAX_GOOGLE_DESCRIPTION, Array.from(description).length);
  let url = buildUrl(event, details(truncateText(description, limit)));
  while (url.length > MAX_GOOGLE_URL && limit > 0) {
    limit = Math.max(0, limit - 100);
    url = buildUrl(event, details(limit > 0 ? truncateText(description, limit) : ""));
  }
  return url;
}
