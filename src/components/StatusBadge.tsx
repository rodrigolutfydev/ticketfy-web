import type { OrderStatus, TicketStatus } from "../api/types";
import { useI18n } from "../i18n/LocaleContext";

// Etiqueta colorida de status, com o texto em português.
// O ponto colorido ajuda, mas o texto sempre está lá: cor sozinha não
// pode carregar a informação (daltônicos não distinguiriam).
export const STATUS_TONES = {
  warning: "tf-status-blink text-warning bg-warning/[0.13]",
  success: "text-success bg-success/[0.12]",
  muted: "text-muted bg-ink/[0.07]",
  danger: "text-danger bg-danger/[0.12]",
  info: "text-info bg-info/[0.13]",
  accent: "text-accent-text bg-accent-soft",
} as const;

const styles: Record<OrderStatus | TicketStatus, string> = {
  PENDING: STATUS_TONES.warning,
  PAID: STATUS_TONES.success,
  EXPIRED: STATUS_TONES.danger,
  CANCELLED: STATUS_TONES.muted,
  REFUNDED: STATUS_TONES.info,
  VALID: STATUS_TONES.success,
  USED: STATUS_TONES.accent,
};

export default function StatusBadge({ status }: { status: OrderStatus | TicketStatus }) {
  const { t } = useI18n();
  const names: Record<string, string> = { ...t.labels.orderStatus, ...t.labels.ticketStatus };
  const label = names[status] ?? status;
  const style = styles[status] ?? STATUS_TONES.muted;
  // A bolinha da cor vem do ::before de .tf-status (decorativa); o texto sempre está lá.
  return <span className={`tf-status ${style}`}>{label}</span>;
}
