import type { AuditAction, AuditTargetType } from "../../api/types";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  PAYOUT_ACCOUNT_SAVED: "Dados de recebimento salvos",
  PAYOUT_REQUESTED: "Saque solicitado",
  PAYOUT_SENT_TO_REVIEW: "Saque enviado para análise",
  PAYOUT_APPROVED: "Saque aprovado",
  PAYOUT_REJECTED: "Saque recusado",
  PAYOUT_CANCELLED: "Saque cancelado",
  PAYOUT_PAID: "Saque pago",
  PAYOUT_FAILED: "Saque falhou",
  PAYOUTS_BLOCKED: "Saques bloqueados",
  PAYOUTS_UNBLOCKED: "Saques desbloqueados",
  EVENT_FEATURED: "Evento destacado",
  EVENT_UNFEATURED: "Evento removido dos destaques",
  TICKET_TYPE_PRICE_CHANGED: "Preço de lote alterado",
  EVENT_CANCELLED: "Evento cancelado",
  PASSWORD_CHANGED: "Senha alterada",
  SESSION_REUSE_DETECTED: "Reutilização de sessão detectada",
  TICKET_TRANSFERRED: "Ingresso transferido",
};

export const AUDIT_TARGET_LABELS: Record<AuditTargetType, string> = {
  PAYOUT_ACCOUNT: "Dados de recebimento",
  PAYOUT: "Saque",
  ORGANIZER: "Organizador",
  EVENT: "Evento",
  TICKET_TYPE: "Lote",
  TICKET: "Ingresso",
  USER: "Usuário",
};

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
