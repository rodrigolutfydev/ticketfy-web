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

export const calendarFileUrl = (eventId: string) => apiUrl(`/events/${encodeURIComponent(eventId)}/calendar.ics`);

export const eventPageUrl = (origin: string, eventId: string) => `${origin.replace(/\/+$/, "")}/events/${encodeURIComponent(eventId)}`;

export function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[-:]/g, "");
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
  const end = event.endsAt ? utcStamp(event.endsAt) : start;
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
