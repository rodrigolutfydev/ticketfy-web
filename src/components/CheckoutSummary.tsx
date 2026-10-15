import type { ReactNode } from "react";
import { formatPrice, formatShortDate } from "../utils/format";
import { useI18n } from "../i18n/LocaleContext";
import EventCover from "./EventCover";

export interface SummaryLine {
  key: string;
  label: string;
  quantity: number;
  subtotal: number | null;
}

// Resumo da compra em formato de ingresso: foto do evento em cima, itens no
// corpo e o total no "canhoto", depois do picote com os recortes laterais.
export default function CheckoutSummary({
  event,
  lines,
  total,
  discount,
  footer,
}: {
  event?: { name: string; startsAt: string; imageUrl?: string | null; venueName?: string; city?: string };
  lines: SummaryLine[];
  total: number;
  discount?: { code: string; amount: number; subtotal: number } | null;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="tf-order-ticket tf-cut-y [--cut-y:calc(100%-112px)]">
      {event && (
        <div className="relative h-[140px] overflow-hidden rounded-t-[22px]">
          <EventCover name={event.name} startsAt={event.startsAt} imageUrl={event.imageUrl} />
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,var(--surface))]" aria-hidden />
        </div>
      )}
      <div className={`flex flex-col gap-3 px-6 pb-6 ${event ? "pt-1" : "pt-6"}`}>
        <p className="eyebrow">{t.summary.title}</p>
        {event && (
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight tracking-[-0.03em] text-ink">{event.name}</p>
            <p className="mt-1 text-sm text-muted">
              {formatShortDate(event.startsAt)}
              {event.venueName && ` · ${event.venueName}`}
              {event.city && `, ${event.city}`}
            </p>
          </div>
        )}
        <div className="border-t-2 border-dashed border-line" aria-hidden />
        <ul className="flex flex-col gap-2 text-[0.9375rem]">
          {lines.map((line) => (
            <li key={line.key} className="flex justify-between gap-3">
              <span className="text-muted">
                {line.quantity}× {line.label}
              </span>
              <span className="tabular font-semibold text-ink">{line.subtotal === null ? "—" : formatPrice(line.subtotal)}</span>
            </li>
          ))}
        </ul>
        {footer}
      </div>
      {/* Canhoto: subtotal, desconto e total, separados pelo picote. */}
      <div className="relative flex h-[112px] flex-col justify-center gap-1.5 px-6">
        <span className="absolute inset-x-[22px] top-0 border-t-2 border-dashed border-accent-line" aria-hidden />
        {discount && (
          <dl className="flex flex-col gap-0.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.summary.subtotal}</dt>
              <dd className="tabular text-ink">{formatPrice(discount.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">
                {t.summary.discount} <span className="font-semibold text-success">{discount.code}</span>
              </dt>
              <dd className="tabular font-semibold text-success">−{formatPrice(discount.amount)}</dd>
            </div>
          </dl>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted">{t.summary.total}</span>
          <span className="tabular font-display text-[clamp(1.5rem,2.4vw,2rem)] font-extrabold tracking-[-0.04em] text-ink">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}
