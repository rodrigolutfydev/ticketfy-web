import type { EventCategory } from "../api/types";
import { getLocale, type Locale } from "./locale";

export const EVENT_CATEGORIES: readonly EventCategory[] = [
  "MUSIC",
  "THEATER",
  "COMEDY",
  "PARTIES",
  "SPORTS",
  "COURSES",
  "TALKS",
  "ARTS",
  "FOOD",
  "KIDS",
  "OTHER",
];

export const CATEGORY_LABELS: Record<Locale, Record<EventCategory, string>> = {
  "pt-BR": {
    MUSIC: "Música",
    THEATER: "Teatro",
    COMEDY: "Humor",
    PARTIES: "Festas",
    SPORTS: "Esportes",
    COURSES: "Cursos e workshops",
    TALKS: "Palestras e congressos",
    ARTS: "Arte e exposições",
    FOOD: "Gastronomia",
    KIDS: "Infantil",
    OTHER: "Outros",
  },
  en: {
    MUSIC: "Music",
    THEATER: "Theater",
    COMEDY: "Comedy",
    PARTIES: "Parties",
    SPORTS: "Sports",
    COURSES: "Courses and workshops",
    TALKS: "Talks and conferences",
    ARTS: "Art and exhibitions",
    FOOD: "Food and drink",
    KIDS: "Kids",
    OTHER: "Other",
  },
};

export const isEventCategory = (value: unknown): value is EventCategory =>
  typeof value === "string" && (EVENT_CATEGORIES as readonly string[]).includes(value);

export function categoryLabel(category: EventCategory, locale: Locale = getLocale()): string {
  return CATEGORY_LABELS[locale][category] ?? category;
}

export function parseCategoryParam(value: string | null): EventCategory | null {
  return isEventCategory(value) ? value : null;
}
