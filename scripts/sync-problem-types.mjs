import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "src", "i18n", "problem-types.json");
const check = process.argv.includes("--check");

async function readSource() {
  const url = process.env.PROBLEM_TYPES_URL;
  if (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
    return { label: url, text: await response.text() };
  }
  const apiDir = path.resolve(root, process.env.API_DIR ?? "../api");
  const file = path.join(apiDir, "docs", "problem-types.json");
  return { label: file, text: await readFile(file, "utf8") };
}

function normalize(text, label) {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`${label} não tem uma lista de tipos de erro`);
  const types = parsed.map((entry) => {
    if (typeof entry?.slug !== "string" || !/^[a-z]+(-[a-z]+)*$/.test(entry.slug) || !Number.isInteger(entry?.status)) {
      throw new Error(`${label} tem um tipo de erro inválido: ${JSON.stringify(entry)}`);
    }
    return { slug: entry.slug, status: entry.status, title: typeof entry.title === "string" ? entry.title : "" };
  });
  return `${JSON.stringify(types, null, 2)}\n`;
}

const source = await readSource();
const next = normalize(source.text, source.label);
const current = await readFile(target, "utf8").catch(() => null);

if (check) {
  if (current !== next) {
    console.error(`src/i18n/problem-types.json está desatualizado em relação a ${source.label}. Rode npm run sync:problems.`);
    process.exit(1);
  }
  console.log(`src/i18n/problem-types.json está em dia com ${source.label}.`);
} else if (current === next) {
  console.log(`src/i18n/problem-types.json já está em dia com ${source.label}.`);
} else {
  await writeFile(target, next, "utf8");
  console.log(`src/i18n/problem-types.json atualizado a partir de ${source.label}.`);
}
