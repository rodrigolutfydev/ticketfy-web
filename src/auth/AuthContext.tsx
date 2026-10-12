import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  adoptSession,
  clearSession,
  configureClient,
  getSession,
  refreshSession,
  sendLogout,
  setSession,
  type Session,
} from "../api/client";
import type { TokenResponse } from "../api/types";

const HAS_SESSION_KEY = "ticketfy.hasSession";
const ACTIVITY_KEY = "ticketfy.lastActivity";
const CHANNEL_NAME = "ticketfy-auth";
const IDLE_LIMIT_MS = 30 * 60_000;
const CHECK_INTERVAL_MS = 30_000;
const ACTIVITY_WRITE_MS = 15_000;
const PROACTIVE_REFRESH_MS = 60_000;

export type AuthStatus = "checking" | "authenticated" | "anonymous";
export type SignOutReason = "manual" | "expired" | "idle" | "unauthorized" | "suspended";

const SIGN_OUT_REASONS: readonly SignOutReason[] = ["manual", "expired", "idle", "unauthorized", "suspended"];

type AuthMessage =
  | { type: "login"; session: Session }
  | { type: "refreshed"; session: Session }
  | { type: "logout"; reason: SignOutReason };

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function removeStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    return;
  }
}

function storedActivity(): number {
  const value = Number(readStorage(ACTIVITY_KEY));
  return Number.isFinite(value) && value > 0 && value <= Date.now() + 60_000 ? value : 0;
}

interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  isChecking: boolean;
  expiresAt: number | null;
  lastSignOutReason: SignOutReason | null;
  signIn: (data: TokenResponse) => void;
  replaceSession: (data: TokenResponse) => void;
  signOut: (reason?: SignOutReason, options?: { notifyServer?: boolean }) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(() => (readStorage(HAS_SESSION_KEY) ? "checking" : "anonymous"));
  const [session, setSessionState] = useState<Session | null>(null);
  const [lastSignOutReason, setLastSignOutReason] = useState<SignOutReason | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const localActivity = useRef(0);
  const lastActivityWrite = useRef(0);
  const lastRefreshAt = useRef(0);

  const lastActivity = useCallback(() => Math.max(localActivity.current, storedActivity()), []);

  const markActivity = useCallback((force = false) => {
    const now = Date.now();
    localActivity.current = now;
    if (!force && now - lastActivityWrite.current < ACTIVITY_WRITE_MS) return;
    lastActivityWrite.current = now;
    writeStorage(ACTIVITY_KEY, String(now));
  }, []);

  const broadcast = useCallback((message: AuthMessage) => {
    try {
      channel.current?.postMessage(message);
    } catch {
      return;
    }
  }, []);

  const applySession = useCallback((next: Session) => {
    lastRefreshAt.current = Date.now();
    writeStorage(HAS_SESSION_KEY, "1");
    setSessionState(next);
    setStatus("authenticated");
  }, []);

  const finish = useCallback(
    (reason: SignOutReason) => {
      clearSession();
      removeStorage(HAS_SESSION_KEY);
      setSessionState(null);
      setStatus("anonymous");
      setLastSignOutReason(reason === "manual" ? null : reason);
      queryClient.clear();
    },
    [queryClient]
  );

  const signOut = useCallback(
    (reason: SignOutReason = "manual", options: { notifyServer?: boolean } = {}) => {
      if (options.notifyServer ?? true) sendLogout();
      finish(reason);
      broadcast({ type: "logout", reason });
    },
    [finish, broadcast]
  );

  const signIn = useCallback(
    (data: TokenResponse) => {
      const next = setSession(data);
      if (!next) {
        signOut("unauthorized");
        return;
      }
      queryClient.clear();
      markActivity(true);
      setLastSignOutReason(null);
      applySession(next);
      broadcast({ type: "login", session: next });
    },
    [queryClient, markActivity, applySession, broadcast, signOut]
  );

  const replaceSession = useCallback(
    (data: TokenResponse) => {
      const next = setSession(data);
      if (!next) {
        signOut("unauthorized");
        return;
      }
      applySession(next);
      broadcast({ type: "refreshed", session: next });
    },
    [applySession, broadcast, signOut]
  );

  configureClient({
    onRefreshed: (next) => {
      applySession(next);
      broadcast({ type: "refreshed", session: next });
    },
    onSessionEnded: (reason) => {
      finish(reason);
      broadcast({ type: "logout", reason });
    },
  });

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const current = new BroadcastChannel(CHANNEL_NAME);
    channel.current = current;
    current.onmessage = (event: MessageEvent) => {
      const message = event.data as Partial<AuthMessage> | null;
      if (!message || typeof message !== "object") return;
      if (message.type === "login" || message.type === "refreshed") {
        const next = adoptSession(message.session);
        if (!next) return;
        if (message.type === "login") {
          queryClient.clear();
          setLastSignOutReason(null);
        }
        applySession(next);
      } else if (message.type === "logout") {
        const reason = SIGN_OUT_REASONS.includes(message.reason as SignOutReason) ? (message.reason as SignOutReason) : "unauthorized";
        finish(reason);
      }
    };
    return () => {
      current.close();
      if (channel.current === current) channel.current = null;
    };
  }, [queryClient, applySession, finish]);

  useEffect(() => {
    if (!readStorage(HAS_SESSION_KEY) || getSession()) return;
    const last = storedActivity();
    if (last > 0 && Date.now() - last > IDLE_LIMIT_MS) {
      sendLogout();
      finish("idle");
      return;
    }
    markActivity(true);
    refreshSession().catch(() => {
      if (!getSession()) setStatus("anonymous");
    });
  }, [finish, markActivity]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const touch = () => markActivity();
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, touch, { passive: true }));
    return () => events.forEach((name) => window.removeEventListener(name, touch));
  }, [status, markActivity]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const check = () => {
      if (getSession() && Date.now() - lastActivity() > IDLE_LIMIT_MS) signOut("idle");
    };
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, lastActivity, signOut]);

  useEffect(() => {
    if (!session) return;
    const delay = Math.max(session.expiresAt - Date.now() - PROACTIVE_REFRESH_MS, 0);
    const timer = setTimeout(() => {
      if (lastActivity() > lastRefreshAt.current) refreshSession().catch(() => undefined);
    }, delay);
    return () => clearTimeout(timer);
  }, [session, lastActivity]);

  const value = useMemo(
    () => ({
      status,
      isAuthenticated: status === "authenticated",
      isChecking: status === "checking",
      expiresAt: session?.expiresAt ?? null,
      lastSignOutReason,
      signIn,
      replaceSession,
      signOut,
    }),
    [status, session, lastSignOutReason, signIn, replaceSession, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro do AuthProvider");
  return context;
}
