import type { ParticipantFilters, TicketTypeDetails } from "../api/types";
import { getLocale, type Locale } from "../i18n/locale";
import { MESSAGES } from "../i18n/messages";

export function participantsQuery(filters: ParticipantFilters): string {
  const params = new URLSearchParams();
  if (filters.ticketTypeId) params.set("ticketTypeId", filters.ticketTypeId);
  if (filters.status) params.set("status", filters.status);
  const q = filters.q?.trim();
  if (q) params.set("q", q.slice(0, 100));
  if (filters.page !== undefined && filters.page > 0) params.set("page", String(filters.page));
  if (filters.size !== undefined) params.set("size", String(filters.size));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const maskedCode = (suffix: string) => `••••${suffix}`;

export interface LotToggleCopy {
  title: string;
  description: string;
  confirmLabel: string;
}

export function lotToggleCopy(lot: TicketTypeDetails, lots: TicketTypeDetails[], locale: Locale = getLocale()): LotToggleCopy {
  const copy = MESSAGES[locale].organizer.lots.toggle;
  if (!lot.active) {
    return { title: copy.reactivateTitle(lot.name), description: copy.reactivateText, confirmLabel: copy.reactivate };
  }
  const lastActive = lots.filter((candidate) => candidate.active).length === 1;
  return {
    title: copy.deactivateTitle(lot.name),
    description: lastActive ? `${copy.deactivateText} ${copy.lastActive}` : copy.deactivateText,
    confirmLabel: copy.deactivate,
  };
}
