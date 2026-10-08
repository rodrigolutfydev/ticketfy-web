import { useEffect, useState } from "react";

// Mostra quanto falta para a reserva do pedido expirar (mm:ss).
// O relógio de verdade é o da API: quando o tempo acaba aqui, a tela
// recarrega o pedido para ver o status que a API decidiu.
export default function Countdown({ until, onExpire }: { until: string; onExpire?: () => void }) {
  const target = new Date(until).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const left = target - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    // Função de limpeza: o React chama ao sair da tela, e o intervalo para.
    return () => clearInterval(interval);
  }, [target, onExpire]);

  if (remaining <= 0) return <span className="font-semibold text-danger">reserva expirada</span>;

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 2 * 60 * 1000;

  return (
    // aria-live="off": o leitor de tela não anuncia cada segundo (seria insuportável).
    <span aria-live="off" className={`text-xl font-extrabold tabular-nums ${urgent ? "text-danger" : "text-warning"}`}>
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}
