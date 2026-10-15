// Moldura de todas as telas: cabeçalho, conteúdo (<Outlet/>) e rodapé.
// <Outlet/> é o "buraco" onde o React Router coloca a tela da rota atual.

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, matchPath, useLocation, useNavigate } from "react-router";
import { ArrowLeft, CircleQuestionMark, LogOut, Menu, Moon, ReceiptText, Sun, Ticket, UserRound, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import { useI18n } from "../i18n/LocaleContext";
import { useTheme } from "../theme/ThemeContext";
import Avatar from "./Avatar";
import CheckoutSteps from "./CheckoutSteps";
import ErrorBoundary from "./ErrorBoundary";
import FlashNotice from "./FlashNotice";
import LanguageSwitcher from "./LanguageSwitcher";
import Logo, { Wordmark } from "./Logo";
import { ButtonLink } from "./ui";
import { PRIVACY_CONTACT_EMAIL, privacyContactHref } from "../utils/contact";

export default function Layout() {
  const { isAuthenticated, isChecking, signOut } = useAuth();
  const { me, isOrganizer, isAdmin } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const checkoutStep = getCheckoutStep(location.pathname);
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register" || location.pathname.startsWith("/auth/");
  const isHome = location.pathname === "/";
  const page = (
    <ErrorBoundary scope="page" resetKey={location.pathname}>
      <Outlet />
    </ErrorBoundary>
  );

  // Cabeçalho transparente sobre o palco da home; ganha fundo de vidro ao rolar.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const glassHeader = !isHome || scrolled || mobileOpen;

  // Ao trocar de tela: fecha o menu do celular e volta ao topo.
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  function handleSignOut() {
    signOut();
    navigate("/");
  }

  // Links principais. Os de comprador só aparecem para quem está logado.
  // Telas de entrada (login/cadastro) têm página própria, sem cabeçalho.
  if (isAuthPage) {
    return (
      <div className="min-h-screen">{page}</div>
    );
  }

  // Compra ("caixa"): cabeçalho mínimo com as etapas, sem menu e sem rodapé.
  if (checkoutStep !== null) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="relative border-b border-line/70">
          <div className="tf-topglow pointer-events-none absolute inset-x-0 top-0 h-[320px]" aria-hidden />
          <div className="page-container relative flex h-[84px] items-center justify-between gap-4">
            <div className="hidden sm:block">
              <Logo />
            </div>
            <div className="mx-auto sm:mx-0">
              <CheckoutSteps current={checkoutStep} />
            </div>
            <div className="hidden items-center gap-4 sm:flex">
              <LanguageSwitcher />
              <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-accent-text">
                <ArrowLeft size={16} aria-hidden /> {t.layout.exitCheckout}
              </Link>
            </div>
          </div>
        </header>
        <main id="conteudo" className="page-container relative flex-1 py-8 sm:py-12">
          <FlashNotice />
          {page}
        </main>
      </div>
    );
  }

  const links = [
    { to: "/", label: t.layout.nav.events, end: true, also: "/events/" },
    ...(isAuthenticated
      ? [
          { to: "/tickets", label: t.layout.nav.tickets },
          { to: "/orders", label: t.layout.nav.orders },
        ]
      : []),
    { to: "/organizer", label: isOrganizer ? t.layout.nav.organizer : t.layout.nav.forOrganizers },
    ...(isAdmin ? [{ to: "/admin", label: t.layout.nav.admin }] : []),
    { to: "/help", label: t.layout.nav.help },
  ];

  // Links num grupo em pílula; o ativo fica aceso em laranja (fundo, fio e brilho).
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-[0.9375rem] whitespace-nowrap transition-[color,background-color,box-shadow] duration-200 ${
      isActive
        ? "bg-accent/[0.18] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--accent-line),0_0_14px_color-mix(in_srgb,var(--accent)_12%,transparent)]"
        : "font-medium text-muted hover:bg-ink/[0.06] hover:text-ink"
    }`;
  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-xl px-3.5 py-3 text-base font-semibold transition-colors ${isActive ? "bg-accent-soft text-accent-text" : "text-ink hover:bg-raised"}`;

  const firstName = me?.name?.split(" ")[0];

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      {/* Brilho laranja e violeta no topo das telas internas (a home tem o próprio palco). */}
      {!isHome && <div className="tf-topglow pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden />}
      {/* Link escondido que aparece ao apertar Tab: pula o menu e vai direto ao conteúdo. */}
      <a href="#conteudo" className="sr-only z-50 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t.layout.skipToContent}
      </a>

      <header
        // Transparente sobre o palco da home (sempre escuro): usa as cores do tema escuro.
        data-theme={glassHeader ? undefined : "dark"}
        className={`sticky top-0 z-40 transition-[background-color,backdrop-filter] duration-300 ${glassHeader ? "bg-canvas/85 backdrop-blur-xl" : "bg-transparent"}`}
      >
        <div className="page-container flex h-[76px] items-center justify-between gap-4">
          <Logo />

          <nav
            aria-label={t.layout.mainNav}
            className="hidden items-center gap-1 rounded-full bg-ink/[0.04] p-[5px] shadow-[inset_0_0_0_1px_var(--card-ring)] lg:flex"
          >
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => linkClass({ isActive: isActive || (!!link.also && location.pathname.startsWith(link.also)) })}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2.5 lg:flex">
            <LanguageSwitcher />
            <ThemeToggle />
            {isChecking ? (
              <SessionPending />
            ) : isAuthenticated ? (
              <UserMenu name={firstName} fullName={me?.name} avatarUrl={me?.avatarUrl} onSignOut={handleSignOut} />
            ) : (
              <>
                <ButtonLink to="/login" variant="secondary" size="sm" className="h-10 rounded-full px-4">
                  <UserRound size={17} aria-hidden /> {t.layout.signIn}
                </ButtonLink>
                <ButtonLink to="/register" size="sm" className="h-10 rounded-full px-4">
                  {t.layout.signUp}
                </ButtonLink>
              </>
            )}
          </div>

          {/* Celular e tablet: só o botão do menu; idioma e tema ficam dentro dele. */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            {isChecking && <SessionPending compact />}
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition-colors hover:bg-accent hover:text-accent-ink"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? t.layout.closeMenu : t.layout.openMenu}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            id="mobile-menu"
            aria-label={t.layout.mainNav}
            className="absolute inset-x-4 top-[84px] rounded-[20px] bg-surface p-3 shadow-[inset_0_0_0_1px_var(--line),0_30px_80px_rgb(0_0_0/0.6)] lg:hidden"
          >
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={mobileLinkClass}>
                  {link.label}
                </NavLink>
              ))}
              {isChecking ? (
                <div className="px-3.5 py-3">
                  <SessionPending />
                </div>
              ) : isAuthenticated ? (
                <>
                  <NavLink to="/account" className={mobileLinkClass}>
                    {t.layout.myAccount}
                  </NavLink>
                  <button type="button" onClick={handleSignOut} className="rounded-xl px-3.5 py-3 text-left text-base font-semibold text-danger hover:bg-raised">
                    {t.layout.signOut}
                  </button>
                </>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-dashed border-line px-1 pt-3">
                  <ButtonLink to="/login" variant="secondary">
                    {t.layout.signIn}
                  </ButtonLink>
                  <ButtonLink to="/register">{t.layout.signUp}</ButtonLink>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line px-1 pt-3">
                <LanguageSwitcher />
                <span className="flex items-center gap-2.5 text-sm font-semibold text-muted">
                  {t.layout.theme.label}
                  <ThemeToggle />
                </span>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* A home desenha o próprio palco de ponta a ponta; as outras telas ficam na largura do conteúdo. */}
      <main id="conteudo" className={isHome ? "relative flex-1" : "page-container relative flex-1 py-8 sm:py-10"}>
        <FlashNotice className={isHome ? "page-container relative z-10 mb-0 pt-4" : ""} />
        {page}
      </main>

      <Footer />
    </div>
  );
}

