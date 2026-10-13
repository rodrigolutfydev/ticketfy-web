import { describe, expect, it } from "vitest";
import { LOCALES } from "./locale";
import { VALIDATION_CODES, validationMessage } from "./validation";

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
