import type { AuditTargetType } from "../../api/types";

export const AUDIT_TARGET_TYPES: AuditTargetType[] = ["PAYOUT_ACCOUNT", "PAYOUT", "ORGANIZER", "EVENT", "TICKET_TYPE", "TICKET", "USER", "COUPON"];

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