function SessionPending({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <span
      role="status"
      className={`flex h-10 items-center gap-2.5 rounded-full text-sm font-medium text-muted ${compact ? "w-10 justify-center" : "px-4 shadow-[inset_0_0_0_1px_var(--line)]"}`}
    >
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      <span className={compact ? "sr-only" : undefined}>{t.layout.sessionLoading}</span>
    </span>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const isLight = theme === "light";
  const label = isLight ? t.layout.theme.toDark : t.layout.theme.toLight;
  // Interruptor em pílula: o botão desliza para a direita no tema claro.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      onClick={toggle}
      aria-label={t.layout.theme.label}
      title={label}
      className="relative h-9 w-[60px] shrink-0 rounded-full bg-ink/[0.04] shadow-[inset_0_0_0_1px_var(--card-ring)] transition-colors"
    >
      <span
        className={`absolute top-[3px] flex h-[30px] w-[30px] items-center justify-center rounded-full bg-accent/[0.18] text-ink shadow-[inset_0_0_0_1px_var(--accent-line)] transition-transform ${
          isLight ? "translate-x-[27px]" : "translate-x-[3px]"
        }`}
        aria-hidden
      >
        {isLight ? <Sun size={13} /> : <Moon size={13} />}
      </span>
    </button>
  );
}

