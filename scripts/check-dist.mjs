import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const INITIAL_JS_BUDGET_KB = 220;
const TEXT_EXTENSIONS = new Set([".html", ".js", ".mjs", ".css", ".json", ".txt", ".svg", ".xml", ".webmanifest", ""]);

const FORBIDDEN = [
  { label: "endereço local (localhost com porta)", pattern: /localhost:\d+/i },
  { label: "endereço local (127.0.0.1)", pattern: /127\.0\.0\.1/ },
  { label: "endereço local (0.0.0.0)", pattern: /\b0\.0\.0\.0:\d+/ },
  { label: "comentário de source map", pattern: /sourceMappingURL/ },
  { label: "nome de segredo do proxy", pattern: /PROXY_SHARED_SECRET|X-Proxy-Secret/i },
  { label: "nome de segredo do servidor ou do CI", pattern: /JWT_SECRET|PAYOUT_ENCRYPTION_KEY|CLOUDFLARE_API_TOKEN|SENTRY_AUTH_TOKEN/ },
  { label: "chave privada", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: "token do GitHub", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}|\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { label: "chave da AWS", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "chave do Google", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { label: "token do Slack", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { label: "chave do Stripe", pattern: /\b[sr]k_live_[A-Za-z0-9]{16,}/ },
  { label: "chave do Asaas", pattern: /\$aact_[A-Za-z0-9]{16,}/ },
  { label: "chave do Brevo", pattern: /\bxkeysib-[a-f0-9]{32,}/ },
  { label: "token do Sentry", pattern: /\bsntry[su]_[A-Za-z0-9_=+/-]{20,}/ },
  { label: "JWT", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { label: "URL de banco com senha", pattern: /\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis):\/\/[^\s"'`:@/]+:[^\s"'`@/]+@/i },
];

const SECRET_ENV_NAME = /SECRET|TOKEN|PASSWORD|PRIVATE|_KEY$/i;

const errors = [];
const fail = (message) => errors.push(message);

function expectedApiOrigin() {
  const raw = process.env.EXPECTED_API_ORIGIN || process.env.VITE_API_URL;
  if (!raw) {
    fail("Defina VITE_API_URL (ou EXPECTED_API_ORIGIN) com a URL da API do ambiente para conferir o connect-src.");
    return null;
  }
  try {
    const origin = new URL(raw).origin;
    if (!origin.startsWith("https://")) fail(`A API esperada precisa ser https: ${raw}`);
    return origin;
  } catch {
    fail(`URL da API inválida: ${raw}`);
    return null;
  }
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? listFiles(full) : [full];
    }),
  );
  return files.flat();
}

function connectSrc(csp) {
  const directive = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("connect-src "));
  return directive ? directive.slice("connect-src ".length).trim().split(/\s+/).join(" ") : null;
}

function headerCsp(headersFile) {
  let inRoot = false;
  for (const line of headersFile.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      inRoot = line.trim() === "/*";
      continue;
    }
    const match = line.trim().match(/^Content-Security-Policy:\s*(.+)$/i);
    if (inRoot && match) return match[1];
  }
  return null;
}

const distExists = await stat(dist).then((info) => info.isDirectory()).catch(() => false);
if (!distExists) {
  console.error("dist/ não existe. Rode npm run build antes.");
  process.exit(1);
}

const apiOrigin = expectedApiOrigin();
const files = await listFiles(dist);
const relative = (file) => path.relative(dist, file).split(path.sep).join("/");

for (const required of ["index.html", "_headers", "_routes.json"]) {
  if (!files.some((file) => relative(file) === required)) fail(`dist/${required} não foi gerado.`);
}

const secretValues = Object.entries(process.env)
  .filter(([name, value]) => SECRET_ENV_NAME.test(name) && typeof value === "string" && value.trim().length >= 16)
  .map(([name, value]) => ({ name, value: value.trim() }));

for (const file of files) {
  const name = relative(file);
  if (name.endsWith(".map")) {
    fail(`dist/${name}: arquivo de source map não pode ser publicado.`);
    continue;
  }
  if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
  const content = await readFile(file, "utf8");
  for (const { label, pattern } of FORBIDDEN) {
    const match = content.match(pattern);
    if (match) fail(`dist/${name}: ${label} encontrado ("${match[0].slice(0, 40)}").`);
  }
  for (const { name: envName, value } of secretValues) {
    if (content.includes(value)) fail(`dist/${name}: contém o valor da variável de ambiente ${envName}.`);
  }
}

if (apiOrigin) {
  const expected = `'self' ${apiOrigin}`;
  const headers = await readFile(path.join(dist, "_headers"), "utf8").catch(() => "");
  const csp = headerCsp(headers);
  if (!csp) {
    fail("dist/_headers não tem Content-Security-Policy em /*.");
  } else if (connectSrc(csp) !== expected) {
    fail(`dist/_headers: connect-src é "${connectSrc(csp)}", esperado "${expected}".`);
  } else if (!csp.includes("frame-ancestors 'none'")) {
    fail("dist/_headers: CSP sem frame-ancestors 'none'.");
  }

  const html = await readFile(path.join(dist, "index.html"), "utf8").catch(() => "");
  const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  if (!meta) {
    fail("dist/index.html não tem a CSP em <meta>.");
  } else if (connectSrc(meta[1]) !== expected) {
    fail(`dist/index.html: connect-src é "${connectSrc(meta[1])}", esperado "${expected}".`);
  }

  const bundle = files.filter((file) => /\.(js|mjs)$/.test(file));
  let foundApi = false;
  for (const file of bundle) {
    if ((await readFile(file, "utf8")).includes(apiOrigin)) foundApi = true;
  }
  if (!foundApi) fail(`Nenhum JS do dist/ contém a API esperada (${apiOrigin}).`);
}

const indexHtml = await readFile(path.join(dist, "index.html"), "utf8").catch(() => "");
const entryScripts = [...indexHtml.matchAll(/<script[^>]+type="module"[^>]+src="\/?([^"]+)"/g)].map((match) => match[1]);
const preloads = [...indexHtml.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\/?([^"]+)"/g)].map((match) => match[1]);
let initialGzip = 0;
for (const asset of new Set([...entryScripts, ...preloads])) {
  const buffer = await readFile(path.join(dist, asset)).catch(() => null);
  if (!buffer) {
    fail(`dist/index.html aponta para ${asset}, que não existe.`);
    continue;
  }
  initialGzip += gzipSync(buffer, { level: 9 }).length;
}
const initialKb = Math.round(initialGzip / 1024);
if (entryScripts.length === 0) fail("dist/index.html não tem script de entrada.");
if (initialKb > INITIAL_JS_BUDGET_KB) {
  fail(`JS inicial com ${initialKb} KB gzip, acima do orçamento de ${INITIAL_JS_BUDGET_KB} KB.`);
}

if (errors.length > 0) {
  console.error(`Checagem do dist/ falhou (${errors.length}):`);
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(`dist/ ok: ${files.length} arquivos, connect-src 'self' ${apiOrigin}, JS inicial ${initialKb} KB gzip (limite ${INITIAL_JS_BUDGET_KB} KB).`);
