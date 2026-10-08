// Capa do evento: a foto cadastrada pelo organizador ou, se não houver
// (ou se ela não carregar), uma capa gerada a partir do nome e da data.
//
// Segurança da imagem:
// - safeImageUrl só aceita https (veja utils/security.ts);
// - referrerPolicy="no-referrer": o site que hospeda a imagem não fica
//   sabendo de qual página do Ticketfy ela foi aberta;
// - a Content-Security-Policy limita imagens a https e ao próprio site;
// - <img> nunca executa script, mesmo que o arquivo seja malicioso.

import { useState } from "react";
import { safeImageUrl } from "../utils/security";
import { dateParts } from "../utils/format";

// Fundos da capa gerada. A escolha depende do nome do evento, então o
// mesmo evento sempre tem a mesma capa.
const PALETTES = [
  ["#ff5a4e", "#5c140f"],
  ["#ff7a5c", "#3b1220"],
  ["#e8475b", "#2a0d1e"],
  ["#ff5a4e", "#1f2a44"],
  ["#f5a524", "#4a1d0a"],
];

function hash(text: string) {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(h);
}

interface Props {
  name: string;
  startsAt: string;
  imageUrl?: string | null;
  className?: string;
  // Na capa grande (página do evento) a data aparece maior.
  large?: boolean;
  // "cover": preenche a caixa e corta as sobras (cartões pequenos).
  // "contain": mostra a foto INTEIRA, sem cortar nada. O espaço que sobrar
  // dos lados fica com o fundo liso do tema.
  fit?: "cover" | "contain";
}

export default function EventCover({ name, startsAt, imageUrl, className = "", large = false, fit = "cover" }: Props) {
  const src = safeImageUrl(imageUrl);
  // Guarda QUAL url falhou: se o organizador trocar a foto, a nova é tentada.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src && fit === "contain") {
    return (
      // Fundo liso da cor do tema: as sobras ao redor da foto ficam como uma
      // moldura limpa, sem efeito de desfoque.
      <div className={`relative h-full w-full overflow-hidden bg-raised ${className}`}>
        {/* A foto inteira, sem corte (object-contain). Fica "absolute" para
            nunca empurrar a altura da caixa: quem define o tamanho é o
            contêiner, e a foto se ajusta dentro dele, seja vertical ou horizontal. */}
        <img
          src={src}
          alt={`Foto do evento ${name}`}
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
        alt={`Foto do evento ${name}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const [from, to] = PALETTES[hash(name) % PALETTES.length];
  const { day, month } = dateParts(startsAt);
  return (
    <div
      role="img"
      aria-label={`Capa do evento ${name}`}
      className={`relative flex h-full w-full items-end overflow-hidden p-5 ${className}`}
      style={{ background: `radial-gradient(120% 90% at 100% 0%, ${from}, ${to} 75%)` }}
    >
      {/* Data gigante vazada no canto: dá identidade sem precisar de foto. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-2 -top-4 font-extrabold leading-none tracking-tighter text-white/15 ${
          large ? "text-[11rem]" : "text-[7rem]"
        }`}
      >
        {day}
      </span>
      <span aria-hidden className={`relative font-extrabold uppercase leading-none text-white/85 ${large ? "text-2xl" : "text-sm"}`}>
        {month}
      </span>
    </div>
  );
}
