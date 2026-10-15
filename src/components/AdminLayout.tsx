import { NavLink, Outlet } from "react-router";
import { ClipboardCheck, ScrollText, UserCog } from "lucide-react";
import RequireAdmin from "../auth/RequireAdmin";
import { useI18n } from "../i18n/LocaleContext";

export default function AdminLayout() {
  const { t } = useI18n();
  const l = t.admin.layout;
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 items-center gap-3 rounded-xl px-3 py-[11px] text-[0.9375rem] transition-colors ${
      isActive
        ? "bg-accent/[0.16] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--accent-line)] [&>svg]:text-accent-text"
        : "font-medium text-muted hover:bg-ink/[0.05] hover:text-ink"
    }`;

  const links = [
    { to: "/admin", label: l.payouts, icon: <ClipboardCheck size={18} />, end: true },
    { to: "/admin/users", label: l.users, icon: <UserCog size={18} /> },
    { to: "/admin/audit", label: l.audit, icon: <ScrollText size={18} /> },
  ];

  return (
    <RequireAdmin>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
        <aside className="tf-panel min-w-0 p-2 lg:sticky lg:top-24 lg:p-3.5">
          <p className="hidden px-3 pb-1.5 pt-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted lg:block">{l.eyebrow}</p>
          <nav aria-label={l.nav} className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:overflow-visible">
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
