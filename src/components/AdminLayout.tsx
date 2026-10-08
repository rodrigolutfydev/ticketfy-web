import { NavLink, Outlet } from "react-router";
import { ClipboardCheck, ScrollText, UserCog } from "lucide-react";
import RequireAdmin from "../auth/RequireAdmin";

export default function AdminLayout() {
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? "bg-accent/12 text-accent-text" : "text-muted hover:bg-raised hover:text-ink"
    }`;

  const links = [
    { to: "/admin", label: "Saques em análise", icon: <ClipboardCheck size={18} />, end: true },
    { to: "/admin/organizers", label: "Organizadores", icon: <UserCog size={18} /> },
    { to: "/admin/audit", label: "Auditoria", icon: <ScrollText size={18} /> },
  ];

  return (
    <RequireAdmin>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <p className="eyebrow mb-3 hidden px-3 md:block">Administração</p>
          <nav aria-label="Área de administração" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:flex-col md:overflow-visible">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={item}>
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
    </RequireAdmin>
  );
}
