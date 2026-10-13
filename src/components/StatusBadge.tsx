import type { OrderStatus, TicketStatus } from "../api/types";
import { useI18n } from "../i18n/LocaleContext";

// Etiqueta colorida de status, com o texto em português.
// O ponto colorido ajuda, mas o texto sempre está lá: cor sozinha não
// pode carregar a informação (daltônicos não distinguiriam).
const styles: Record<OrderStatus | TicketStatus, string> = {
  PENDING: "text-warning bg-warning/12 border-warning/30",
  PAID: "text-success bg-success/12 border-success/30",
  EXPIRED: "text-muted bg-raised border-line",
  CANCELLED: "text-muted bg-raised border-line",
  REFUNDED: "text-info bg-info/12 border-info/30",
  VALID: "text-success bg-success/12 border-success/30",
  USED: "text-accent-text bg-accent/12 border-accent/30",
};

export default function StatusBadge({ status }: { status: OrderStatus | TicketStatus }) {
  const { t } = useI18n();
  const names: Record<string, string> = { ...t.labels.orderStatus, ...t.labels.ticketStatus };
  const label = names[status] ?? status;
  const style = styles[status] ?? "text-muted bg-raised border-line";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
