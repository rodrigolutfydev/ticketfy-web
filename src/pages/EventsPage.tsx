// Página inicial: palco com o ingresso do destaque, busca de eventos e vitrine.
//
// Os filtros (q, city, category, page) ficam na URL (?q=jazz&city=Rio&category=MUSIC). Vantagens:
// o botão "voltar" do navegador desfaz uma busca, dá para compartilhar o
// link de uma busca e recarregar a página não perde nada.
// São só os filtros que a API aceita em GET /events: nome, cidade e categoria.

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, CalendarPlus, CalendarSearch, Check, MapPin, QrCode, Repeat, Search, Timer, X, Zap } from "lucide-react";
import { listEventCategories, listEvents } from "../api/endpoints";
import type { EventCategory, EventCategoryCount, EventSummary } from "../api/types";
import { CATEGORY_LABELS, EVENT_CATEGORIES, categoryLabel, parseCategoryParam } from "../i18n/categories";
import { showcaseSearchParams, visibleCategoryFilters } from "../utils/categoryFilters";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/LocaleContext";
import { useMe } from "../auth/useMe";
import EventCard, { EventCardSkeleton } from "../components/EventCard";
import PaperTicket from "../components/PaperTicket";
import CrossedTapes from "../components/CrossedTapes";
import UpcomingRail from "../components/UpcomingRail";
import Pagination from "../components/Pagination";
import { Empty, ErrorMessage } from "../components/StateMessage";
import { Button, ButtonLink } from "../components/ui";
import { isPast } from "../utils/format";
import { safeImageUrl } from "../utils/security";
import { upcomingForRail } from "../utils/rail";
import { useReveal, useScrollShift } from "../hooks/motion";
import { usePageTitle } from "../hooks/usePageTitle";

