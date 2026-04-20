"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  escalationCount?: number;
}

const NAV_ITEMS = [
  { href: "/admin/dashboard",    label: "Dashboard",     icon: "▢" },
  { href: "/admin/front-desk",   label: "Front Desk",    icon: "🪑" },
  { href: "/admin/calendar",     label: "Kalender",      icon: "🗓" },
  { href: "/admin/clients",      label: "Kunden",        icon: "👤" },
  { href: "/admin/waiting-list", label: "Warteliste",    icon: "📋" },
  { href: "/admin/staff",        label: "Team",          icon: "✂" },
  { href: "/admin/rebooking",    label: "Rebooking",     icon: "↻" },
  { href: "/admin/settings",     label: "Einstellungen", icon: "⚙" },
  { href: "/admin/logs",         label: "Logs",          icon: "≡" },
];

const NAV_SECONDARY = [
  { href: "/admin/leads",        label: "Leads",         icon: "📄" },
  { href: "/admin/bookings",     label: "Buchungen",     icon: "📅" },
  { href: "/admin/escalations",  label: "Eskalationen",  icon: "⚠" },
];

export default function Sidebar({ escalationCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  function NavItem({ href, label, icon }: { href: string; label: string; icon: string }) {
    const active = pathname.startsWith(href);
    const isEscalation = href.includes("escalations");

    return (
      <Link
        href={href}
        className={`admin-nav-item${active ? " active" : ""}`}
      >
        <span className="mi">{icon}</span>
        {label}
        {isEscalation && escalationCount > 0 && (
          <span style={{
            marginLeft: "auto",
            fontSize: "11px",
            fontWeight: 700,
            background: "var(--color-error)",
            color: "#fff",
            borderRadius: "999px",
            padding: "1px 7px",
            minWidth: "20px",
            textAlign: "center",
          }}>
            {escalationCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand-name">Vienna Glow Studio</div>
        <div className="admin-brand-sub">Admin Panel</div>
      </div>
      <div className="admin-divider" />

      <nav className="admin-nav">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
        <div className="admin-divider" style={{ margin: "8px 0" }} />
        {NAV_SECONDARY.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-nav-item">
          <span className="mi">↗</span> Website ansehen
        </Link>
        <button
          onClick={handleLogout}
          className="admin-nav-item"
          style={{ width: "100%", cursor: "pointer", marginTop: "4px" }}
        >
          <span className="mi">⎋</span> Abmelden
        </button>
      </div>
    </aside>
  );
}
