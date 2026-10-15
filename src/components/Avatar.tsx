import { useState } from "react";
import { safeImageUrl } from "../utils/security";

// Foto de perfil, ou as iniciais do nome quando não há foto (ou ela falha ao carregar).
export default function Avatar({ name, url, size = 32 }: { name?: string; url?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?";
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) };

  const src = safeImageUrl(url); // só https, sem usuário/senha na URL
  if (src && !failed) {
    return (
      <img
        key={src}
        src={src}
        alt=""
        style={style}
        className="shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      style={style}
      className="font-display flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),#ffb27a)] font-bold text-accent-ink"
      aria-hidden
    >
      {initials}
    </span>
  );
}
