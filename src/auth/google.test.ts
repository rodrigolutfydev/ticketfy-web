import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "../i18n/messages";
import { problemMessage } from "../i18n/problems";
import {
  GOOGLE_AUTHORIZE_URL,
  GOOGLE_FLOW_MAX_AGE_MS,
  GOOGLE_STORAGE_KEY,
  buildGoogleAuthorization,
  codeChallenge,
  consumeGoogleCallback,
  type GoogleCallbackError,
} from "./google";

const CLIENT_ID = "1234567890-abc123.apps.googleusercontent.com";
const ORIGIN = "https://ticketfy.example";
const NOW = 1_800_000_000_000;

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, String(value)),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

async function start(from: unknown = "/checkout?event=abc", storage = memoryStorage()) {
  const url = new URL(await buildGoogleAuthorization({ clientId: CLIENT_ID, origin: ORIGIN, from, storage, now: NOW }));
  const stored = JSON.parse(storage.data.get(GOOGLE_STORAGE_KEY) ?? "null");
  return { url, params: url.searchParams, stored, storage };
}

const sha256Base64Url = (value: string) => createHash("sha256").update(value).digest("base64url");

describe("PKCE", () => {
  it("is the unpadded base64url SHA-256 of the verifier", async () => {
    const verifier = "dBjftJeZ4CVP-mJ92K9mVOpe_nwt3B7nVjo-GmRObH0";
    const challenge = await codeChallenge(verifier);
    expect(challenge).toBe(sha256Base64Url(verifier));
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("sends the S256 challenge of the stored verifier", async () => {
    const { params, stored } = await start();
    expect(stored.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("code_challenge")).toBe(sha256Base64Url(stored.codeVerifier));
    expect(params.get("code_challenge")).not.toBe(stored.codeVerifier);
  });
});

describe("buildGoogleAuthorization", () => {
  it("redirects to Google with the expected parameters", async () => {
    const { url, params, stored } = await start();
    expect(`${url.origin}${url.pathname}`).toBe(GOOGLE_AUTHORIZE_URL);
    expect(params.get("client_id")).toBe(CLIENT_ID);
    expect(params.get("redirect_uri")).toBe(`${ORIGIN}/auth/google/callback`);
    expect(params.get("response_type")).toBe("code");
    expect(params.get("scope")).toBe("openid email profile");
    expect(params.get("prompt")).toBe("select_account");
    expect(params.get("state")).toBe(stored.state);
    expect(stored.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(stored.createdAt).toBe(NOW);
  });

  it("generates a new state and verifier on every attempt", async () => {
    const first = await start();
    const second = await start();
    expect(second.stored.state).not.toBe(first.stored.state);
    expect(second.stored.codeVerifier).not.toBe(first.stored.codeVerifier);
  });

  it("keeps where the user was going, but only inside the site", async () => {
    expect((await start("/checkout?event=abc")).stored.from).toBe("/checkout?event=abc");
    expect((await start("//evil.example/phish")).stored.from).toBe("/");
    expect((await start("https://evil.example")).stored.from).toBe("/");
    expect((await start("/auth/google/callback?code=x")).stored.from).toBe("/");
  });

  it("refuses to start without a client id or without storage", async () => {
    await expect(buildGoogleAuthorization({ clientId: "", origin: ORIGIN, from: "/", storage: memoryStorage() })).rejects.toThrow();
    await expect(buildGoogleAuthorization({ clientId: CLIENT_ID, origin: ORIGIN, from: "/", storage: null })).rejects.toThrow();
  });
});

describe("consumeGoogleCallback", () => {
  const search = (params: Record<string, string>) => `?${new URLSearchParams(params)}`;

  it("returns the code, verifier and redirect uri when the state matches, and forgets the flow", async () => {
    const { stored, storage } = await start();
    const result = consumeGoogleCallback({ search: search({ state: stored.state, code: "4/0AQ-code" }), origin: ORIGIN, storage, now: NOW + 5_000 });
    expect(result).toEqual({
      ok: true,
      code: "4/0AQ-code",
      codeVerifier: stored.codeVerifier,
      redirectUri: `${ORIGIN}/auth/google/callback`,
      from: "/checkout?event=abc",
    });
    expect(storage.data.has(GOOGLE_STORAGE_KEY)).toBe(false);
  });

  it("can only be used once", async () => {
    const { stored, storage } = await start();
    const params = search({ state: stored.state, code: "code" });
    expect(consumeGoogleCallback({ search: params, origin: ORIGIN, storage, now: NOW }).ok).toBe(true);
    expect(consumeGoogleCallback({ search: params, origin: ORIGIN, storage, now: NOW })).toMatchObject({ ok: false, error: "invalid-state" });
  });

  it("rejects a state that differs from the stored one, and still clears the flow", async () => {
    const { storage } = await start();
    const result = consumeGoogleCallback({ search: search({ state: "forged", code: "code" }), origin: ORIGIN, storage, now: NOW });
    expect(result).toEqual({ ok: false, error: "invalid-state", from: "/checkout?event=abc" });
    expect(storage.data.has(GOOGLE_STORAGE_KEY)).toBe(false);
  });

  it("rejects a callback without state or without a flow started in this tab", async () => {
    const { storage } = await start();
    expect(consumeGoogleCallback({ search: search({ code: "code" }), origin: ORIGIN, storage, now: NOW })).toMatchObject({ error: "invalid-state" });
    expect(consumeGoogleCallback({ search: search({ state: "x", code: "code" }), origin: ORIGIN, storage: memoryStorage(), now: NOW })).toEqual({
      ok: false,
      error: "invalid-state",
      from: "/",
    });
  });

  it("ignores a tampered flow in storage", () => {
    const storage = memoryStorage();
    storage.setItem(GOOGLE_STORAGE_KEY, JSON.stringify({ state: "<script>", codeVerifier: "v", createdAt: NOW, from: "//evil" }));
    expect(consumeGoogleCallback({ search: search({ state: "<script>", code: "c" }), origin: ORIGIN, storage, now: NOW })).toMatchObject({ error: "invalid-state", from: "/" });
    storage.setItem(GOOGLE_STORAGE_KEY, "{not json");
    expect(consumeGoogleCallback({ search: search({ state: "a", code: "c" }), origin: ORIGIN, storage, now: NOW })).toMatchObject({ error: "invalid-state" });
  });

  it("reports when the user cancels on Google", async () => {
    const { stored, storage } = await start();
    const result = consumeGoogleCallback({ search: search({ state: stored.state, error: "access_denied" }), origin: ORIGIN, storage, now: NOW });
    expect(result).toEqual({ ok: false, error: "denied", from: "/checkout?event=abc" });
  });

  it("reports a callback with the right state but no code", async () => {
    const { stored, storage } = await start();
    expect(consumeGoogleCallback({ search: search({ state: stored.state }), origin: ORIGIN, storage, now: NOW })).toMatchObject({ error: "missing-code" });
  });

  it("expires a flow started too long ago", async () => {
    const { stored, storage } = await start();
    const result = consumeGoogleCallback({ search: search({ state: stored.state, code: "c" }), origin: ORIGIN, storage, now: NOW + GOOGLE_FLOW_MAX_AGE_MS + 1 });
    expect(result).toMatchObject({ ok: false, error: "expired" });
  });
});

describe("Google sign-in messages", () => {
  const errors: GoogleCallbackError[] = ["denied", "invalid-state", "missing-code", "expired"];
  const problems = [
    "google-login-unavailable",
    "google-redirect-uri-not-allowed",
    "google-authorization-failed",
    "google-email-not-verified",
    "google-account-conflict",
    "google-unavailable",
    "password-not-set",
    "email-confirmation-mismatch",
  ];

  it.each(["pt-BR", "en"] as const)("has a text for every callback error and new problem type in %s", (locale) => {
    for (const error of errors) expect(MESSAGES[locale].google.errors[error]).toBeTruthy();
    const context = { status: 400, retryAfter: null, detail: null, properties: {} };
    const texts = problems.map((slug) => problemMessage(slug, context, undefined, locale));
    for (const text of texts) expect(text).toBeTruthy();
    expect(new Set(texts).size).toBe(problems.length);
  });

  it("does not show the same text in both languages", () => {
    const context = { status: 400, retryAfter: null, detail: null, properties: {} };
    for (const slug of problems) {
      expect(problemMessage(slug, context, undefined, "pt-BR")).not.toBe(problemMessage(slug, context, undefined, "en"));
    }
  });
});
