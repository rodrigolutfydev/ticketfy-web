import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { EventSummary } from "../api/types";
import { EventTicketCard, cardBadges, priceLine, type EventCardLabels } from "./EventCard";
import { COVER_DEPTHS, CoverFallback, coverBackground, coverInitials } from "./EventCover";

const labels: EventCardLabels = {
  featured: "Em destaque",
  soldOut: "Esgotado",
  seeTickets: "Ver lotes",
  tickets: "Ingressos",
  from: "a partir de",
  free: "Gratuito",
};

const event: EventSummary = {
  id: "0b1d6a1c-5b8e-4c1f-9d0a-1e2f3a4b5c6d",
  name: "Marina Vale — Turnê Neon",
  venueName: "Arena Horizonte",
  city: "Rio de Janeiro",
  startsAt: "2026-11-28T23:00:00Z",
  imageUrl: null,
  featured: true,
  minPrice: 180,
  soldOut: false,
  category: "MUSIC",
};

const render = (summary: EventSummary) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(EventTicketCard, {
        event: summary,
        labels,
        locale: "pt-BR",
        categoryText: "Música",
        cover: createElement(CoverFallback, { name: summary.name, label: `Capa do evento ${summary.name}` }),
      }),
    ),
  );

describe("priceLine", () => {
  it("mostra 'a partir de' com o menor preço formatado", () => {
    const line = priceLine(event, labels, "pt-BR");
    expect(line.prefix).toBe("a partir de");
    expect(line.value.replace(/\s/g, " ")).toBe("R$ 180,00");
    expect(line.muted).toBe(false);
  });

  it("mostra gratuito, sem preço e esgotado", () => {
    expect(priceLine({ ...event, minPrice: 0 }, labels, "pt-BR")).toEqual({ prefix: null, value: "Gratuito", muted: false });
    expect(priceLine({ ...event, minPrice: null }, labels, "pt-BR")).toEqual({ prefix: null, value: "Ingressos", muted: true });
    expect(priceLine({ ...event, soldOut: true }, labels, "pt-BR")).toEqual({ prefix: null, value: "Esgotado", muted: true });
  });
});

describe("cardBadges", () => {
  it("destaque aparece só quando o evento não está esgotado", () => {
    expect(cardBadges({ featured: true, soldOut: false }, labels).map((b) => b.key)).toEqual(["featured"]);
    expect(cardBadges({ featured: true, soldOut: true }, labels).map((b) => b.key)).toEqual(["sold"]);
    expect(cardBadges({ featured: false, soldOut: false }, labels)).toEqual([]);
  });
});

describe("EventTicketCard", () => {
  it("é um link para o evento com nome e data no rótulo acessível", () => {
    const html = render(event);
    expect(html).toContain(`href="/events/${event.id}"`);
    expect(html).toMatch(/aria-label="Marina Vale — Turnê Neon, [^"]+2026[^"]*"/);
  });

  it("tem a forma de ingresso recortada e o canhoto com data, local e preço", () => {
    const html = render(event);
    expect(html).toContain("tf-tk-shape tf-cut-y");
    expect(html).toContain(">28<");
    expect(html).toContain("Arena Horizonte · Rio de Janeiro");
    expect(html).toContain("Ver lotes");
    expect(html).toContain("Em destaque");
    expect(html).toContain("Música");
  });

  it("esgotado: sem botão de compra, com o selo e a foto apagada", () => {
    const html = render({ ...event, soldOut: true });
    expect(html).toContain("is-sold");
    expect(html).not.toContain("Ver lotes");
    expect(html).toContain("Esgotado");
  });

  it("escapa o nome do evento (texto, nunca HTML)", () => {
    const html = render({ ...event, name: "<img src=x onerror=alert(1)>" });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});

describe("capa gerada", () => {
  it("usa as iniciais das duas primeiras palavras, ignorando símbolos", () => {
    expect(coverInitials("Marina Vale — Turnê Neon")).toBe("MV");
    expect(coverInitials("  samba   no cais ")).toBe("SN");
    expect(coverInitials("Ópera")).toBe("Ó");
    expect(coverInitials("2026 Réveillon")).toBe("2R");
    expect(coverInitials("— ✦ —")).toBe("T");
  });

  it("é sempre a mesma para o mesmo evento e usa o laranja da marca", () => {
    const background = coverBackground("Samba no Cais");
    expect(background).toBe(coverBackground("Samba no Cais"));
    expect(background).toContain("var(--accent)");
    expect(COVER_DEPTHS.some((depth) => background.includes(depth))).toBe(true);
  });

  it("é uma imagem com texto alternativo, sem foto externa", () => {
    const html = renderToStaticMarkup(createElement(CoverFallback, { name: "Samba no Cais", label: "Capa do evento Samba no Cais" }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Capa do evento Samba no Cais"');
    expect(html).toContain(">SN<");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("url(");
  });
});
