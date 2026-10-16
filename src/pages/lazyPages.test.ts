import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const app = source("../App.tsx");
const lazyPages = source("./lazyPages.ts");
const INITIAL = ["./EventDetailPage", "./EventsPage", "./LoginPage", "./RegisterPage", "./NotFoundPage"];

describe("telas sob demanda", () => {
  it("só home, página do evento, entrar, criar conta e não encontrado entram no pacote inicial", () => {
    const eager = [...app.matchAll(/^import \w+ from "\.\/pages\/(\w+)";$/gm)].map((match) => match[1]).sort();
    expect(eager).toEqual(INITIAL.map((file) => file.slice(2)).sort());
  });

  it("toda outra tela e os layouts de organizador e admin vêm por import()", () => {
    const pages = [
      ...readdirSync(new URL(".", import.meta.url)).filter((file) => file.endsWith("Page.tsx")).map((file) => `./${file}`),
      ...readdirSync(new URL("./organizer", import.meta.url)).filter((file) => /(Page|Layout)\.tsx$/.test(file)).map((file) => `./organizer/${file}`),
      ...readdirSync(new URL("./admin", import.meta.url)).filter((file) => file.endsWith("Page.tsx")).map((file) => `./admin/${file}`),
      "../components/OrganizerLayout.tsx",
      "../components/AdminLayout.tsx",
    ]
      .map((file) => file.replace(/\.tsx$/, ""))
      .filter((file) => !INITIAL.includes(file));

    for (const page of pages) expect(lazyPages, page).toContain(`import("${page}")`);
    expect(app).not.toMatch(/from "\.\/components\/(OrganizerLayout|AdminLayout)"/);
  });

  it("nenhuma tela do pacote inicial importa uma tela sob demanda diretamente", () => {
    for (const page of [...INITIAL.map((file) => `${file}.tsx`), "../components/Layout.tsx"]) {
      expect(source(page), page).not.toMatch(/from "\.\/(?!lazyPages|NotFoundPage)\w+Page"|from "\.\.\/pages\//);
    }
  });
});
