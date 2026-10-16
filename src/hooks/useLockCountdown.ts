import { useEffect, useState } from "react";

// Contagem regressiva de um bloqueio (Retry-After de um 429), de segundo em segundo.
export function useLockCountdown() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds] as const;
}
