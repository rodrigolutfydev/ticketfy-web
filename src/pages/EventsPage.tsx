// Página inicial: busca de eventos e vitrine.
//
// Os filtros (q, city, page) ficam na URL (?q=jazz&city=Rio). Vantagens:
// o botão "voltar" do navegador desfaz uma busca, dá para compartilhar o
// link de uma busca e recarregar a página não perde nada.

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarSearch, MapPin, Search, X } from "lucide-react";
import { listEvents } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import { safeImageUrl } from "../utils/security";
import EventCard, { EventCardSkeleton } from "../components/EventCard";
import FeaturedCarousel from "../components/FeaturedCarousel";
import Pagination from "../components/Pagination";
import { Empty, ErrorMessage } from "../components/StateMessage";
import { Button, ButtonLink, Skeleton } from "../components/ui";
import { Link } from "react-router";
import { isPast, plural } from "../utils/format";
import { usePageTitle } from "../hooks/usePageTitle";

export default function EventsPage() {
  usePageTitle(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const city = searchParams.get("city") ?? "";
  // Number("abc") é NaN: qualquer valor estranho em ?page= vira 0.
  const page = Math.max(0, Number.parseInt(searchParams.get("page") ?? "0", 10) || 0);
  const filtering = Boolean(q || city);

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
    queryKey: ["events", { q, city, page, soldOut: false }],
    queryFn: () => listEvents({ q, city, page, soldOut: false }),
    placeholderData: (previous) => previous, // mantém a lista antiga enquanto a nova carrega
  });

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (qInput.trim()) params.q = qInput.trim().slice(0, 100);
    if (cityInput.trim()) params.city = cityInput.trim().slice(0, 100);
    setSearchParams(params);
    document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" });
  }

  function goToPage(newPage: number) {
    setSearchParams({ ...Object.fromEntries(searchParams), page: String(newPage) });
    document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" });
  }

  // Ordena por data no navegador, para não depender da ordenação da API.
  const events = [...(data?.content ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  // A vitrine usa a lista SEM filtro (primeira página), numa consulta
  // separada da busca. Assim ela continua no topo enquanto a pessoa
  // pesquisa. A chave é a mesma da página inicial sem busca, então o
  // resultado já vem do cache, sem chamar a API de novo.
  // Destaques escolhidos por um ADMIN (GET /events?featured=true).
  // O filtro no cliente garante o resultado mesmo se a API ignorar o parâmetro.
  const featuredQuery = useQuery({
    queryKey: ["events", { featured: true, soldOut: false }],
    queryFn: () => listEvents({ featured: true, soldOut: false, size: 8 }),
  });
  // Lista geral sem filtros: reserva para a vitrine quando não há destaques.
  const spotlightQuery = useQuery({
    queryKey: ["events", { q: "", city: "", page: 0, soldOut: false }],
    queryFn: () => listEvents({ q: "", city: "", page: 0, soldOut: false }),
  });

  const byDate = (list: typeof events) => list.filter((e) => !isPast(e.startsAt)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const featured = byDate((featuredQuery.data?.content ?? []).filter((e) => e.featured));
  const upcoming = byDate(spotlightQuery.data?.content ?? []);
  const withPhoto = upcoming.filter((e) => safeImageUrl(e.imageUrl));
  const spotlightSource = featured.length > 0 ? featured : withPhoto.length > 0 ? withPhoto : upcoming;
  const spotlight = spotlightSource.filter((e) => safeImageUrl(e.imageUrl)).slice(0, 5);
  const spotlightLoading = featuredQuery.isLoading || spotlightQuery.isLoading;

  const scrolledOnOpen = useRef(false);
  useEffect(() => {
    if (!filtering || !data || scrolledOnOpen.current) return;
    scrolledOnOpen.current = true;
    requestAnimationFrame(() => document.getElementById("eventos")?.scrollIntoView());
  }, [filtering, data]);

  return (
    <div>
      {/* "Palco": a vitrine abre a página, só com as fotos dos destaques. */}
      {(spotlightLoading || spotlight.length > 0) && (
        <section className="pt-2" aria-labelledby="vitrine">
          <h2 id="vitrine" className="sr-only">
            Eventos em destaque
          </h2>
          {spotlightLoading ? (
            <Skeleton className="aspect-[4/3] rounded-2xl sm:aspect-[21/9] lg:aspect-auto lg:h-[420px] 2xl:h-[480px]" />
          ) : (
            <FeaturedCarousel events={spotlight} />
          )}
        </section>
      )}

      <Hero qInput={qInput} cityInput={cityInput} setQInput={setQInput} setCityInput={setCityInput} onSubmit={applyFilters} />

      {!filtering && featured.length > 0 && (
        <section className="pt-16" aria-labelledby="em-destaque">
          <SectionHeading id="em-destaque" title="Em destaque" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 4).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <section id="eventos" className="scroll-mt-24 pt-16">
        <SectionHeading
          title={filtering ? "Resultado da busca" : "Próximos eventos"}
          subtitle={
            data && events.length > 0
              ? plural(data.page.totalElements, filtering ? "evento encontrado" : "evento à venda", filtering ? "eventos encontrados" : "eventos à venda")
              : undefined
          }
          action={
            filtering ? (
              <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
                <X size={16} aria-hidden /> Limpar busca
              </Button>
            ) : undefined
          }
        />

        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        )}
        {error && <ErrorMessage message={error.message} action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Tentar de novo</Button>} />}
        {data && events.length === 0 && (
          <Empty
            icon={<CalendarSearch size={22} />}
            title={filtering ? "Nenhum evento com esses filtros" : "Nenhum evento à venda ainda"}
            hint={filtering ? "Tente outro nome ou outra cidade." : "Quando um organizador publicar um evento, ele aparece aqui."}
          >
            {!filtering && (
              <ButtonLink to="/organizer/events/new" variant="secondary">
                Criar um evento
              </ButtonLink>
            )}
          </Empty>
        )}
        {events.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {data && <Pagination page={data.page.number} totalPages={data.page.totalPages} onChange={goToPage} />}
      </section>

      <OrganizerBanner />
    </div>
  );
}

// Título de seção com o traço coral à esquerda, como no Figma.
function SectionHeading({ id, title, subtitle, action }: { id?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          <span className="section-rule" aria-hidden />
          {title}
        </h2>
        {subtitle && <p className="mt-2 pl-[1.1rem] text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface HeroProps {
  qInput: string;
  cityInput: string;
  setQInput: (v: string) => void;
  setCityInput: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}

function Hero({ qInput, cityInput, setQInput, setCityInput, onSubmit }: HeroProps) {
  return (
    <section className="pt-14 text-center sm:pt-20">
      <p className="eyebrow">Seu próximo momento</p>
      <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">Encontre seu próximo evento</h1>

      {/* Painel de busca com os recortes de ingresso nas laterais. role="search" marca a região para leitores de tela. */}
      <form
        role="search"
        onSubmit={onSubmit}
        className="elevated relative mx-auto mt-9 flex max-w-4xl flex-col rounded-2xl border border-line bg-surface p-2 text-left focus-within:border-line-strong sm:flex-row sm:items-center"
      >
        <span className="absolute -left-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 rounded-full border border-line bg-canvas sm:block" aria-hidden />
        <span className="absolute -right-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 rounded-full border border-line bg-canvas sm:block" aria-hidden />
        <label className="flex flex-1 items-center gap-3 px-4 py-3">
          <Search size={18} className="shrink-0 text-muted" aria-hidden />
          <span className="sr-only">Nome do evento</span>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            maxLength={100}
            enterKeyHint="search"
            placeholder="Busque pelo nome do evento"
            className="w-full bg-transparent text-ink outline-none placeholder:text-subtle"
          />
        </label>
        <span className="mx-4 h-px bg-line sm:mx-0 sm:h-8 sm:w-px" aria-hidden />
        <label className="flex items-center gap-3 px-4 py-3 sm:w-60">
          <MapPin size={18} className="shrink-0 text-muted" aria-hidden />
          <span className="sr-only">Cidade</span>
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            maxLength={100}
            enterKeyHint="search"
            placeholder="Todo o Brasil"
            className="w-full bg-transparent text-ink outline-none placeholder:text-subtle"
          />
        </label>
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          <Search size={17} aria-hidden /> Buscar
        </Button>
      </form>
    </section>
  );
}

function OrganizerBanner() {
  const { isAuthenticated } = useAuth();
  const { me, isLoading, isOrganizer } = useMe();

  // Enquanto não sabemos o papel do usuário, não mostra nada (evita o
  // convite "piscar" na tela de quem já é organizador).
  if (isAuthenticated && (isLoading || !me || isOrganizer)) return null;

  return (
    <section className="relative mt-24 overflow-hidden rounded-2xl bg-accent px-6 py-12 sm:px-14 sm:py-16">
      <div className="relative z-10 max-w-lg">
        <p className="text-[11px] font-bold tracking-[0.14em] text-accent-ink/75">PARA QUEM FAZ ACONTECER</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-accent-ink sm:text-[2.6rem]">Venda ingressos no Ticketfy</h2>
        <p className="mt-4 text-accent-ink/80">Crie seu evento, monte os lotes e acompanhe as vendas e o check-in em tempo real.</p>
        <Link
          to={isAuthenticated ? "/account?tab=organizador" : "/register"}
          className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#12161c] transition-colors hover:bg-white/90"
        >
          {isAuthenticated ? "Ativar conta de organizador" : "Começar agora"} <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
      <GiantTicket />
    </section>
  );
}

// Ingresso gigante decorativo do banner: canhoto com código e código de barras.
function GiantTicket() {
  const bars = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1];
  return (
    <div
      className="pointer-events-none absolute -right-10 top-1/2 hidden h-48 w-[26rem] -translate-y-1/2 rotate-[-7deg] rounded-xl bg-[#f4efe6] shadow-2xl lg:flex"
      aria-hidden
    >
      <span className="absolute -top-3 left-[62%] h-6 w-6 rounded-full bg-accent" />
      <span className="absolute -bottom-3 left-[62%] h-6 w-6 rounded-full bg-accent" />
      <div className="flex w-[62%] items-center pl-8">
        <span className="font-display text-4xl font-bold tracking-tight text-[#12161c]">TCK 018</span>
      </div>
      <div className="border-l-2 border-dashed border-[#12161c]/25" />
      <div className="flex flex-1 items-center gap-[3px] px-6">
        {bars.map((w, i) => (
          <span key={i} className="h-24 bg-[#12161c]" style={{ width: w * 2 }} />
        ))}
      </div>
    </div>
  );
}
