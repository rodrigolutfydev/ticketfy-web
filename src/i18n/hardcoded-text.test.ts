import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync } from "oxc-parser";
import { describe, expect, it } from "vitest";

interface Finding {
  file: string;
  line: number;
  text: string;
}

type Node = { type?: string; start?: number; [key: string]: unknown };

const SRC = fileURLToPath(new URL("..", import.meta.url));

const TEXT_ATTRIBUTES = new Set([
  "label",
  "title",
  "placeholder",
  "aria-label",
  "aria-roledescription",
  "aria-valuetext",
  "alt",
  "hint",
  "description",
  "confirmLabel",
  "cancelLabel",
  "subtitle",
  "eyebrow",
  "text",
  "message",
]);

const PORTUGUESE_ACCENTS = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/;
const PORTUGUESE_WORDS =
  /(^|[^\p{L}])(não|você|vocês|para|com|de|do|da|dos|das|um|uma|seu|sua|seus|suas|ao|aos|no|na|nos|nas|pelo|pela|está|são|ou|mais|sem|já|ainda|aqui|este|esta|esse|essa)(?=$|[^\p{L}])/iu;
const HAS_LETTER = /\p{L}/u;

const ALLOWED: { file: string; text: string }[] = [
  { file: "components/Logo.tsx", text: "ticketfy" },
  { file: "pages/EventsPage.tsx", text: "TCK 018" },
  { file: "pages/admin/AdminAuditPage.tsx", text: "UUID" },
  { file: "pages/organizer/CheckInPage.tsx", text: "ABCD1234EFGH5678" },
  { file: "pages/organizer/CouponsTab.tsx", text: "BLACKFRIDAY" },
];

function lineOf(source: string, offset: number) {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) if (source.charCodeAt(i) === 10) line++;
  return line;
}

const looksPortuguese = (text: string) => PORTUGUESE_ACCENTS.test(text) || (/\s/.test(text.trim()) && PORTUGUESE_WORDS.test(text));
const isUrl = (text: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(text.trim());
const WRAPPERS = new Set(["ConditionalExpression", "LogicalExpression", "TemplateLiteral", "BinaryExpression", "JSXExpressionContainer", "ParenthesizedExpression"]);

function isVisible(parents: Node[]) {
  let container = false;
  for (let i = parents.length - 1; i >= 0; i--) {
    const node = parents[i];
    if (node.type === "JSXExpressionContainer") container = true;
    if (node.type === "BinaryExpression" && node.operator !== "+") return false;
    if (WRAPPERS.has(node.type ?? "")) continue;
    const name = attributeName(node);
    if (name !== null) return TEXT_ATTRIBUTES.has(name);
    return container && (node.type === "JSXElement" || node.type === "JSXFragment");
  }
  return false;
}

function attributeName(node: Node | undefined): string | null {
  if (!node || node.type !== "JSXAttribute") return null;
  const name = node.name as Node | undefined;
  return typeof name?.name === "string" ? name.name : null;
}

function findHardcodedText(file: string, source: string): Finding[] {
  const { program, errors } = parseSync(file, source);
  if (errors.length > 0) throw new Error(`${file}: ${errors[0].message}`);
  const findings: Finding[] = [];
  const report = (node: Node, text: string) =>
    findings.push({ file, line: lineOf(source, node.start ?? 0), text: text.trim().replace(/\s+/g, " ") });

  const visit = (node: unknown, parents: Node[]) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, parents));
      return;
    }
    const current = node as Node;
    const parent = parents[parents.length - 1];
    const visible = isVisible(parents);
    const skipped =
      parent?.type === "ImportDeclaration" ||
      parent?.type === "ExportNamedDeclaration" ||
      parent?.type === "ExportAllDeclaration" ||
      parent?.type === "TSLiteralType" ||
      parent?.type === "TSExternalModuleReference";

    let text: string | null = null;
    if (current.type === "JSXText" && typeof current.value === "string") {
      if (HAS_LETTER.test(current.value)) report(current, current.value);
    } else if (current.type === "Literal" && typeof current.value === "string") {
      text = current.value;
    } else if (current.type === "TemplateElement") {
      const value = current.value as { cooked?: string | null; raw: string };
      text = value.cooked ?? value.raw;
    }
    if (text !== null && !skipped && HAS_LETTER.test(text) && !isUrl(text) && (visible || looksPortuguese(text))) report(current, text);

    for (const [key, child] of Object.entries(current)) {
      if (key !== "type" && child && typeof child === "object") visit(child, [...parents, current]);
    }
  };

  visit(program, []);
  return findings;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === "i18n" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) && !/\.(test|d)\.ts$/.test(entry) ? [path] : [];
  });
}

const isAllowed = (finding: Finding) => ALLOWED.some((entry) => entry.file === finding.file && entry.text === finding.text);

describe("hardcoded text", () => {
  const findings = sourceFiles(SRC).flatMap((path) => {
    const file = relative(SRC, path).split("\\").join("/");
    return findHardcodedText(file, readFileSync(path, "utf8"));
  });

  it("keeps every visible text in the translation catalogs", () => {
    const leftovers = findings.filter((finding) => !isAllowed(finding)).map(({ file, line, text }) => `${file}:${line}: ${text}`);
    expect(leftovers).toEqual([]);
  });

  it("has no stale entry in the allow list", () => {
    const stale = ALLOWED.filter((entry) => !findings.some((finding) => finding.file === entry.file && finding.text === entry.text));
    expect(stale).toEqual([]);
  });
});

describe("findHardcodedText", () => {
  const scan = (source: string) => findHardcodedText("sample.tsx", source).map((finding) => finding.text);

  it("finds visible text in JSX and in text attributes, in any language", () => {
    expect(scan(`const a = <p className="text-muted">Pago</p>;`)).toEqual(["Pago"]);
    expect(scan(`const a = <Field label="Email" hint={"Use https"} />;`)).toEqual(["Email", "Use https"]);
    expect(scan("const a = <Alert>{`Faltam ${n} dias`}</Alert>;")).toEqual(["Faltam", "dias"]);
    expect(scan(`const a = <Button label={busy ? "Saving" : "Save"}>{ok && "Done"}</Button>;`)).toEqual(["Saving", "Save", "Done"]);
  });

  it("finds Portuguese sentences in plain strings", () => {
    expect(scan(`const label = "Cadastre os dados de recebimento";`)).toEqual(["Cadastre os dados de recebimento"]);
    expect(scan(`const label = "Pendência";`)).toEqual(["Pendência"]);
  });

  it("ignores comments, technical strings, imports, types and symbols", () => {
    expect(
      scan(`
        import { x } from "../utils/format";
        // texto explicando a regra para quem lê o código
        type Locale = "pt-BR" | "en";
        const css = "bg-success text-muted";
        const status = "PENDING";
        const url = "https://ticketfy.example/events?page=0";
        const cache = "no-store";
        const maps = "https://www.google.com/maps/search/?api=1&query=";
        const b = <Input placeholder="https://..." />;
        const c = <span>{formatDate(iso, locale)}</span>;
        const d = <div>{tab === "perfil" && <Profile />}{status === "closed" ? <A /> : null}</div>;
        const a = <a href="/help?tab=seguranca" className="rounded">{/* não aparece na tela */}{" · "}{"—"}</a>;
      `),
    ).toEqual([]);
  });
});
