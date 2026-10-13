import { afterEach, describe, expect, it, vi } from "vitest";
import { browserLocale, detectLocale, getLocale, isLocale, matchLocale, setLocale, subscribeLocale } from "./locale";

afterEach(() => setLocale("pt-BR"));

describe("matchLocale", () => {
  it("maps any Portuguese or English tag to a supported language", () => {
    expect(matchLocale("pt-BR")).toBe("pt-BR");
    expect(matchLocale("pt-PT")).toBe("pt-BR");
    expect(matchLocale("PT")).toBe("pt-BR");
    expect(matchLocale("en-US")).toBe("en");
    expect(matchLocale("en")).toBe("en");
    expect(matchLocale("es-ES")).toBeNull();
    expect(matchLocale("")).toBeNull();
    expect(matchLocale(undefined)).toBeNull();
  });

  it("uses the first supported browser language", () => {
    expect(browserLocale(["es-ES", "en-GB", "pt-BR"])).toBe("en");
    expect(browserLocale(["fr-FR"])).toBeNull();
    expect(browserLocale(undefined)).toBeNull();
  });
});

describe("detectLocale", () => {
  it("prefers the saved choice, then the browser, then Portuguese", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    vi.stubGlobal("navigator", { languages: ["en-US"], language: "en-US" });
    expect(detectLocale()).toBe("en");

    storage.set("ticketfy.locale", "pt-BR");
    expect(detectLocale()).toBe("pt-BR");

    storage.set("ticketfy.locale", "fr");
    vi.stubGlobal("navigator", { languages: ["fr-FR"], language: "fr-FR" });
    expect(detectLocale()).toBe("pt-BR");
  });

  it("falls back to Portuguese when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    vi.stubGlobal("navigator", { languages: [], language: "" });
    expect(detectLocale()).toBe("pt-BR");
  });
});

describe("setLocale", () => {
  it("changes the current language and notifies listeners, ignoring unknown values", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLocale(listener);
    setLocale("en");
    expect(getLocale()).toBe("en");
    expect(listener).toHaveBeenCalledWith("en");
    setLocale("es" as never);
    expect(getLocale()).toBe("en");
    unsubscribe();
    setLocale("pt-BR");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("EN")).toBe(false);
  });
});
