// Capa do evento: a foto cadastrada pelo organizador ou, se não houver
// (ou se ela não carregar), uma capa desenhada no estilo da marca, com as
// iniciais do evento sobre um gradiente laranja. Nada de foto genérica:
// a capa gerada nunca finge ser a foto do evento.
//
// Segurança da imagem:
// - safeImageUrl só aceita https (veja utils/security.ts);
// - referrerPolicy="no-referrer": o site que hospeda a imagem não fica
//   sabendo de qual página do Ticketfy ela foi aberta;
// - a Content-Security-Policy limita imagens a https e ao próprio site;
// - <img> nunca executa script, mesmo que o arquivo seja malicioso.

import { useState } from "react";
import { safeImageUrl } from "../utils/security";
import { useI18n } from "../i18n/LocaleContext";

// Tons escuros que o laranja da marca (var(--accent)) encontra no gradiente.
// A escolha depende do nome, então o mesmo evento sempre tem a mesma capa.
export const COVER_DEPTHS = ["#3a0f05", "#1d0b33", "#2a0a14", "#0b0a0d", "#331a05"] as const;
const ANGLES = [0, 18, 32, 50, 68];

function hash(text: string) {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(h);
}

// Iniciais das duas primeiras palavras com letra ou número
// ("Marina Vale — Turnê Neon" vira "MV"). Sem nome, um "T" da marca.
export function coverInitials(name: string) {
  const words = name
    .normalize("NFC")
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0]!.toLocaleUpperCase("pt-BR"))
    .join("");
  return initials || "T";
}

// Fundo da capa gerada: laranja da marca no canto, indo para um tom escuro.
export function coverBackground(name: string) {
  const h = hash(name);
  const depth = COVER_DEPTHS[h % COVER_DEPTHS.length];
  const angle = ANGLES[Math.floor(h / COVER_DEPTHS.length) % ANGLES.length];
  return `radial-gradient(120% 95% at 100% 0%, var(--accent), ${depth} 72%), linear-gradient(${angle}deg, ${depth}, #020203)`;
}

// Capa gerada, sem depender do idioma (o texto alternativo vem de fora).
export function CoverFallback({ name, label, large = false, className = "" }: { name: string; label: string; large?: boolean; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative flex h-full w-full items-end overflow-hidden ${large ? "p-8" : "p-4"} ${className}`}
      style={{ background: coverBackground(name) }}
    >
      {/* Brilho violeta discreto, como as luzes de palco do layout. */}
      <span aria-hidden className="pointer-events-none absolute -bottom-1/3 -left-1/4 h-2/3 w-2/3 rounded-full bg-glow/25 blur-3xl" />
      <span
        aria-hidden
        className={`pointer-events-none absolute right-3 top-1 font-display font-extrabold leading-none tracking-[-0.06em] text-white/20 ${
          large ? "text-[11rem]" : "text-[6.5rem]"
        }`}
      >
        {coverInitials(name)}
      </span>
      <span aria-hidden className={`relative line-clamp-2 max-w-[85%] font-display font-bold leading-tight tracking-[-0.03em] text-white/90 ${large ? "text-2xl" : "text-sm"}`}>
        {name}
      </span>
    </div>
  );
}

interface Props {
  name: string;
  startsAt: string;
  imageUrl?: string | null;
  className?: string;
  // Na capa grande (página do evento) as letras aparecem maiores.
  large?: boolean;
  // "cover": preenche a caixa e corta as sobras (cartões pequenos).
  // "contain": mostra a foto INTEIRA, sem cortar nada.
  fit?: "cover" | "contain";
}

export default function EventCover({ name, imageUrl, className = "", large = false, fit = "cover" }: Props) {
  const { t } = useI18n();
  const src = safeImageUrl(imageUrl);
  // Guarda QUAL url falhou: se o organizador trocar a foto, a nova é tentada.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src && fit === "contain") {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        {/* A foto inteira, sem corte (object-contain). Fica "absolute" para
            nunca empurrar a altura da caixa: quem define o tamanho é o contêiner. */}
        <img
          src={src}
          alt={t.cover.photoAlt(name)}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>
    );
  }

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={t.cover.photoAlt(name)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        // text-transparent: enquanto a foto carrega, o texto alternativo não aparece por cima do card.
        className={`h-full w-full object-cover text-transparent ${className}`}
      />
    );
  }

  return <CoverFallback name={name} label={t.cover.generatedAlt(name)} large={large} className={className} />;
}
