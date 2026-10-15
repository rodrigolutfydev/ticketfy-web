import type { ReactNode } from "react";

// Placa neon das telas de "algo saiu do roteiro" (404, erro, atualização).
// Foto da placa laranja ao fundo e a palavra grande acesa, piscando de leve
// (o pisca-pisca some com "menos movimento"). Não depende do idioma: os
// textos chegam prontos.
export default function NeonSign({
  word,
  title,
  hint,
  children,
  compact = false,
  wordSize = "text-[clamp(96px,18vw,220px)]",
}: {
  word: string;
  title: ReactNode;
  hint: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  wordSize?: string;
}) {
  return (
    <div className={`tf-neon-wrap w-full px-6 py-12 ${compact ? "min-h-[420px]" : "min-h-[520px]"}`}>
      <div>
        <p className={`tf-neon ${wordSize}`} aria-hidden>
          {word}
        </p>
        <h1 className="mt-[18px] font-display text-[clamp(22px,3vw,34px)] font-extrabold tracking-[-0.03em]">{title}</h1>
        <p className="mx-auto mt-3 max-w-[460px] text-[#d6d1db]">{hint}</p>
        {children && <div className="mt-[26px] flex flex-col justify-center gap-3 sm:flex-row">{children}</div>}
      </div>
    </div>
  );
}
