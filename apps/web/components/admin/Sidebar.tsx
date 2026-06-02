"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface SidebarProps {
  escalationCount?: number;
  brandName?: string;
}

// href + icon are static; the label comes from dict.admin.nav[labelKey].
const NAV_ITEMS = [
  { href: "/admin/dashboard",    labelKey: "dashboard",    icon: "▢" },
  { href: "/admin/front-desk",   labelKey: "frontDesk",    icon: "🪑" },
  { href: "/admin/calendar",     labelKey: "calendar",     icon: "🗓" },
  { href: "/admin/clients",      labelKey: "clients",      icon: "👤" },
  { href: "/admin/waiting-list", labelKey: "waitingList",  icon: "📋" },
  { href: "/admin/staff",        labelKey: "team",         icon: "✂" },
  { href: "/admin/rebooking",    labelKey: "rebooking",    icon: "↻" },
  { href: "/admin/settings",     labelKey: "settings",     icon: "⚙" },
  { href: "/admin/logs",         labelKey: "logs",         icon: "≡" },
] as const;

const NAV_SECONDARY = [
  { href: "/admin/leads",        labelKey: "leads",        icon: "📄" },
  { href: "/admin/bookings",     labelKey: "bookings",     icon: "📅" },
  { href: "/admin/escalations",  labelKey: "escalations",  icon: "⚠" },
] as const;

export default function Sidebar({ escalationCount = 0, brandName }: SidebarProps) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const nav = dict.admin.nav;

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
        <div className="admin-brand-name">{brandName ?? "Beauty Booking OS"}</div>
        <div className="admin-brand-sub">{nav.adminPanel}</div>
      </div>
      <div className="admin-divider" />

      <nav className="admin-nav">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={nav[item.labelKey]} />
        ))}
        <div className="admin-divider" style={{ margin: "8px 0" }} />
        {NAV_SECONDARY.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={nav[item.labelKey]} />
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-nav-item">
          <span className="mi">↗</span> {nav.viewWebsite}
        </Link>
        <button
          onClick={handleLogout}
          className="admin-nav-item"
          style={{ width: "100%", cursor: "pointer", marginTop: "4px" }}
        >
          <span className="mi">⎋</span> {nav.logout}
        </button>
      </div>
    </aside>
  );
}
