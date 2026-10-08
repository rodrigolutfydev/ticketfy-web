import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { configureClient } from "../api/client";

// Guarda a sessão: só o token JWT. Quem é o usuário e qual o papel dele
// vêm sempre da API (GET /users/me), nunca de uma marcação local, porque
// qualquer coisa guardada no navegador pode ser editada pelo usuário.
//
// Camadas de segurança da sessão:
// 1. Token no sessionStorage: some ao fechar a aba e não é compartilhado
//    entre abas (um link aberto em outra aba começa deslogado).
// 2. Formato e expiração conferidos antes de aceitar o token.
// 3. Expiração conferida de novo a cada 30 segundos.
// 4. Inatividade: 30 minutos sem mexer na página encerram a sessão
//    (protege quem esquece o computador aberto).
// 5. Qualquer 401 da API encerra a sessão.
// 6. Cache das consultas limpo no login e no logout: os dados de um
//    usuário nunca aparecem para o próximo.
//
// Sobre XSS: um script malicioso rodando na página conseguiria ler o
// sessionStorage. A defesa contra isso está em outro lugar: a
// Content-Security-Policy (vite.config.ts) e o fato de o React escapar
// todo texto exibido.

const TOKEN_KEY = "ticketfy.token";
const IDLE_LIMIT_MS = 30 * 60_000;
const CHECK_INTERVAL_MS = 30_000;

export type SignOutReason = "manual" | "expired" | "idle" | "unauthorized";

// Um JWT tem 3 partes em base64url separadas por ponto: cabeçalho.dados.assinatura.
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

// Lê o campo "exp" (expiração, em segundos) de dentro do token.
// Isto NÃO verifica a assinatura (só a API sabe a chave); serve apenas
// para não continuar usando um token que já sabemos estar vencido.
function decodeExp(token: string): number | null {
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const exp = JSON.parse(atob(base64)).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

function isUsable(token: string | null): token is string {
  if (!token || token.length > 4096 || !JWT_PATTERN.test(token)) return false;
  const exp = decodeExp(token);
  // Margem de 10 s: não manda um token que vai vencer no meio da requisição.
  return exp !== null && exp * 1000 > Date.now() + 10_000;
}

function readStoredToken() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (isUsable(token)) return token;
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage pode estar bloqueado (modo privado restrito): segue deslogado.
  }
  return null;
}

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  // Momento (em ms) em que o token vence, lido do próprio token. Só para exibição.
  expiresAt: number | null;
  // Motivo do último logout automático, para a tela de login explicar o que houve.
  lastSignOutReason: SignOutReason | null;
  signIn: (token: string) => void;
  signOut: (reason?: SignOutReason) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [lastSignOutReason, setLastSignOutReason] = useState<SignOutReason | null>(null);
  // useRef guarda um valor que muda sem redesenhar a tela (ideal para "última atividade").
  const lastActivity = useRef(Date.now());

  const signOut = useCallback(
    (reason: SignOutReason = "manual") => {
      try {
        sessionStorage.removeItem(TOKEN_KEY);
      } catch {
        /* nada a fazer */
      }
      setToken(null);
      setLastSignOutReason(reason === "manual" ? null : reason);
      queryClient.clear();
    },
    [queryClient]
  );

  const signIn = useCallback(
    (newToken: string) => {
      // Recusa qualquer coisa que não pareça um JWT válido e vigente.
      if (!isUsable(newToken)) {
        signOut("unauthorized");
        return;
      }
      queryClient.clear();
      try {
        sessionStorage.setItem(TOKEN_KEY, newToken);
      } catch {
        /* sem storage: a sessão vale só enquanto a página estiver aberta */
      }
      lastActivity.current = Date.now();
      setLastSignOutReason(null);
      setToken(newToken);
    },
    [queryClient, signOut]
  );

  // Fica no corpo do componente (e não num useEffect) para que a primeira
  // requisição das páginas filhas já saia com o token certo.
  configureClient({ getToken: () => token, onUnauthorized: () => signOut("unauthorized") });

  // Registra atividade do usuário (clique, tecla, toque, rolagem).
  useEffect(() => {
    if (!token) return;
    const touch = () => {
      lastActivity.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, touch, { passive: true }));
    return () => events.forEach((name) => window.removeEventListener(name, touch));
  }, [token]);

  // Verificação periódica: token vencido ou usuário inativo há muito tempo.
  useEffect(() => {
    if (!token) return;
    const check = () => {
      if (!isUsable(token)) signOut("expired");
      else if (Date.now() - lastActivity.current > IDLE_LIMIT_MS) signOut("idle");
    };
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    // Ao voltar para a aba depois de um tempo, confere na hora (o setInterval
    // fica mais lento em abas escondidas).
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, signOut]);

  // useMemo evita criar um objeto novo a cada render (o que redesenharia
  // todos os componentes que usam useAuth sem necessidade).
  const value = useMemo(
    () => {
      const exp = token ? decodeExp(token) : null;
      return { token, isAuthenticated: token !== null, expiresAt: exp ? exp * 1000 : null, lastSignOutReason, signIn, signOut };
    },
    [token, lastSignOutReason, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro do AuthProvider");
  return context;
}
