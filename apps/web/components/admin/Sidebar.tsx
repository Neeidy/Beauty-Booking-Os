"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  escalationCount?: number;
}

const NAV = [
  { href: "/admin/dashboard",    label: "Dashboard",    icon: "□" },
  { href: "/admin/leads",        label: "Leads",        icon: "◈" },
  { href: "/admin/bookings",     label: "Buchungen",    icon: "◇" },
  { href: "/admin/front-desk",   label: "Front Desk",   icon: "▦" },
  { href: "/admin/calendar",     label: "Takvim",       icon: "◫" },
  { href: "/admin/leads",        label: "Müşteriler",   icon: "◉" },
  { href: "/admin/logs",         label: "Event Logs",   icon: "≡" },
  { href: "/admin/escalations",  label: "Eskalationen", icon: "!" },
  { href: "/admin/settings",     label: "Einstellungen",icon: "⚙" },
];

export default function Sidebar({ escalationCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <aside
      className="w-56 shrink-0 flex flex-col border-r min-h-screen"
      style={{ backgroundColor: "var(--color-primary)", borderColor: "#3d3430" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "#3d3430" }}>
        <p className="font-heading text-sm font-semibold" style={{ color: "var(--color-background)" }}>
          Vienna Glow Studio
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-secondary)" }}>
          Admin Panel
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-3">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          const isEscalation = href.includes("escalations");
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-sm text-sm transition-colors"
              style={{
                backgroundColor: active ? "var(--color-secondary)" : "transparent",
                color: active ? "var(--color-primary)" : "var(--color-accent)",
              }}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs w-4">{icon}</span>
                {label}
              </span>
              {isEscalation && escalationCount > 0 && (
                <span
                  className="text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center"
                  style={{ backgroundColor: "#dc2626", color: "#fff" }}
                >
                  {escalationCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "#3d3430" }}>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm rounded-sm transition-colors"
          style={{ color: "var(--color-accent)", opacity: 0.7 }}
        >
          Abmelden
        </button>
      </div>
    </aside>
  );
}
