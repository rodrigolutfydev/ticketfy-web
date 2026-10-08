import { NavLink, Outlet, useLocation } from "react-router";
import { CalendarDays, CalendarPlus, LayoutDashboard, ScanLine, Wallet } from "lucide-react";
import RequireOrganizer from "../auth/RequireOrganizer";
import { useMe } from "../auth/useMe";

// Moldura da área do organizador: menu lateral (vira abas no celular) + conteúdo.
export default function OrganizerLayout() {
  const { pathname } = useLocation();
  const { isAdmin } = useMe();
  // "Meus eventos" fica ativo também dentro de um evento (/organizer/events/:id),
  // mas não em "Criar evento" (/organizer/events/new), que tem item próprio.
  const inEvent = pathname.startsWith("/organizer/events/") && pathname !== "/organizer/events/new";
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? "bg-accent/12 text-accent-text" : "text-muted hover:bg-raised hover:text-ink"
    }`;

  const links = [
    { to: "/organizer", label: "Painel", icon: <LayoutDashboard size={18} />, end: true },
    { to: "/organizer/events", label: "Meus eventos", icon: <CalendarDays size={18} />, end: true },
    { to: "/organizer/events/new", label: "Criar evento", icon: <CalendarPlus size={18} /> },
    { to: "/organizer/check-in", label: "Check-in", icon: <ScanLine size={18} /> },
    ...(isAdmin ? [] : [{ to: "/organizer/finance", label: "Financeiro", icon: <Wallet size={18} /> }]),
  ];

  return (
    <RequireOrganizer>
      {/* minmax(0,1fr): impede que o menu rolável do celular alargue a coluna e a página inteira. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <p className="eyebrow mb-3 hidden px-3 md:block">Bastidores</p>
          <nav aria-label="Área do organizador" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:flex-col md:overflow-visible">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => item({ isActive: isActive || (link.to === "/organizer/events" && inEvent) })}
              >
                {link.icon}
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </RequireOrganizer>
  );
}
