import { describe, expect, it } from "vitest";
import { CATEGORY_LABELS } from "./categories";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locale";
import { MESSAGES } from "./messages";
import { CATALOGS } from "./problems";
import { VALIDATION_CATALOGS } from "./validation";

type Kind = "text" | "function";

function keyPaths(value: unknown, prefix = ""): Map<string, Kind> {
  const paths = new Map<string, Kind>();
  if (typeof value === "string") {
    paths.set(prefix, "text");
  } else if (typeof value === "function") {
    paths.set(prefix, "function");
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      for (const [path, kind] of keyPaths(child, prefix ? `${prefix}.${key}` : key)) paths.set(path, kind);
    }
  }
  return paths;
}

function differences(reference: unknown, other: unknown) {
  const expected = keyPaths(reference);
  const actual = keyPaths(other);
  return {
    missing: [...expected.keys()].filter((path) => !actual.has(path)),
    extra: [...actual.keys()].filter((path) => !expected.has(path)),
    kind: [...expected].filter(([path, kind]) => actual.has(path) && actual.get(path) !== kind).map(([path]) => path),
  };
}

function emptyTexts(value: unknown) {
  return [...keyPaths(value)].filter(([, kind]) => kind === "text").map(([path]) => path).filter((path) => {
    const text = path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], value);
    return typeof text !== "string" || text.trim() === "";
  });
}

const MODULES: Record<string, Record<Locale, unknown>> = {
  messages: MESSAGES,
  problems: CATALOGS,
  validation: VALIDATION_CATALOGS,
  categories: CATEGORY_LABELS,
};

const others = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

describe("translation coverage", () => {
  it("compares every language with the default one", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
    expect(others.length).toBeGreaterThan(0);
  });

  for (const [name, catalogs] of Object.entries(MODULES)) {
    describe(name, () => {
      it.each(others)(`has the same keys in ${DEFAULT_LOCALE} and %s`, (locale) => {
        expect(differences(catalogs[DEFAULT_LOCALE], catalogs[locale])).toEqual({ missing: [], extra: [], kind: [] });
      });

      it.each([...LOCALES])("has no empty text in %s", (locale) => {
        expect(emptyTexts(catalogs[locale])).toEqual([]);
      });
    });
  }

  it("detects a key that exists in one language and is missing in the other", () => {
    const reference = { title: "Título", nested: { action: (n: number) => `${n}` }, list: ["a", "b"] };
    const incomplete = { nested: { action: "fixo" }, list: ["a"], more: "extra" };
    expect(differences(reference, incomplete)).toEqual({
      missing: ["title", "list.1"],
      extra: ["more"],
      kind: ["nested.action"],
    });
  });
});
