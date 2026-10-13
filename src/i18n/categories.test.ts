import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOCALES } from "./problems";
import { CATEGORY_LABELS, EVENT_CATEGORIES, categoryLabel, isEventCategory, parseCategoryParam } from "./categories";

const apiCategories = JSON.parse(readFileSync(new URL("./event-categories.json", import.meta.url), "utf8")) as string[];

describe("event-categories.json", () => {
  it("matches the categories the front knows, in the same order", () => {
    expect([...EVENT_CATEGORIES]).toEqual(apiCategories);
  });
});

describe.each(LOCALES)("category names for %s", (locale) => {
  it("has a non-empty name for every API category", () => {
    const missing = apiCategories.filter((category) => !CATEGORY_LABELS[locale][category as keyof (typeof CATEGORY_LABELS)[typeof locale]]?.trim());
    expect(missing).toEqual([]);
  });

  it("has no name for a category the API does not have", () => {
    const extra = Object.keys(CATEGORY_LABELS[locale]).filter((category) => !apiCategories.includes(category));
    expect(extra).toEqual([]);
  });
});

describe("helpers", () => {
  it("translates a category", () => {
    expect(categoryLabel("TALKS")).toBe("Palestras e congressos");
    expect(categoryLabel("OTHER")).toBe("Outros");
  });

  it("accepts only known categories from the URL", () => {
    expect(parseCategoryParam("MUSIC")).toBe("MUSIC");
    expect(parseCategoryParam("music")).toBeNull();
    expect(parseCategoryParam("CONCERTS")).toBeNull();
    expect(parseCategoryParam(null)).toBeNull();
    expect(isEventCategory(42)).toBe(false);
  });
});
