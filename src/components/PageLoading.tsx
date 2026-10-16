import { useEffect, useState } from "react";
import { useI18n } from "../i18n/LocaleContext";

// Enquanto o arquivo JS de uma tela sob demanda chega. Reserva a altura da
// tela (o rodapé não sobe e desce) e só mostra o indicador depois de 150 ms,
// para não piscar quando o arquivo já está no cache.
export default function PageLoading({ variant = "page" }: { variant?: "page" | "auth" | "section" }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const frame =
    variant === "auth"
      ? "flex min-h-screen items-center justify-center bg-black text-white/70"
      : variant === "section"
        ? "flex min-h-[320px] items-center justify-center text-muted"
        : "flex min-h-[60vh] items-center justify-center text-muted";
  return (
    <div className={frame} data-theme={variant === "auth" ? "dark" : undefined} role="status" aria-busy="true" aria-label={t.common.loading}>
      {visible && (
        <span className="flex items-center gap-3 text-[0.9375rem]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
          {t.common.loading}
        </span>
      )}
    </div>
  );
}
