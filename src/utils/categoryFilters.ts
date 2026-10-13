import type { EventCategory, EventCategoryCount } from "../api/types";

export function visibleCategoryFilters(counts: EventCategoryCount[], selected: EventCategory | null): EventCategoryCount[] {
  return counts.filter((entry) => entry.events > 0 || entry.category === selected);
}

export function showcaseSearchParams(filters: { q?: string; city?: string; category?: EventCategory | null }): Record<string, string> {
  const params: Record<string, string> = {};
  const q = filters.q?.trim();
  const city = filters.city?.trim();
  if (q) params.q = q.slice(0, 100);
  if (city) params.city = city.slice(0, 100);
  if (filters.category) params.category = filters.category;
  return params;
}
