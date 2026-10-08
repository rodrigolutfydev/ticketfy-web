import type { ReactNode } from "react";
import { formatPrice, formatShortDate } from "../utils/format";
import EventCover from "./EventCover";

export interface SummaryLine {
  key: string;
  label: string;
  quantity: number;
  subtotal: number | null;
}

// Cartão "Resumo" da coluna direita da compra: evento, itens e total.
export default function CheckoutSummary({
  event,
  lines,
  total,
  discount,
  footer,
}: {
  event?: { name: string; startsAt: string; imageUrl?: string | null };
  lines: SummaryLine[];
  total: number;
  discount?: { code: string; amount: number; subtotal: number } | null;
  footer?: ReactNode;
}) {
  return (
    <div className="elevated rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-ink">Resumo</h2>
      {event && (
        <div className="mt-4 flex items-center gap-3 border-b border-line pb-4">
          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-raised">
            <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{event.name}</p>
            <p className="text-xs text-muted">{formatShortDate(event.startsAt)}</p>
          </div>
        </div>
      )}
      <ul className="space-y-2 border-b border-line py-4 text-sm">
        {lines.map((line) => (
          <li key={line.key} className="flex justify-between gap-3">
            <span className="text-muted">
              {line.quantity}× {line.label}
            </span>
            <span className="tabular font-semibold text-ink">{line.subtotal === null ? "—" : formatPrice(line.subtotal)}</span>
          </li>
        ))}
      </ul>
      {discount && (
        <dl className="space-y-2 border-b border-line py-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular font-semibold text-ink">{formatPrice(discount.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">
              Desconto <span className="font-semibold text-success">{discount.code}</span>
            </dt>
            <dd className="tabular font-semibold text-success">−{formatPrice(discount.amount)}</dd>
          </div>
        </dl>
      )}
      <div className="flex items-center justify-between pt-4">
        <span className="font-semibold text-ink">Total</span>
        <span className="tabular text-2xl font-bold text-accent-text">{formatPrice(total)}</span>
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
