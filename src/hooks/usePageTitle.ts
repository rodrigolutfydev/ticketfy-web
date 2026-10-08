import { useEffect } from "react";

// Muda o título da aba do navegador (ex.: "Meus ingressos | Ticketfy").
// Ajuda quem tem várias abas abertas, o histórico e os leitores de tela.
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} | Ticketfy` : "Ticketfy";
  }, [title]);
}
