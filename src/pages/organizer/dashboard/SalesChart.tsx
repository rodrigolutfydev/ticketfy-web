import { useState } from "react";
import type { EventDashboard } from "../../../api/types";
import { formatInt, formatPrice } from "../../../utils/format";

type Day = EventDashboard["dailySales"][number];

const W = 720;
const H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };

// Gráfico próprio em SVG (sem biblioteca): barras = ingressos, linha = receita.
// Cada série tem a própria escala; os valores exatos aparecem ao passar o mouse
// ou focar uma barra com o teclado.
export default function SalesChart({ data }: { data: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const maxTickets = Math.max(1, ...data.map((d) => d.tickets));
  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / data.length;
  const barW = Math.max(2, Math.min(28, step * 0.62));
  const x = (i: number) => PAD.left + step * i + step / 2;
  const yT = (v: number) => PAD.top + innerH - (v / maxTickets) * innerH;
  const yR = (v: number) => PAD.top + innerH - (v / maxRevenue) * innerH;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yR(d.revenue).toFixed(1)}`).join(" ");
  const labelEvery = Math.ceil(data.length / 8);
  const dayLabel = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };
  const current = active !== null ? data[active] : null;

  return (
    <div>
      <div className="mb-2 h-5 text-sm" aria-live="polite">
        {current ? (
          <span className="tabular text-ink">
            <span className="font-semibold">{dayLabel(current.date)}</span> · {formatInt(current.tickets)} ingressos · {formatPrice(current.revenue)}
          </span>
        ) : (
          <span className="text-subtle">Passe o mouse sobre um dia para ver os números.</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[480px]" role="img" aria-label="Ingressos e receita por dia">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * (1 - f)} y2={PAD.top + innerH * (1 - f)} className="stroke-line" strokeDasharray="3 4" />
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="stroke-line-strong" />
          {data.map((d, i) => (
            <g key={d.date}>
              <rect
                x={x(i) - barW / 2}
                y={yT(d.tickets)}
                width={barW}
                height={Math.max(0, PAD.top + innerH - yT(d.tickets))}
                rx={3}
                className={active === i ? "fill-accent" : "fill-accent/60"}
              />
              {/* Área de toque da coluna inteira (maior que a barra). */}
              <rect
                x={PAD.left + step * i}
                y={PAD.top}
                width={step}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${dayLabel(d.date)}: ${d.tickets} ingressos, ${formatPrice(d.revenue)}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              />
              {i % labelEvery === 0 && (
                <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-subtle text-[11px]">
                  {dayLabel(d.date)}
                </text>
              )}
            </g>
          ))}
          <path d={line} fill="none" className="stroke-ink" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, i) => (
            <circle key={d.date} cx={x(i)} cy={yR(d.revenue)} r={active === i ? 4.5 : 2.5} className="fill-ink" />
          ))}
        </svg>
      </div>
    </div>
  );
}
