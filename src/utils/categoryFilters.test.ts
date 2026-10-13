import { describe, expect, it } from "vitest";
import type { EventCategoryCount } from "../api/types";
import { showcaseSearchParams, visibleCategoryFilters } from "./categoryFilters";

const counts: EventCategoryCount[] = [
  { category: "MUSIC", events: 4 },
  { category: "THEATER", events: 0 },
  { category: "OTHER", events: 1 },
];

describe("visibleCategoryFilters", () => {
  it("hides categories without events", () => {
    expect(visibleCategoryFilters(counts, null).map((entry) => entry.category)).toEqual(["MUSIC", "OTHER"]);
  });

  it("keeps the selected category even without events", () => {
    expect(visibleCategoryFilters(counts, "THEATER").map((entry) => entry.category)).toEqual(["MUSIC", "THEATER", "OTHER"]);
  });
});

describe("showcaseSearchParams", () => {
  it("keeps name, city and category together", () => {
    expect(showcaseSearchParams({ q: " jazz ", city: "Rio", category: "MUSIC" })).toEqual({ q: "jazz", city: "Rio", category: "MUSIC" });
  });

  it("drops empty filters and resets the page", () => {
    expect(showcaseSearchParams({ q: "  ", city: "", category: null })).toEqual({});
  });

  it("limits the text filters to 100 characters", () => {
    expect(showcaseSearchParams({ q: "a".repeat(120) }).q).toHaveLength(100);
  });
});
