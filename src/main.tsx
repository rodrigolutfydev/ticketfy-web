// Ponto de entrada: monta o React dentro da <div id="root"> do index.html.
//
// A ordem dos "Providers" importa: cada um disponibiliza algo para tudo
// que está dentro dele.
//   QueryClientProvider -> cache das chamadas à API (TanStack Query)
//   AuthProvider        -> sessão (usa o QueryClient para limpar o cache)
//   ThemeProvider       -> tema claro/escuro
//   BrowserRouter       -> navegação entre telas sem recarregar a página

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "./api/client";
import { AuthProvider } from "./auth/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ServerWakeNotice from "./components/ServerWakeNotice";
import { LocaleProvider } from "./i18n/LocaleContext";
import { detectLocale, setLocale } from "./i18n/locale";
import { ThemeProvider } from "./theme/ThemeContext";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Dados "frescos" por 30 s: navegar entre telas não repete a mesma consulta.
      staleTime: 30_000,
      // Não insiste em erros que não mudam ao tentar de novo (403, 404...).
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
    },
  },
});

setLocale(detectLocale());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary scope="app">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LocaleProvider>
            <ThemeProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
              <ServerWakeNotice />
            </ThemeProvider>
          </LocaleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
