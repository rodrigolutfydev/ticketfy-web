import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Tema claro/escuro. O valor inicial já foi aplicado no <html> pelo
// public/theme-init.js (antes do React carregar), então aqui só lemos
// o que está lá e passamos a controlar dali em diante.
//
// O tema fica no localStorage (persiste entre visitas). Não é dado
// sensível, então não há problema em guardar no navegador.

type Theme = "dark" | "light";
const STORAGE_KEY = "ticketfy.theme";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
  );

  // Sempre que o tema muda: atualiza o atributo do <html>, a cor da barra
  // do navegador no celular e o valor salvo.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0a0c11" : "#f4f5f7");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage bloqueado: o tema só não é lembrado */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
