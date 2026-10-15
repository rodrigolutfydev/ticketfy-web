import { describe, expect, it } from "vitest";
import { LOCALES } from "./locale";
import { VALIDATION_CODES, constraintMessage, validationMessage, type ConstraintTarget } from "./validation";

describe.each([...LOCALES])("validation messages in %s", (locale) => {
  it("renders every code with and without params", () => {
    for (const code of VALIDATION_CODES) {
      for (const params of [{}, { min: 3, max: 30, integer: 8, fraction: 2, protocol: "https", allowed: ["pt-BR", "en"], expected: "EXCLUIR", documentType: "CPF", pixKeyType: "EMAIL" }]) {
        const text = validationMessage(code, params, locale);
        expect(text, code).toBeTruthy();
        expect(text, code).not.toMatch(/undefined|NaN|null|\[object/);
      }
    }
  });
});

describe("validation messages", () => {
  it("builds the sentence from the code and params", () => {
    expect(validationMessage("size", { min: 8, max: 72 }, "pt-BR")).toBe("Use de 8 a 72 caracteres.");
    expect(validationMessage("size", { max: 150 }, "pt-BR")).toBe("Use no máximo 150 caracteres.");
    expect(validationMessage("size", { min: 8, max: 72 }, "en")).toBe("Use 8 to 72 characters.");
    expect(validationMessage("url", { protocol: "https" }, "pt-BR")).toBe("Informe um endereço que comece com https://.");
    expect(validationMessage("one-of", { allowed: ["pt-BR", "en"] }, "en")).toBe("Choose pt-BR or en.");
    expect(validationMessage("confirmation", { expected: "EXCLUIR" }, "en")).toBe("Type EXCLUIR to confirm.");
    expect(validationMessage("confirmation", { allowed: ["EXCLUIR", "DELETE"] }, "pt-BR")).toBe("Digite EXCLUIR ou DELETE para confirmar.");
    expect(validationMessage("confirmation", { allowed: ["EXCLUIR", "DELETE"] }, "en")).toBe("Type EXCLUIR or DELETE to confirm.");
    expect(validationMessage("invalid-pix-key", { pixKeyType: "EMAIL" }, "pt-BR")).toBe("Chave Pix inválida para o tipo e-mail.");
    expect(validationMessage("count", { min: 1 }, "pt-BR")).toBe("Escolha pelo menos 1 item.");
  });

  it("falls back to a generic text for an unknown code", () => {
    expect(validationMessage("brand-new-rule", {}, "pt-BR")).toBe("Valor inválido.");
    expect(validationMessage(null, {}, "en")).toBe("Invalid value.");
  });
});

describe("constraint messages", () => {
  const validity = { valueMissing: false, typeMismatch: false, tooShort: false, tooLong: false, rangeUnderflow: false, rangeOverflow: false, stepMismatch: false, patternMismatch: false, badInput: false };
  const field = (overrides: Partial<ConstraintTarget> & { flags?: Partial<typeof validity> }) => ({
    type: "text",
    tagName: "INPUT",
    ...overrides,
    validity: { ...validity, ...overrides.flags },
  });

  it("explains each browser constraint in both languages", () => {
    expect(constraintMessage(field({ flags: { valueMissing: true } }), "pt-BR")).toBe("Campo obrigatório.");
    expect(constraintMessage(field({ flags: { valueMissing: true } }), "en")).toBe("This field is required.");
    expect(constraintMessage(field({ tagName: "SELECT", type: "select-one", flags: { valueMissing: true } }), "pt-BR")).toBe("Escolha uma opção.");
    expect(constraintMessage(field({ type: "email", flags: { typeMismatch: true } }), "pt-BR")).toBe("Informe um e-mail válido.");
    expect(constraintMessage(field({ type: "url", flags: { typeMismatch: true } }), "en")).toBe("Enter a valid address.");
    expect(constraintMessage(field({ minLength: 8, flags: { tooShort: true } }), "pt-BR")).toBe("Use pelo menos 8 caracteres.");
    expect(constraintMessage(field({ type: "number", min: "1", flags: { rangeUnderflow: true } }), "pt-BR")).toBe("Informe um valor a partir de 1.");
    expect(constraintMessage(field({ type: "number", max: "100", flags: { rangeOverflow: true } }), "en")).toBe("Enter a value of 100 or less.");
    expect(constraintMessage(field({ type: "datetime-local", min: "2026-12-10T20:00", flags: { rangeUnderflow: true } }), "pt-BR")).toBe("Escolha uma data a partir de 10/12/2026, 20:00.");
    expect(constraintMessage(field({ type: "number", flags: { badInput: true } }), "en")).toBe("Enter a number.");
  });
});
