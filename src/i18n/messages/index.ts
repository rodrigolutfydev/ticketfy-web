import type { Locale } from "../locale";
import { en } from "./en";
import { ptBR } from "./pt-BR";

export type Messages = typeof ptBR;

export const MESSAGES: Record<Locale, Messages> = { "pt-BR": ptBR, en };
