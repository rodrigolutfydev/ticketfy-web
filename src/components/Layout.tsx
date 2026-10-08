// Moldura de todas as telas: cabeçalho, conteúdo (<Outlet/>) e rodapé.
// <Outlet/> é o "buraco" onde o React Router coloca a tela da rota atual.

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, matchPath, useLocation, useNavigate } from "react-router";
import { CircleQuestionMark, LogOut, Menu, Moon, ReceiptText, Sun, Ticket, UserRound, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import { useTheme } from "../theme/ThemeContext";
import Avatar from "./Avatar";
import CheckoutSteps from "./CheckoutSteps";
import Logo from "./Logo";
import { ButtonLink } from "./ui";

export default function Layout() {
  const { isAuthenticated, isChecking, signOut } = useAuth();
  const { me, isOrganizer, isAdmin } = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const checkoutStep = getCheckoutStep(location.pathname);
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

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
      <div className="min-h-screen">
        <Outlet />
      </div>
    );
  }

  // Compra ("caixa"): cabeçalho mínimo com as etapas, sem menu e sem rodapé.
  if (checkoutStep !== null) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-line bg-surface/60">
          <div className="page-container flex h-[72px] items-center justify-between gap-4">
            <div className="hidden sm:block">
              <Logo />
            </div>
            <div className="mx-auto sm:mx-0">
              <CheckoutSteps current={checkoutStep} />
            </div>
            <Link to="/" className="hidden text-sm font-semibold text-muted hover:text-ink sm:block">
              Sair
            </Link>
          </div>
        </header>
        <main id="conteudo" className="page-container flex-1 py-8 sm:py-12">
          <Outlet />
        </main>
      </div>
    );
  }

  const links = [
    { to: "/", label: "Eventos", end: true, also: "/events/" },
    ...(isAuthenticated
      ? [
          { to: "/tickets", label: "Meus ingressos" },
          { to: "/orders", label: "Pedidos" },
        ]
      : []),
    { to: "/organizer", label: isOrganizer ? "Organizador" : "Para organizadores" },
    ...(isAdmin ? [{ to: "/admin", label: "Administração" }] : []),
    { to: "/help", label: "Ajuda" },
  ];

  // Item ativo: texto claro com um traço coral colado na borda de baixo do cabeçalho.
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex h-16 items-center px-3 text-sm font-medium transition-colors ${
      isActive ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent" : "text-muted hover:text-ink"
    }`;
  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive ? "bg-raised text-ink" : "text-muted hover:text-ink"}`;

  const firstName = me?.name?.split(" ")[0];

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      {/* Brilho laranja decorativo, só na página inicial. */}
      {location.pathname === "/" && <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[560px]" aria-hidden />}
      {/* Link escondido que aparece ao apertar Tab: pula o menu e vai direto ao conteúdo. */}
      <a href="#conteudo" className="sr-only z-50 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Logo />

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
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

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            {isChecking ? null : isAuthenticated ? (
              <UserMenu name={firstName} fullName={me?.name} avatarUrl={me?.avatarUrl} onSignOut={handleSignOut} />
            ) : (
              <ButtonLink to="/login" variant="secondary" size="sm" className="h-10 px-4">
                <UserRound size={17} aria-hidden /> Entrar
              </ButtonLink>
            )}
          </div>

          {/* Celular: tema + botão que abre o menu. */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-raised"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav id="mobile-menu" aria-label="Principal" className="border-t border-line bg-canvas px-4 pb-5 pt-3 md:hidden">
            <div className="flex flex-col">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={mobileLinkClass}>
                  {link.label}
                </NavLink>
              ))}
              {isChecking ? null : isAuthenticated ? (
                <>
                  <NavLink to="/account" className={mobileLinkClass}>
                    Minha conta
                  </NavLink>
                  <button type="button" onClick={handleSignOut} className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-danger">
                    Sair
                  </button>
                </>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ButtonLink to="/login" variant="secondary">
                    Entrar
                  </ButtonLink>
                  <ButtonLink to="/register">Criar conta</ButtonLink>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main id="conteudo" className="page-container relative flex-1 py-8 sm:py-10">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";
  const label = isLight ? "Usar tema escuro" : "Usar tema claro";
  // Interruptor em pílula: o botão desliza para a direita no tema claro.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      onClick={toggle}
      aria-label="Tema claro"
      title={label}
      className="relative h-7 w-[52px] shrink-0 rounded-full border border-line-strong bg-raised transition-colors"
    >
      <span
        className={`absolute top-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-surface text-ink shadow transition-transform ${
          isLight ? "translate-x-[25px]" : "translate-x-0.5"
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

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-raised";

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm font-semibold text-ink hover:border-accent/60"
      >
        <Avatar name={fullName} url={avatarUrl} size={28} />
        {name ?? "Conta"}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-2xl">
          <Link role="menuitem" to="/account" className={item}>
            <UserRound size={16} aria-hidden /> Minha conta
          </Link>
          <Link role="menuitem" to="/tickets" className={item}>
            <Ticket size={16} aria-hidden /> Meus ingressos
          </Link>
          <Link role="menuitem" to="/orders" className={item}>
            <ReceiptText size={16} aria-hidden /> Meus pedidos
          </Link>
          <Link role="menuitem" to="/help" className={item}>
            <CircleQuestionMark size={16} aria-hidden /> Ajuda
          </Link>
          <div className="my-1 border-t border-line" />
          <button role="menuitem" type="button" onClick={onSignOut} className={`${item} text-danger`}>
            <LogOut size={16} aria-hidden /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative mt-20 border-t border-line">
      <div className="page-container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <Logo />
          <p className="text-sm text-muted">Eventos que ficam na memória.</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
          <Link to="/how-it-works" className="hover:text-ink">
            Como funciona
          </Link>
          <Link to="/help" className="hover:text-ink">
            Central de ajuda
          </Link>
          <Link to="/help?tab=seguranca" className="hover:text-ink">
            Segurança
          </Link>
          <span className="text-subtle">© {new Date().getFullYear()} Ticketfy · projeto de Rodrigo Lutfy</span>
        </nav>
      </div>
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
