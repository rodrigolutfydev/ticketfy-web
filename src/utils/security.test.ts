import { describe, expect, it } from "vitest";
import { isValidId, mapsUrl, normalizeTicketCode, safeImageUrl, safeRedirectPath } from "./security";

describe("safeRedirectPath", () => {
  it("aceita caminhos internos com query e fragmento", () => {
    expect(safeRedirectPath("/")).toBe("/");
    expect(safeRedirectPath("/tickets")).toBe("/tickets");
    expect(safeRedirectPath("/checkout?event=abc-1&items=a%3A2")).toBe("/checkout?event=abc-1&items=a%3A2");
    expect(safeRedirectPath("/orders/123#detalhe")).toBe("/orders/123#detalhe");
  });

  it("recusa valores que não são texto", () => {
    for (const value of [undefined, null, 42, true, {}, ["/tickets"], { pathname: "/tickets" }]) {
      expect(safeRedirectPath(value)).toBe("/");
    }
  });

  it("recusa URLs externas absolutas", () => {
    for (const value of ["https://evil.com", "http://evil.com/tickets", "HTTPS://EVIL.COM", "ftp://evil.com", "evil.com", "tickets"]) {
      expect(safeRedirectPath(value)).toBe("/");
    }
  });

  it("recusa caminhos que o navegador lê como outro domínio", () => {
    for (const value of ["//evil.com", "///evil.com", "//evil.com/tickets", "/\\evil.com", "/\\/evil.com", "/\\\\evil.com"]) {
      expect(safeRedirectPath(value)).toBe("/");
    }
  });

  it("recusa esquemas perigosos", () => {
    for (const value of ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)"]) {
      expect(safeRedirectPath(value)).toBe("/");
    }
  });

  it("recusa caracteres de controle que o navegador descarta ao montar a URL", () => {
    for (const value of ["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/tickets\u0000", "/\u007F"]) {
      expect(safeRedirectPath(value)).toBe("/");
    }
  });

  it("caminhos com encoding continuam no próprio site", () => {
    for (const value of ["/%2F%2Fevil.com", "/%2f%2fevil.com", "/%5Cevil.com", "/%5C%5Cevil.com", "/%09/evil.com", "/..%2F..%2Fevil.com"]) {
      const result = safeRedirectPath(value);
      expect(result).toBe(value);
      expect(new URL(result, "https://ticketfy.test").origin).toBe("https://ticketfy.test");
    }
  });

  it("caminhos com .. não saem do site", () => {
    const result = safeRedirectPath("/orders/../../evil.com");
    expect(new URL(result, "https://ticketfy.test").origin).toBe("https://ticketfy.test");
  });

  it("não volta para login, cadastro nem recuperação de senha, mesmo disfarçados", () => {
    for (const value of ["/login", "/login?next=/tickets", "/register", "/register#form", "/./login", "/tickets/../login", "/%2E/register", "/forgot-password", "/reset-password?token=abc"]) {
      expect(safeRedirectPath(value)).toBe("/");
    }
  });

  it("recusa destinos longos demais", () => {
    expect(safeRedirectPath(`/${"a".repeat(2048)}`)).toBe("/");
    expect(safeRedirectPath(`/${"a".repeat(100)}`)).toBe(`/${"a".repeat(100)}`);
  });

  it("usa o destino padrão informado", () => {
    expect(safeRedirectPath("https://evil.com", "/account")).toBe("/account");
    expect(safeRedirectPath(undefined, "/tickets")).toBe("/tickets");
  });
});

describe("isValidId", () => {
  it("aceita UUID, números e identificadores com hífen", () => {
    for (const value of ["3fa85f64-5717-4562-b3fc-2c963f66afa6", "42", "abc-DEF-123", "a".repeat(64)]) {
      expect(isValidId(value)).toBe(true);
    }
  });

  it("recusa vazio, nulo e longo demais", () => {
    for (const value of [null, undefined, "", "a".repeat(65)]) {
      expect(isValidId(value)).toBe(false);
    }
  });

  it("recusa tentativas de injeção na rota da API", () => {
    const attacks = [
      "..",
      "../users/me",
      "..%2Fusers%2Fme",
      "%2e%2e",
      "1/../../users/me",
      "1?admin=true",
      "1#fragment",
      "1&size=1000",
      "1;drop",
      "1 OR 1=1",
      "1'--",
      "<script>",
      "a/b",
      "a\\b",
      "a.b",
      "a_b",
      " 1",
      "1\n",
      "１２３",
      "ação",
    ];
    for (const value of attacks) {
      expect(isValidId(value)).toBe(false);
    }
  });
});

describe("safeImageUrl", () => {
  it("aceita https e devolve a URL normalizada", () => {
    expect(safeImageUrl("https://cdn.example.com/foto.jpg")).toBe("https://cdn.example.com/foto.jpg");
    expect(safeImageUrl("  https://cdn.example.com/a b.png  ")).toBe("https://cdn.example.com/a%20b.png");
    expect(safeImageUrl("HTTPS://CDN.EXAMPLE.COM/x.png")).toBe("https://cdn.example.com/x.png");
  });

  it("recusa vazio e nulo", () => {
    for (const value of [null, undefined, "", "   "]) {
      expect(safeImageUrl(value)).toBeNull();
    }
  });

  it("recusa esquemas que não são https", () => {
    const values = [
      "http://cdn.example.com/foto.jpg",
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:image/png;base64,iVBORw0KGgo=",
      "data:text/html,<script>alert(1)</script>",
      "blob:https://cdn.example.com/123",
      "file:///etc/passwd",
      "ftp://cdn.example.com/foto.jpg",
    ];
    for (const value of values) {
      expect(safeImageUrl(value)).toBeNull();
    }
  });

  it("recusa usuário e senha embutidos", () => {
    expect(safeImageUrl("https://user:pass@cdn.example.com/foto.jpg")).toBeNull();
    expect(safeImageUrl("https://user@cdn.example.com/foto.jpg")).toBeNull();
    expect(safeImageUrl("https://cdn.example.com@evil.com/foto.jpg")).toBeNull();
  });

  it("recusa texto que não é URL absoluta", () => {
    for (const value of ["foto.jpg", "/images/foto.jpg", "//cdn.example.com/foto.jpg", "https://", "not a url"]) {
      expect(safeImageUrl(value)).toBeNull();
    }
  });

  it("codifica caracteres que poderiam quebrar o atributo", () => {
    const result = safeImageUrl('https://cdn.example.com/a"onerror="alert(1).png');
    expect(result).not.toBeNull();
    expect(result).not.toContain('"');
  });
});

describe("normalizeTicketCode", () => {
  it("deixa só letras e números em maiúsculas", () => {
    expect(normalizeTicketCode("abcd-1234 efgh")).toBe("ABCD1234EFGH");
    expect(normalizeTicketCode("  a1/b2?c3#  ")).toBe("A1B2C3");
  });

  it("corta em 32 caracteres e remove o que não é ASCII", () => {
    expect(normalizeTicketCode("a".repeat(40))).toHaveLength(32);
    expect(normalizeTicketCode("ção<script>")).toBe("OSCRIPT");
  });
});

describe("mapsUrl", () => {
  it("codifica o endereço e não deixa sair do parâmetro", () => {
    const url = new URL(mapsUrl("Rua A, 10 & centro?x=1#y"));
    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("query")).toBe("Rua A, 10 & centro?x=1#y");
    expect(url.searchParams.get("x")).toBeNull();
    expect(url.hash).toBe("");
  });
});
