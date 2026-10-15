import { safeRedirectPath } from "../utils/security";

export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_CALLBACK_PATH = "/auth/google/callback";
export const GOOGLE_STORAGE_KEY = "ticketfy.googleAuth";
export const GOOGLE_FLOW_MAX_AGE_MS = 10 * 60_000;

const STATE_BYTES = 32;
const VERIFIER_BYTES = 48;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export interface GoogleFlow {
  state: string;
  codeVerifier: string;
  from: string;
  createdAt: number;
}

export type GoogleCallbackError = "denied" | "invalid-state" | "missing-code" | "expired";

export type GoogleCallbackResult =
  | { ok: true; code: string; codeVerifier: string; redirectUri: string; from: string }
  | { ok: false; error: GoogleCallbackError; from: string };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64Url(buffer);
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export const googleClientId = (): string => (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();

export const isGoogleLoginEnabled = () => googleClientId() !== "";

export const googleRedirectUri = (origin: string) => `${origin}${GOOGLE_CALLBACK_PATH}`;

function sessionStore(): StorageLike | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

function readFlow(storage: StorageLike | null): GoogleFlow | null {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(GOOGLE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GoogleFlow>;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.codeVerifier !== "string" ||
      typeof parsed.createdAt !== "number" ||
      !BASE64URL.test(parsed.state) ||
      !BASE64URL.test(parsed.codeVerifier)
    ) {
      return null;
    }
    return { state: parsed.state, codeVerifier: parsed.codeVerifier, createdAt: parsed.createdAt, from: safeRedirectPath(parsed.from) };
  } catch {
    return null;
  }
}

function clearFlow(storage: StorageLike | null) {
  try {
    storage?.removeItem(GOOGLE_STORAGE_KEY);
  } catch {
    return;
  }
}

export async function buildGoogleAuthorization({
  clientId,
  origin,
  from,
  storage = sessionStore(),
  now = Date.now(),
}: {
  clientId: string;
  origin: string;
  from: unknown;
  storage?: StorageLike | null;
  now?: number;
}): Promise<string> {
  if (!clientId) throw new Error("Google client id is not configured");
  if (!storage) throw new Error("sessionStorage is not available");
  const flow: GoogleFlow = {
    state: randomToken(STATE_BYTES),
    codeVerifier: randomToken(VERIFIER_BYTES),
    from: safeRedirectPath(from),
    createdAt: now,
  };
  storage.setItem(GOOGLE_STORAGE_KEY, JSON.stringify(flow));
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    code_challenge: await codeChallenge(flow.codeVerifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params}`;
}

export async function startGoogleSignIn(from: unknown) {
  const url = await buildGoogleAuthorization({ clientId: googleClientId(), origin: window.location.origin, from });
  window.location.assign(url);
}

export function consumeGoogleCallback({
  search,
  origin,
  storage = sessionStore(),
  now = Date.now(),
}: {
  search: string;
  origin: string;
  storage?: StorageLike | null;
  now?: number;
}): GoogleCallbackResult {
  const params = new URLSearchParams(search);
  const flow = readFlow(storage);
  clearFlow(storage);
  const from = flow?.from ?? "/";
  const state = params.get("state");

  if (!flow || !state || state !== flow.state) return { ok: false, error: "invalid-state", from };
  if (now - flow.createdAt > GOOGLE_FLOW_MAX_AGE_MS || now < flow.createdAt - 60_000) return { ok: false, error: "expired", from };
  if (params.get("error")) return { ok: false, error: "denied", from };
  const code = params.get("code");
  if (!code || code.length > 2048) return { ok: false, error: "missing-code", from };
  return { ok: true, code, codeVerifier: flow.codeVerifier, redirectUri: googleRedirectUri(origin), from };
}

