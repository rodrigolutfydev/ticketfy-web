import type { ReactNode } from "react";
import { Link } from "react-router";
import Logo from "./Logo";

// "Porta de entrada": tela dividida. À esquerda (só no computador), um painel
// escuro com a frase da marca; à direita, o formulário.
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-[#07090c] lg:block" aria-hidden>
        {/* Luz de palco: brilho coral vindo de cima e piso escuro. */}
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgb(255_90_78/0.35),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,#07090c_25%,transparent)]" />
        <StageCrowd />
        <div className="absolute bottom-14 left-14 right-14">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#ff6f64]">SEU PRÓXIMO MOMENTO</p>
          <p className="font-display mt-3 text-6xl font-bold leading-[0.95] tracking-[-0.03em] text-[#f2f4f7] xl:text-7xl">
            Começa
            <br />
            por aqui.
          </p>
        </div>
      </aside>

      <div className="flex flex-col">
        <div className="flex h-16 items-center justify-between px-6 sm:px-10">
          <Logo />
          <Link to="/" className="text-sm font-medium text-muted hover:text-ink">
            Voltar para o início
          </Link>
        </div>
        <main id="conteudo" className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-sm">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">{title}</h1>
            <p className="mb-8 mt-2 text-muted">{subtitle}</p>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Silhueta de público diante do palco, desenhada em SVG (sem foto externa).
function StageCrowd() {
  const heads = Array.from({ length: 22 }, (_, i) => ({
    x: 20 + i * 28 + (i % 3) * 6,
    y: 470 + ((i * 37) % 30),
    r: 14 + ((i * 13) % 6),
  }));
  return (
    <svg viewBox="0 0 640 640" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5a4e" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ff5a4e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="150,0 210,0 330,520 60,520" fill="url(#beam)" />
      <polygon points="430,0 490,0 580,520 310,520" fill="url(#beam)" />
      <polygon points="300,0 340,0 420,520 220,520" fill="url(#beam)" opacity="0.6" />
      {heads.map((h, i) => (
        <g key={i} fill="#030405">
          <circle cx={h.x} cy={h.y} r={h.r} />
          <rect x={h.x - h.r * 1.5} y={h.y + h.r * 0.6} width={h.r * 3} height={200} rx={h.r} />
        </g>
      ))}
      <rect x="0" y="560" width="640" height="80" fill="#030405" />
    </svg>
  );
}
