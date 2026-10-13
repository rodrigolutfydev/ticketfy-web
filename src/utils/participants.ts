import type { ParticipantFilters, TicketStatus, TicketTypeDetails } from "../api/types";

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  VALID: "Válido",
  USED: "Usado",
  CANCELLED: "Cancelado",
};

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

export function lotToggleCopy(lot: TicketTypeDetails, lots: TicketTypeDetails[]): LotToggleCopy {
  if (!lot.active) {
    return {
      title: `Reativar o lote "${lot.name}"?`,
      description: "O lote volta para a página do evento e aceita novas compras.",
      confirmLabel: "Reativar",
    };
  }
  const lastActive = lots.filter((candidate) => candidate.active).length === 1;
  const base =
    "O lote sai da página do evento e não aceita novas compras. Pedidos pendentes ainda podem ser pagos dentro do prazo da reserva, e ingressos já pagos continuam válidos.";
  return {
    title: `Desativar o lote "${lot.name}"?`,
    description: lastActive ? `${base} Este é o último lote à venda: o evento ficará sem ingressos disponíveis.` : base,
    confirmLabel: "Desativar",
  };
}
