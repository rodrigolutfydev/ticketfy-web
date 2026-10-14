import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import ErrorBoundary, { CHUNK_RELOAD_KEY, isChunkLoadError, reloadOnceForChunk, type ErrorBoundaryScope } from "./ErrorBoundary";
import { setLocale } from "../i18n/locale";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, String(value)),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
}

function boundary(scope: ErrorBoundaryScope = "page", resetKey = "/") {
  const instance = new ErrorBoundary({ scope, resetKey, children: createElement("p", null, "conteúdo da tela") });
  instance.setState = ((partial: object) => {
    instance.state = { ...instance.state, ...partial };
  }) as typeof instance.setState;
  return instance;
}

function crash(instance: ErrorBoundary, error: unknown) {
  instance.setState(ErrorBoundary.getDerivedStateFromError(error) as never);
  instance.componentDidCatch(error);
}

const html = (instance: ErrorBoundary) => renderToStaticMarkup(instance.render() as never);

const chunkError = () => new TypeError("Failed to fetch dynamically imported module: https://ticketfy.test/assets/OrdersPage-3f2a.js");

let storage: ReturnType<typeof memoryStorage>;
let reload: Mock<() => void>;

beforeEach(() => {
  setLocale("pt-BR");
  storage = memoryStorage();
  reload = vi.fn<() => void>();
  vi.stubGlobal("sessionStorage", storage);
  vi.stubGlobal("window", { location: { reload } });
});

describe("isChunkLoadError", () => {
  it("reconhece falhas de carregamento de pedaços de JS e CSS dos navegadores", () => {
    const errors = [
      chunkError(),
      new TypeError("error loading dynamically imported module: /assets/x.js"),
      new TypeError("Importing a module script failed."),
      new Error("Unable to preload CSS for /assets/index-abc.css"),
      new Error("Loading chunk 42 failed."),
      new Error("Loading CSS chunk admin-1 failed"),
      Object.assign(new Error("qualquer"), { name: "ChunkLoadError" }),
    ];
    for (const error of errors) expect(isChunkLoadError(error)).toBe(true);
  });

  it("não confunde erros comuns com falha de pedaço", () => {
    const values = [new Error("Cannot read properties of undefined"), new TypeError("x is not a function"), "Failed to fetch dynamically imported module", null, undefined, { message: "Importing a module script failed." }];
    for (const value of values) expect(isChunkLoadError(value)).toBe(false);
  });
});

describe("reloadOnceForChunk", () => {
  it("recarrega uma vez e grava a marca no sessionStorage", () => {
    expect(reloadOnceForChunk(storage, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem(CHUNK_RELOAD_KEY)).not.toBeNull();
  });

  it("com a marca já gravada, não recarrega de novo", () => {
    reloadOnceForChunk(storage, reload);
    expect(reloadOnceForChunk(storage, reload)).toBe(false);
    expect(reloadOnceForChunk(storage, reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("sem sessionStorage disponível, não recarrega para não arriscar laço", () => {
    expect(reloadOnceForChunk(null, reload)).toBe(false);
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(reloadOnceForChunk(broken, reload)).toBe(false);
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => undefined,
    };
    expect(reloadOnceForChunk(blocked, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("ErrorBoundary", () => {
  it("sem erro, mostra a tela normalmente", () => {
    expect(html(boundary())).toBe("<p>conteúdo da tela</p>");
  });

  it("erro de renderização mostra a tela de recuperação traduzida", () => {
    const instance = boundary();
    crash(instance, new Error("boom"));
    const markup = html(instance);

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Algo deu errado nesta tela");
    expect(markup).toContain("Tentar de novo");
    expect(markup).toContain("Voltar para o início");
    expect(markup).toContain('href="/"');
    expect(markup).not.toContain("conteúdo da tela");
    expect(reload).not.toHaveBeenCalled();
  });

  it("acompanha o idioma atual", () => {
    setLocale("en");
    const instance = boundary("app");
    crash(instance, new Error("boom"));
    const markup = html(instance);

    expect(markup).toContain("Something went wrong on this screen");
    expect(markup).toContain("Try again");
    expect(markup).toContain("Back to home");
    expect(markup).toContain("min-h-screen");
  });

  it("nunca mostra a mensagem nem o stack trace do erro", () => {
    const error = new Error("SECRET-detail token=abc");
    error.stack = "Error: SECRET-detail\n    at OrdersPage (https://ticketfy.test/assets/index-1a2b.js:10:20)";
    const instance = boundary();
    crash(instance, error);
    const markup = html(instance);

    expect(markup).not.toContain("SECRET");
    expect(markup).not.toContain("token=abc");
    expect(markup).not.toContain("index-1a2b.js");
    expect(markup).not.toMatch(/\bat\s+\w+\s*\(/);
  });

  it("\"Tentar de novo\" volta a mostrar a tela", () => {
    const instance = boundary();
    crash(instance, new Error("boom"));
    instance.retry();
    expect(html(instance)).toBe("<p>conteúdo da tela</p>");
    expect(reload).not.toHaveBeenCalled();
  });

  it("trocar de rota limpa o erro", () => {
    const instance = boundary("page", "/orders");
    crash(instance, new Error("boom"));
    instance.componentDidUpdate({ scope: "page", resetKey: "/orders", children: null });
    expect(instance.state.hasError).toBe(true);

    const previous = { scope: "page" as const, resetKey: "/orders", children: null };
    Object.assign(instance, { props: { ...instance.props, resetKey: "/tickets" } });
    instance.componentDidUpdate(previous);
    expect(instance.state.hasError).toBe(false);
  });

  it("pedaço de JS ausente depois de um deploy recarrega a página automaticamente", () => {
    const instance = boundary();
    crash(instance, chunkError());

    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem(CHUNK_RELOAD_KEY)).not.toBeNull();
    const markup = html(instance);
    expect(markup).toContain("Atualizando o site");
    expect(markup).not.toContain("Tentar de novo");
  });

  it("recarrega no máximo uma vez: se o pedaço continuar faltando, mostra a tela de recuperação", () => {
    crash(boundary(), chunkError());
    expect(reload).toHaveBeenCalledTimes(1);

    const afterReload = boundary();
    crash(afterReload, chunkError());
    crash(boundary("app"), chunkError());

    expect(reload).toHaveBeenCalledTimes(1);
    const markup = html(afterReload);
    expect(markup).toContain("Algo deu errado nesta tela");
    expect(markup).toContain("Tentar de novo");
  });

  it("depois do limite, \"Tentar de novo\" num erro de pedaço recarrega por ação do usuário", () => {
    storage.setItem(CHUNK_RELOAD_KEY, "1");
    const instance = boundary();
    crash(instance, chunkError());
    expect(reload).not.toHaveBeenCalled();

    instance.retry();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("erro comum não recarrega a página nem grava a marca", () => {
    crash(boundary(), new Error("boom"));
    expect(reload).not.toHaveBeenCalled();
    expect(storage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
  });
});
