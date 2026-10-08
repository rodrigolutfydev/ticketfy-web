import type { OrderStatus, TicketStatus } from "../api/types";

// Etiqueta colorida de status, com o texto em português.
// O ponto colorido ajuda, mas o texto sempre está lá: cor sozinha não
// pode carregar a informação (daltônicos não distinguiriam).
const labels: Record<OrderStatus | TicketStatus, [string, string]> = {
  PENDING: ["Aguardando pagamento", "text-warning bg-warning/12 border-warning/30"],
  PAID: ["Pago", "text-success bg-success/12 border-success/30"],
  EXPIRED: ["Expirado", "text-muted bg-raised border-line"],
  CANCELLED: ["Cancelado", "text-muted bg-raised border-line"],
  REFUNDED: ["Reembolsado", "text-info bg-info/12 border-info/30"],
  VALID: ["Válido", "text-success bg-success/12 border-success/30"],
  USED: ["Utilizado", "text-accent-text bg-accent/12 border-accent/30"],
};

export default function StatusBadge({ status }: { status: OrderStatus | TicketStatus }) {
  const [label, style] = labels[status] ?? [status, "text-muted bg-raised border-line"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
