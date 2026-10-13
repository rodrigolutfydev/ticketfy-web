import { getLocale, type Locale } from "./locale";

export const VALIDATION_CODES = [
  "required",
  "size",
  "count",
  "email",
  "positive",
  "positive-or-zero",
  "digits",
  "future",
  "url",
  "one-of",
  "coupon-code",
  "confirmation",
  "invalid-document",
  "invalid-pix-key",
  "invalid",
] as const;

export type ValidationCode = (typeof VALIDATION_CODES)[number];

export type ValidationParams = Record<string, unknown>;

type ValidationMessage = (params: ValidationParams, locale: Locale) => string;

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const text = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value : null);
const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
const joinList = (items: string[], locale: Locale) =>
  new Intl.ListFormat(locale, { style: "long", type: "disjunction" }).format(items);

const PIX_KEY_TYPES_PT: Record<string, string> = { CPF: "CPF", CNPJ: "CNPJ", EMAIL: "e-mail", PHONE: "telefone", RANDOM: "chave aleatória" };
const PIX_KEY_TYPES_EN: Record<string, string> = { CPF: "CPF", CNPJ: "CNPJ", EMAIL: "email", PHONE: "phone", RANDOM: "random key" };

const PT_BR: Record<ValidationCode, ValidationMessage> = {
  required: () => "Campo obrigatório.",
  size: (params) => {
    const min = num(params.min);
    const max = num(params.max);
    if (min !== null && max !== null) return min === max ? `Use exatamente ${min} caracteres.` : `Use de ${min} a ${max} caracteres.`;
    if (max !== null) return `Use no máximo ${max} ${max === 1 ? "caractere" : "caracteres"}.`;
    if (min !== null) return `Use pelo menos ${min} ${min === 1 ? "caractere" : "caracteres"}.`;
    return "Tamanho inválido.";
  },
  count: (params) => {
    const min = num(params.min);
    const max = num(params.max);
    if (min !== null && max !== null) return `Escolha de ${min} a ${max} itens.`;
    if (max !== null) return `Escolha no máximo ${max} ${max === 1 ? "item" : "itens"}.`;
    if (min !== null) return `Escolha pelo menos ${min} ${min === 1 ? "item" : "itens"}.`;
    return "Quantidade de itens inválida.";
  },
  email: () => "Informe um e-mail válido.",
  positive: () => "Informe um valor maior que zero.",
  "positive-or-zero": () => "O valor não pode ser negativo.",
  digits: (params) => {
    const integer = num(params.integer);
    const fraction = num(params.fraction);
    if (integer !== null && fraction !== null) {
      return `Use até ${integer} dígitos antes da vírgula e ${fraction} ${fraction === 1 ? "casa decimal" : "casas decimais"}.`;
    }
    return "Número com dígitos demais.";
  },
  future: () => "Escolha uma data no futuro.",
  url: (params) => {
    const protocol = text(params.protocol);
    return protocol ? `Informe um endereço que comece com ${protocol}://.` : "Informe um endereço válido.";
  },
  "one-of": (params, locale) => {
    const allowed = list(params.allowed);
    return allowed.length > 0 ? `Escolha ${joinList(allowed, locale)}.` : "Escolha uma das opções.";
  },
  "coupon-code": (params) => {
    const min = num(params.min) ?? 3;
    const max = num(params.max) ?? 30;
    return `Use de ${min} a ${max} letras, números, - ou _.`;
  },
  confirmation: (params) => {
    const expected = text(params.expected);
    return expected ? `Digite ${expected} para confirmar.` : "Confirmação incorreta.";
  },
  "invalid-document": (params) => {
    const type = text(params.documentType);
    return type ? `${type} inválido.` : "Documento inválido.";
  },
  "invalid-pix-key": (params) => {
    const type = text(params.pixKeyType);
    return type ? `Chave Pix inválida para o tipo ${PIX_KEY_TYPES_PT[type] ?? type}.` : "Chave Pix inválida.";
  },
  invalid: () => "Valor inválido.",
};

const EN: Record<ValidationCode, ValidationMessage> = {
  required: () => "This field is required.",
  size: (params) => {
    const min = num(params.min);
    const max = num(params.max);
    if (min !== null && max !== null) return min === max ? `Use exactly ${min} characters.` : `Use ${min} to ${max} characters.`;
    if (max !== null) return `Use at most ${max} ${max === 1 ? "character" : "characters"}.`;
    if (min !== null) return `Use at least ${min} ${min === 1 ? "character" : "characters"}.`;
    return "Invalid length.";
  },
  count: (params) => {
    const min = num(params.min);
    const max = num(params.max);
    if (min !== null && max !== null) return `Choose ${min} to ${max} items.`;
    if (max !== null) return `Choose at most ${max} ${max === 1 ? "item" : "items"}.`;
    if (min !== null) return `Choose at least ${min} ${min === 1 ? "item" : "items"}.`;
    return "Invalid number of items.";
  },
  email: () => "Enter a valid email.",
  positive: () => "Enter a value greater than zero.",
  "positive-or-zero": () => "The value can't be negative.",
  digits: (params) => {
    const integer = num(params.integer);
    const fraction = num(params.fraction);
    if (integer !== null && fraction !== null) {
      return `Use up to ${integer} digits before the decimal point and ${fraction} ${fraction === 1 ? "decimal place" : "decimal places"}.`;
    }
    return "The number has too many digits.";
  },
  future: () => "Choose a date in the future.",
  url: (params) => {
    const protocol = text(params.protocol);
    return protocol ? `Enter an address that starts with ${protocol}://.` : "Enter a valid address.";
  },
  "one-of": (params, locale) => {
    const allowed = list(params.allowed);
    return allowed.length > 0 ? `Choose ${joinList(allowed, locale)}.` : "Choose one of the options.";
  },
  "coupon-code": (params) => {
    const min = num(params.min) ?? 3;
    const max = num(params.max) ?? 30;
    return `Use ${min} to ${max} letters, numbers, - or _.`;
  },
  confirmation: (params) => {
    const expected = text(params.expected);
    return expected ? `Type ${expected} to confirm.` : "Incorrect confirmation.";
  },
  "invalid-document": (params) => {
    const type = text(params.documentType);
    return type ? `Invalid ${type}.` : "Invalid document.";
  },
  "invalid-pix-key": (params) => {
    const type = text(params.pixKeyType);
    return type ? `Invalid Pix key for the ${PIX_KEY_TYPES_EN[type] ?? type} type.` : "Invalid Pix key.";
  },
  invalid: () => "Invalid value.",
};

export const VALIDATION_CATALOGS: Record<Locale, Record<ValidationCode, ValidationMessage>> = { "pt-BR": PT_BR, en: EN };

export const isValidationCode = (value: unknown): value is ValidationCode =>
  typeof value === "string" && (VALIDATION_CODES as readonly string[]).includes(value);

export function validationMessage(code: string | null, params: ValidationParams = {}, locale: Locale = getLocale()): string {
  const catalog = VALIDATION_CATALOGS[locale];
  return isValidationCode(code) ? catalog[code](params, locale) : catalog.invalid(params, locale);
}
