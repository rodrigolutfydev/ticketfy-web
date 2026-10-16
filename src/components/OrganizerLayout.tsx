import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { CalendarDays, CalendarPlus, LayoutDashboard, ScanLine, Wallet } from "lucide-react";
import RequireOrganizer from "../auth/RequireOrganizer";
import { useMe } from "../auth/useMe";
import { useI18n } from "../i18n/LocaleContext";
import PageLoading from "./PageLoading";

// Moldura da área do organizador: menu lateral (vira uma grade de botões no celular) + conteúdo.
export default function OrganizerLayout() {
  const { pathname } = useLocation();
  const { isAdmin } = useMe();
  const { t } = useI18n();
  const l = t.organizer.layout;
  // "Meus eventos" fica ativo também dentro de um evento (/organizer/events/:id),
  // mas não em "Criar evento" (/organizer/events/new), que tem item próprio.
  const inEvent = pathname.startsWith("/organizer/events/") && pathname !== "/organizer/events/new";
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-[11px] text-[0.9375rem] transition-colors lg:gap-3 [&>svg]:shrink-0 ${
      isActive
        ? "bg-accent/[0.16] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--accent-line)] [&>svg]:text-accent-text"
        : "font-medium text-muted hover:bg-ink/[0.05] hover:text-ink"
    }`;

  const links = [
    { to: "/organizer", label: l.dashboard, icon: <LayoutDashboard size={18} />, end: true },
    { to: "/organizer/events", label: l.events, icon: <CalendarDays size={18} />, end: true },
    { to: "/organizer/events/new", label: l.newEvent, icon: <CalendarPlus size={18} /> },
    { to: "/organizer/check-in", label: l.checkIn, icon: <ScanLine size={18} /> },
    ...(isAdmin ? [] : [{ to: "/organizer/finance", label: l.finance, icon: <Wallet size={18} /> }]),
  ];

  return (
    <RequireOrganizer>
      {/* minmax(0,1fr): impede que o menu do celular alargue a coluna e a página inteira. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
        <aside className="tf-panel min-w-0 p-2 lg:sticky lg:top-24 lg:p-3.5">
          <p className="hidden px-3 pb-1.5 pt-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted lg:block">{l.eyebrow}</p>
          <nav aria-label={l.nav} className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex lg:flex-col">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => item({ isActive: isActive || (link.to === "/organizer/events" && inEvent) })}
              >
                {link.icon}
                <span className="truncate">{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <section className="min-w-0">
          <Suspense fallback={<PageLoading variant="section" />}>
            <Outlet />
          </Suspense>
        </section>
      </div>
    </RequireOrganizer>
  );
}
