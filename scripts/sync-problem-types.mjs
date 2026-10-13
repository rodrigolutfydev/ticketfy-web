import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

const CONTRACTS = [
  {
    file: "problem-types.json",
    urlEnv: "PROBLEM_TYPES_URL",
    normalize(parsed, label) {
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`${label} não tem uma lista de tipos de erro`);
      return parsed.map((entry) => {
        if (typeof entry?.slug !== "string" || !/^[a-z]+(-[a-z]+)*$/.test(entry.slug) || !Number.isInteger(entry?.status)) {
          throw new Error(`${label} tem um tipo de erro inválido: ${JSON.stringify(entry)}`);
        }
        const reasons = entry.reasons ?? [];
        if (!Array.isArray(reasons) || reasons.some((reason) => typeof reason !== "string" || !/^[a-z]+(-[a-z]+)*$/.test(reason))) {
          throw new Error(`${label} tem motivos inválidos em ${entry.slug}: ${JSON.stringify(entry.reasons)}`);
        }
        return { slug: entry.slug, status: entry.status, title: typeof entry.title === "string" ? entry.title : "", reasons };
      });
    },
  },
  {
    file: "event-categories.json",
    urlEnv: "EVENT_CATEGORIES_URL",
    normalize(parsed, label) {
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`${label} não tem uma lista de categorias`);
      return parsed.map((entry) => {
        if (typeof entry !== "string" || !/^[A-Z]+(_[A-Z]+)*$/.test(entry)) {
          throw new Error(`${label} tem uma categoria inválida: ${JSON.stringify(entry)}`);
        }
        return entry;
      });
    },
  },
];

async function readSource(contract) {
  const url = process.env[contract.urlEnv];
  if (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
    return { label: url, text: await response.text() };
  }
  const apiDir = path.resolve(root, process.env.API_DIR ?? "../api");
  const file = path.join(apiDir, "docs", contract.file);
  return { label: file, text: await readFile(file, "utf8") };
}

let outdated = false;
for (const contract of CONTRACTS) {
  const target = path.join(root, "src", "i18n", contract.file);
  const relative = `src/i18n/${contract.file}`;
  const source = await readSource(contract);
  const next = `${JSON.stringify(contract.normalize(JSON.parse(source.text), source.label), null, 2)}\n`;
  const current = await readFile(target, "utf8").catch(() => null);

  if (check) {
    if (current !== next) {
      console.error(`${relative} está desatualizado em relação a ${source.label}. Rode npm run sync:problems.`);
      outdated = true;
    } else {
      console.log(`${relative} está em dia com ${source.label}.`);
    }
  } else if (current === next) {
    console.log(`${relative} já está em dia com ${source.label}.`);
  } else {
    await writeFile(target, next, "utf8");
    console.log(`${relative} atualizado a partir de ${source.label}.`);
  }
}

if (outdated) process.exit(1);
