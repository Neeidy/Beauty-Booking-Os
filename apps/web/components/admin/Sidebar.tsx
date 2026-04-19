"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  escalationCount?: number;
}

const NAV_PRIMARY = [
  { href: "/admin/dashboard",    label: "Dashboard",     icon: "dashboard" },
  { href: "/admin/leads",        label: "Leads",         icon: "person_search" },
  { href: "/admin/bookings",     label: "Buchungen",     icon: "event_available" },
  { href: "/admin/front-desk",   label: "Front Desk",    icon: "desk" },
  { href: "/admin/calendar",     label: "Kalender",      icon: "calendar_view_week" },
  { href: "/admin/waiting-list", label: "Warteliste",    icon: "format_list_bulleted" },
  { href: "/admin/clients",      label: "Kunden",        icon: "group" },
  { href: "/admin/staff",        label: "Team",          icon: "diversity_1" },
  { href: "/admin/rebooking",    label: "Rebooking",     icon: "event_repeat" },
];

const NAV_SECONDARY = [
  { href: "/admin/logs",        label: "Event Logs",    icon: "article" },
  { href: "/admin/escalations", label: "Eskalationen",  icon: "warning" },
  { href: "/admin/settings",    label: "Einstellungen", icon: "settings" },
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
        className={[
          "flex items-center gap-3 px-4 py-3 transition-all duration-200 rounded-lg",
          active
            ? "text-vgs-primary font-semibold bg-white/60 rounded-r-none border-r-2 border-vgs-primary"
            : "text-on-surface-variant opacity-70 hover:opacity-100 hover:bg-white/60 hover:translate-x-1",
        ].join(" ")}
      >
        <span
          className="material-symbols-outlined text-[22px]"
          style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
        >
          {icon}
        </span>
        <span className="font-body font-medium text-sm flex-1">{label}</span>
        {isEscalation && escalationCount > 0 && (
          <span className="text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center bg-error text-on-error">
            {escalationCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside
      className="w-72 shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto py-8 px-4 z-20"
      style={{
        backgroundColor: "#f8f9fa",
        boxShadow: "40px 0 60px -15px rgba(91,64,65,0.06)",
      }}
    >
      {/* Logo */}
      <div className="px-4 mb-8">
        <div className="text-2xl font-headline font-bold tracking-tighter text-on-surface">
          Vienna Glow
        </div>
        <div className="text-sm font-body text-on-surface-variant mt-1">
          Beauty Management
        </div>
      </div>

      {/* Primary Nav */}
      <div className="flex flex-col gap-1">
        {NAV_PRIMARY.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-outline-variant/30 mx-4" />

      {/* Secondary Nav */}
      <div className="flex flex-col gap-1">
        {NAV_SECONDARY.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      {/* Bottom: logout */}
      <div className="mt-auto pt-6 px-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full text-left text-on-surface-variant opacity-60 hover:opacity-100 transition-all duration-200 hover:translate-x-1"
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            logout
          </span>
          <span className="font-body font-medium text-sm">Abmelden</span>
        </button>
      </div>
    </aside>
  );
}