export default function EventsPage() {
  usePageTitle(null);
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const city = searchParams.get("city") ?? "";
  const category = parseCategoryParam(searchParams.get("category"));
  // Number("abc") é NaN: qualquer valor estranho em ?page= vira 0.
  const page = Math.max(0, Number.parseInt(searchParams.get("page") ?? "0", 10) || 0);
  const filtering = Boolean(q || city || category);

  // Estado dos campos (o que está sendo digitado) é separado do filtro
  // aplicado (o que está na URL): a busca só roda ao apertar Enter.
  const [qInput, setQInput] = useState(q);
  const [cityInput, setCityInput] = useState(city);
  // Se a URL mudar por fora (voltar do navegador), os campos acompanham.
  useEffect(() => {
    setQInput(q);
    setCityInput(city);
  }, [q, city]);

  // useQuery chama a API e guarda o resultado em cache pela queryKey.
  // Mudou a chave (outra busca, outra página) = nova chamada.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["events", { q, city, category, page, soldOut: false }],
    queryFn: () => listEvents({ q, city, category: category ?? undefined, page, soldOut: false }),
    placeholderData: (previous) => previous, // mantém a lista antiga enquanto a nova carrega
  });

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    setSearchParams(showcaseSearchParams({ q: qInput, city: cityInput, category }));
    document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" });
  }

  function selectCategory(next: EventCategory | null) {
    setSearchParams(showcaseSearchParams({ q, city, category: next }));
  }

  const categoriesQuery = useQuery({ queryKey: ["event-categories"], queryFn: listEventCategories });

  function goToPage(newPage: number) {
    setSearchParams({ ...Object.fromEntries(searchParams), page: String(newPage) });
    document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" });
  }

  // Ordena por data no navegador, para não depender da ordenação da API.
  const events = [...(data?.content ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  // Destaques escolhidos por um ADMIN (GET /events?featured=true).
  // O filtro no cliente garante o resultado mesmo se a API ignorar o parâmetro.
  const featuredQuery = useQuery({
    queryKey: ["events", { featured: true, soldOut: false }],
    queryFn: () => listEvents({ featured: true, soldOut: false, size: 8 }),
  });
  // Lista geral sem filtros: alimenta o carrossel "Próximos eventos" e o palco quando não há destaques.
  // A chave é a mesma da página inicial sem busca, então vem do cache.
  const spotlightQuery = useQuery({
    queryKey: ["events", { q: "", city: "", page: 0, soldOut: false }],
    queryFn: () => listEvents({ q: "", city: "", page: 0, soldOut: false }),
  });

  const byDate = (list: EventSummary[]) => list.filter((e) => !isPast(e.startsAt)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const featured = byDate((featuredQuery.data?.content ?? []).filter((e) => e.featured));
  const upcoming = byDate(spotlightQuery.data?.content ?? []);
  const railEvents = upcomingForRail(spotlightQuery.data?.content ?? []);
  // O ingresso do palco: o primeiro destaque com foto; senão qualquer destaque; senão o próximo evento.
  const pool = featured.length > 0 ? featured : upcoming;
  const heroEvent = pool.find((e) => safeImageUrl(e.imageUrl)) ?? pool[0] ?? null;

  // Faixa clara: os locais reais dos próximos eventos; sem locais suficientes, as categorias.
  const venues = upcoming.map((e) => e.venueName);
  const tapePaper = new Set(venues).size >= 3 ? venues : EVENT_CATEGORIES.filter((c) => c !== "OTHER").map((c) => CATEGORY_LABELS[locale][c]);

  const scrolledOnOpen = useRef(false);
  useEffect(() => {
    if (!filtering || !data || scrolledOnOpen.current) return;
    scrolledOnOpen.current = true;
    requestAnimationFrame(() => document.getElementById("eventos")?.scrollIntoView());
  }, [filtering, data]);

  return (
    <div>
      <Hero heroEvent={heroEvent} qInput={qInput} cityInput={cityInput} setQInput={setQInput} setCityInput={setCityInput} onSubmit={applyFilters} />

      <CrossedTapes paper={tapePaper} brand={t.look.home.tapeBrand} />

      {!filtering && railEvents.length > 0 && <UpcomingRail events={railEvents} eyebrow={t.look.home.upcomingEyebrow} title={t.look.home.upcomingTitle} />}

      <section id="eventos" className="page-container scroll-mt-28 pt-16 sm:pt-20" aria-labelledby="eventos-titulo">
        <SectionHeading
          id="eventos-titulo"
          eyebrow={t.look.home.allEyebrow}
          title={filtering ? t.storefront.searchResults : t.look.home.allTitle}
          subtitle={
            data && events.length > 0
              ? (filtering ? t.storefront.found : t.storefront.onSale)(data.page.totalElements)
              : undefined
          }
          action={
            filtering ? (
              <Button variant="secondary" size="sm" onClick={() => setSearchParams({})}>
                <X size={16} aria-hidden /> {t.storefront.clearSearch}
              </Button>
            ) : undefined
          }
        />

        <SearchBar
          variant="section"
          className="mb-8"
          qInput={qInput}
          cityInput={cityInput}
          setQInput={setQInput}
          setCityInput={setCityInput}
          onSubmit={applyFilters}
        />

        {categoriesQuery.data && <CategoryFilter counts={categoriesQuery.data} selected={category} onSelect={selectCategory} />}

        {isLoading && (
          <div className="grid gap-x-[22px] gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        )}
        {error && (
          <ErrorMessage
            message={errorMessage(error) ?? ""}
            action={
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                {t.common.retry}
              </Button>
            }
          />
        )}
        {data && events.length === 0 && (
          <Empty
            icon={<CalendarSearch size={30} />}
            title={filtering ? t.storefront.emptyFilteredTitle : t.storefront.emptyTitle}
            hint={filtering ? t.storefront.emptyFilteredHint : t.storefront.emptyHint}
          >
            {filtering ? (
              <Button variant="secondary" onClick={() => setSearchParams({})}>
                {t.storefront.clearSearch}
              </Button>
            ) : (
              <ButtonLink to="/organizer/events/new" variant="secondary">
                {t.storefront.createEvent}
              </ButtonLink>
            )}
          </Empty>
        )}
        {events.length > 0 && (
          <div className="grid gap-x-[22px] gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((event, i) => (
              <Reveal key={event.id} delay={(i % 4) * 80}>
                <EventCard event={event} />
              </Reveal>
            ))}
          </div>
        )}

        {data && <Pagination page={data.page.number} totalPages={data.page.totalPages} onChange={goToPage} />}
      </section>

      {!filtering && <HowItWorks />}

      <OrganizerBanner />
    </div>
  );
}

// Cards entram subindo, em sequência, quando aparecem na tela.
function Reveal({ delay, children }: { delay: number; children: ReactNode }) {
  const [ref, revealed] = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="tf-reveal grid" data-revealed={revealed} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

// Título de seção: rótulo laranja e título grande.
function SectionHeading({ id, eyebrow, title, subtitle, action }: { id?: string; eyebrow: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="text-[clamp(1.875rem,3.4vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-ink">
          {title}
        </h2>
        {subtitle && <p className="text-[1.0625rem] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function CategoryFilter({
  counts,
  selected,
  onSelect,
}: {
  counts: EventCategoryCount[];
  selected: EventCategory | null;
  onSelect: (category: EventCategory | null) => void;
}) {
  const { t, locale } = useI18n();
  const visible = visibleCategoryFilters(counts, selected);
  if (visible.length === 0) return null;
  const chip = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-[color,background-color,box-shadow] ${
      active
        ? "bg-accent/[0.18] text-ink shadow-[inset_0_0_0_1px_var(--accent-line)]"
        : "text-muted shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink hover:shadow-[inset_0_0_0_1px_var(--line-strong)]"
    }`;
  return (
    <div role="group" aria-label={t.storefront.categoryFilter} className="-mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      <button type="button" className={chip(selected === null)} aria-pressed={selected === null} onClick={() => onSelect(null)}>
        {t.storefront.allCategories}
      </button>
      {visible.map((entry) => (
        <button
          key={entry.category}
          type="button"
          className={chip(selected === entry.category)}
          aria-pressed={selected === entry.category}
          onClick={() => onSelect(selected === entry.category ? null : entry.category)}
        >
          {categoryLabel(entry.category, locale)} <span className="tabular font-normal opacity-75">{entry.events}</span>
        </button>
      ))}
    </div>
  );
}

interface HeroProps {
  heroEvent: EventSummary | null;
  qInput: string;
  cityInput: string;
  setQInput: (v: string) => void;
  setCityInput: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}

// Palco: foto do show em laranja ao fundo (também atrás do cabeçalho),
// título, atalhos, o ingresso do destaque e a busca em forma de ingresso.
function Hero({ heroEvent, qInput, cityInput, setQInput, setCityInput, onSubmit }: HeroProps) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const h = t.look.home;
  const trustIcons = [Timer, QrCode, Repeat];
  return (
    // O palco é sempre "noturno": data-theme="dark" vale só aqui dentro, inclusive no tema claro.
    <section data-theme="dark" className="relative isolate -mt-[76px] overflow-x-clip bg-canvas pt-[76px] text-ink" aria-labelledby="home-titulo">
      <div className="tf-hero-bg" aria-hidden />
      <div className="page-container">
        <div className="flex flex-col items-stretch gap-12 pt-6 lg:flex-row lg:items-center lg:justify-between lg:pt-12">
          <div className="flex max-w-[720px] flex-col gap-7">
            <h1 id="home-titulo" className="text-[clamp(2.625rem,6.4vw,5.75rem)] font-extrabold leading-none tracking-[-0.05em] text-ink">
              {h.title}
            </h1>
            <p className="max-w-[560px] text-[clamp(1.0625rem,1.5vw,1.3125rem)] leading-relaxed text-ink/85">{h.subtitle}</p>
            <div className="flex flex-col gap-3.5 sm:flex-row sm:flex-wrap">
              <a href="#eventos" className="tf-btn tf-btn-primary tf-btn-hero justify-between sm:justify-start">
                {h.seeEvents}
                <span className="tf-dot" aria-hidden>
                  <ArrowUpRight size={16} />
                </span>
              </a>
              <Link
                to={isAuthenticated ? "/account?tab=organizador" : "/register"}
                className="tf-btn inline-flex items-center justify-center rounded-full border border-ink/30 bg-canvas/45 px-[26px] py-[17px] font-semibold text-ink hover:border-ink"
              >
                {h.sellTickets}
              </Link>
            </div>
            <ul className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:gap-x-7">
              {h.trust.map((item, i) => {
                const Icon = trustIcons[i] ?? Check;
                return (
                  <li key={item} className="inline-flex items-center gap-2.5 font-medium text-ink">
                    <Icon size={20} className="shrink-0 text-accent-text" aria-hidden />
                    {item}
                  </li>
                );
              })}
            </ul>
          </div>
          {heroEvent && <PaperTicket event={heroEvent} />}
        </div>

        {/* Recolhe da direita para a esquerda quando o ingresso desce por cima dela. */}
        <SearchBar
          variant="hero"
          className="mb-16 mt-20 md:mt-24"
          qInput={qInput}
          cityInput={cityInput}
          setQInput={setQInput}
          setCityInput={setCityInput}
          onSubmit={onSubmit}
        />
      </div>
    </section>
  );
}

interface SearchBarProps {
  variant: "hero" | "section";
  className?: string;
  qInput: string;
  cityInput: string;
  setQInput: (v: string) => void;
  setCityInput: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}

// Busca em forma de ingresso: recortes nas laterais e o botão no "canhoto".
// Aparece duas vezes, com os mesmos campos:
// - "hero" (no palco): o ingresso do topo, ao descer, a empurra para fora; ela
//   se recolhe da direita para a esquerda (--repel, escrito pelo useHeroDrop
//   do PaperTicket) e reabre ao subir a página;
// - "section" (em Todos os eventos): abre da esquerda para a direita conforme
//   entra na tela (--scroll, do useScrollShift).
// O recolhimento tem duas etapas: primeiro sai a Cidade (o Buscar desliza
// para junto do nome), depois sai o resto. A do topo segue o ingresso mesmo
// com um campo focado por clique (se sumir de vez, o campo perde o foco); com
// foco de teclado (Tab) ela abre inteira, na frente do ingresso. A de "Todos
// os eventos" abre inteira com qualquer foco.
function SearchBar({ variant, className = "", qInput, cityInput, setQInput, setCityInput, onSubmit }: SearchBarProps) {
  const { t } = useI18n();
  const revealRef = useScrollShift<HTMLFormElement>(0);
  const { formRef, nameRef, goRef } = useSearchBarMetrics();
  const hero = variant === "hero";
  return (
    <form
      ref={(element) => {
        formRef.current = element;
        if (!hero) revealRef.current = element;
      }}
      role="search"
      aria-label={t.storefront.search}
      onSubmit={onSubmit}
      data-hero-repel={hero ? "" : undefined}
      className={`${hero ? "tf-hero-search" : "tf-search-reveal"} tf-cut-y relative flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-[inset_0_0_0_1px_var(--card-ring)] [--r:15px] md:flex-row ${className}`}
    >
      <label ref={nameRef} className="relative flex flex-[1.5] cursor-text items-center gap-3.5 px-6 py-[18px] transition-colors focus-within:bg-ink/[0.035] hover:bg-ink/[0.035] md:py-4 md:pl-10">
        <Search size={22} className="shrink-0 text-accent-text" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">{t.storefront.eventName}</span>
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            maxLength={100}
            enterKeyHint="search"
            autoComplete="off"
            placeholder={t.storefront.eventNamePlaceholder}
            className="w-full bg-transparent text-lg font-medium text-ink outline-none placeholder:text-ink/70 focus:placeholder:text-ink/40"
          />
        </span>
      </label>
      <span className="tf-search-city mx-6 h-px bg-line md:mx-0 md:my-6 md:h-auto md:w-px" aria-hidden />
      <label className="tf-search-city relative flex flex-1 cursor-text items-center gap-3.5 px-6 py-[18px] transition-colors focus-within:bg-ink/[0.035] hover:bg-ink/[0.035] md:px-7 md:py-4">
        <MapPin size={20} className="shrink-0 text-accent-text" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">{t.storefront.city}</span>
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            maxLength={100}
            enterKeyHint="search"
            autoComplete="address-level2"
            placeholder={t.storefront.cityPlaceholder}
            className="w-full bg-transparent text-lg font-medium text-ink outline-none placeholder:text-ink/70 focus:placeholder:text-ink/40"
          />
        </span>
      </label>
      <div ref={goRef} className="tf-search-go flex h-[86px] items-center border-t-2 border-dashed border-line px-4 md:h-auto md:border-l-2 md:border-t-0 md:py-5 md:pl-6 md:pr-7">
        <Button type="submit" size="lg" className="w-full md:w-auto">
          {t.storefront.search} <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </form>
  );
}

// Mede o espaço da parte "Cidade" (divisória + campo) na busca: a largura,
// quando os campos estão lado a lado, ou a altura, quando estão empilhados
// (celular). O CSS usa --city-w/--city-h para recolher só essa parte primeiro.
// offsetLeft/offsetTop ignoram os transforms do efeito: a medida é sempre a
// da busca aberta.
function useSearchBarMetrics() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const nameRef = useRef<HTMLLabelElement>(null);
  const goRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = formRef.current;
    const name = nameRef.current;
    const go = goRef.current;
    if (!form || !name || !go) return;
    const measure = () => {
      const nameRight = name.offsetLeft + name.offsetWidth;
      const nameBottom = name.offsetTop + name.offsetHeight;
      const stacked = go.offsetTop >= nameBottom - 1;
      form.style.setProperty("--city-w", `${stacked ? 0 : Math.max(0, go.offsetLeft - nameRight)}px`);
      form.style.setProperty("--city-h", `${stacked ? Math.max(0, go.offsetTop - nameBottom) : 0}px`);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(form);
    return () => observer.disconnect();
  }, []);
  return { formRef, nameRef, goRef };
}

// "Do clique à pista": o que a plataforma faz de verdade.
function HowItWorks() {
  const { t } = useI18n();
  const icons = [Zap, Timer, Repeat, CalendarPlus];
  return (
    <section className="page-container pt-24" aria-labelledby="como-titulo">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <p className="eyebrow">{t.look.home.howEyebrow}</p>
        <h2 id="como-titulo" className="text-[clamp(1.875rem,3.4vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-ink">
          {t.look.home.howTitle}
        </h2>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {t.look.home.features.map((feature, i) => {
          const Icon = icons[i] ?? Zap;
          return (
            <li
              key={feature.title}
              className="tf-panel flex flex-col gap-3.5 rounded-[20px] px-6 py-7 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[inset_0_0_0_1px_var(--accent-line)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent-soft text-accent-text">
                <Icon size={22} aria-hidden />
              </span>
              <h3 className="text-lg font-bold leading-tight tracking-[-0.03em] text-ink">{feature.title}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-muted">{feature.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Convite para organizadores, desenhado como um ingresso grande com canhoto.
function OrganizerBanner() {
  const { isAuthenticated } = useAuth();
  const { me, isLoading, isOrganizer } = useMe();
  const { t } = useI18n();

  // Enquanto não sabemos o papel do usuário, não mostra nada (evita o
  // convite "piscar" na tela de quem já é organizador).
  if (isAuthenticated && (isLoading || !me || isOrganizer)) return null;

  return (
    <section className="page-container scroll-mt-6 pb-8 pt-20" id="organizadores" aria-labelledby="organizadores-titulo">
      <div className="tf-cta">
        <div className="tf-cta-main flex flex-col justify-center gap-[18px] px-6 py-10 sm:px-14 sm:py-16">
          <p className="eyebrow inline-flex items-center gap-2.5 before:h-0.5 before:w-[26px] before:rounded before:bg-accent">{t.storefront.bannerEyebrow}</p>
          <h2 id="organizadores-titulo" className="max-w-[680px] text-balance text-[clamp(1.75rem,3.2vw,2.875rem)] font-extrabold leading-[1.06] tracking-[-0.045em] text-ink">
            {t.storefront.bannerTitle}
          </h2>
          <p className="max-w-[560px] text-lg text-muted">{t.storefront.bannerText}</p>
          <ul className="mt-1.5 flex flex-wrap gap-2.5">
            {t.look.home.ctaFeats.map((feat) => (
              <li key={feat} className="inline-flex items-center gap-2 rounded-full bg-ink/[0.04] px-3.5 py-2 text-sm font-medium text-ink shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
                <Check size={15} className="text-accent-text" aria-hidden />
                {feat}
              </li>
            ))}
          </ul>
        </div>
        <div className="tf-cta-stub flex flex-col items-start justify-center gap-5 px-6 py-7 sm:px-11">
          <p className="text-xs font-bold tracking-[0.18em] text-muted">{t.look.home.ctaKicker}</p>
          <p className="font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.04em] text-ink">{t.look.home.ctaBig}</p>
          <Link to={isAuthenticated ? "/account?tab=organizador" : "/register"} className="tf-btn tf-btn-primary tf-btn-hero w-full justify-between">
            {isAuthenticated ? t.storefront.bannerActivate : t.storefront.bannerStart}
            <span className="tf-dot" aria-hidden>
              <ArrowUpRight size={16} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