function UserMenu({
  name,
  fullName,
  avatarUrl,
  onSignOut,
}: {
  name?: string;
  fullName?: string;
  avatarUrl?: string | null;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[0.9375rem] text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink [&>svg]:text-accent-text";

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-full py-[5px] pl-[5px] pr-3.5 text-[0.9375rem] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line)] transition-[box-shadow,background-color] hover:bg-ink/[0.04] hover:shadow-[inset_0_0_0_1px_var(--accent-line)] aria-expanded:shadow-[inset_0_0_0_1px_var(--accent-line)]"
      >
        <Avatar name={fullName} url={avatarUrl} size={34} />
        {name ?? t.layout.account}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2.5 w-56 rounded-2xl bg-surface p-2 shadow-[inset_0_0_0_1px_var(--line),0_24px_60px_rgb(0_0_0/0.6)]">
          <Link role="menuitem" to="/account" className={item}>
            <UserRound size={16} aria-hidden /> {t.layout.myAccount}
          </Link>
          <Link role="menuitem" to="/tickets" className={item}>
            <Ticket size={16} aria-hidden /> {t.layout.myTickets}
          </Link>
          <Link role="menuitem" to="/orders" className={item}>
            <ReceiptText size={16} aria-hidden /> {t.layout.myOrders}
          </Link>
          <Link role="menuitem" to="/help" className={item}>
            <CircleQuestionMark size={16} aria-hidden /> {t.layout.help}
          </Link>
          <div className="mx-1 my-1.5 border-t border-line" />
          <button role="menuitem" type="button" onClick={onSignOut} className={`${item} !text-danger [&>svg]:!text-danger`}>
            <LogOut size={16} aria-hidden /> {t.layout.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

function Footer() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const { isOrganizer } = useMe();
  const linkClass = "w-fit transition-colors hover:text-accent-text";
  return (
    <footer className="relative mt-24 overflow-hidden">
      <div className="h-px bg-[linear-gradient(90deg,transparent,var(--line)_25%,var(--line)_75%,transparent)]" aria-hidden />
      <div className="page-container flex flex-col justify-between gap-12 pb-12 pt-16 lg:flex-row">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-5 text-muted">{t.look.footer.tagline}</p>
        </div>
        <nav aria-label={t.layout.footerNav} className="grid grid-cols-2 gap-x-16 gap-y-10 sm:grid-cols-3 sm:gap-x-24">
          <div className="flex flex-col gap-3.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t.look.footer.navigate}</p>
            <Link to="/" className={linkClass}>
              {t.layout.nav.events}
            </Link>
            <Link to="/how-it-works" className={linkClass}>
              {t.layout.footer.howItWorks}
            </Link>
            <Link to="/organizer" className={linkClass}>
              {isOrganizer ? t.layout.nav.organizer : t.layout.nav.forOrganizers}
            </Link>
          </div>
          <div className="flex flex-col gap-3.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t.look.footer.account}</p>
            {isAuthenticated ? (
              <>
                <Link to="/tickets" className={linkClass}>
                  {t.layout.myTickets}
                </Link>
                <Link to="/orders" className={linkClass}>
                  {t.layout.myOrders}
                </Link>
                <Link to="/account" className={linkClass}>
                  {t.layout.myAccount}
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass}>
                  {t.layout.signIn}
                </Link>
                <Link to="/register" className={linkClass}>
                  {t.layout.signUp}
                </Link>
              </>
            )}
          </div>
          <div className="flex flex-col gap-3.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t.look.footer.help}</p>
            <Link to="/help" className={linkClass}>
              {t.layout.footer.helpCenter}
            </Link>
            <Link to="/help?tab=seguranca" className={linkClass}>
              {t.layout.footer.security}
            </Link>
            <a href={privacyContactHref} className={`${linkClass} break-words`}>
              {t.legal.footerContact}: {PRIVACY_CONTACT_EMAIL}
            </a>
          </div>
        </nav>
      </div>
      <div className="page-container flex flex-col justify-between gap-3 pb-2 text-sm text-muted sm:flex-row">
        <span>{t.layout.footer.credits(new Date().getFullYear())}</span>
        <span className="flex gap-2">
          <Link to="/privacy" className="transition-colors hover:text-ink">
            {t.legal.footerPrivacy}
          </Link>
          <span aria-hidden>·</span>
          <Link to="/terms" className="transition-colors hover:text-ink">
            {t.legal.footerTerms}
          </Link>
        </span>
      </div>
      <Wordmark />
    </footer>
  );
}

// Em qual etapa da compra está a rota atual (null = fora da compra).
function getCheckoutStep(pathname: string): 0 | 1 | 2 | null {
  if (pathname === "/checkout") return 0;
  if (matchPath("/orders/:id/payment", pathname)) return 1;
  if (matchPath("/orders/:id/confirmation", pathname)) return 2;
  return null;
}
