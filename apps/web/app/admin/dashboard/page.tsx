"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

type DashDict = Dictionary["admin"]["dashboard"];

interface DashboardStats {
  today: { newLeads: number; bookingsToday: number; pendingActions: number; remindersScheduled: number };
  thisWeek: { totalLeads: number; totalBookings: number; conversionRate: number; noShows: number; cancellations: number };
  aiCosts: { totalTokensToday: number; totalTokensThisWeek: number; estimatedCostEur: number };
  escalationQueue: number;
}

interface TodayBooking {
  id: string;
  appointmentTime: string;
  customerName: string;
  serviceName: string | null;
  notes: string | null;
  status: string;
}

interface RecentLead {
  id: string;
  customerName: string | null;
  intent: string | null;
  intentConfidence: number | null;
  source: string | null;
  createdAt: string;
}

const SERVICE_COLORS = [
  "var(--color-purple)",
  "var(--color-amber)",
  "var(--color-emerald)",
  "var(--color-rose)",
  "var(--color-cyan)",
];

const SOURCE_LABEL: Record<string, string> = {
  web_form: "W",
  google_business: "G",
  google: "G",
  phone: "📞",
  instagram_dm: "IG",
  instagram: "IG",
};

const SOURCE_COLOR: Record<string, string> = {
  web_form: "var(--color-accent)",
  google_business: "var(--color-emerald)",
  google: "var(--color-emerald)",
  phone: "var(--color-amber)",
  instagram_dm: "var(--color-rose)",
  instagram: "var(--color-rose)",
};

function getStatusPillClass(status: string): string {
  if (status === "confirmed" || status === "reminded") return "ok";
  if (status === "pending") return "pending";
  if (status === "cancelled" || status === "no_show") return "cancel";
  return "pending";
}

function getStatusLabel(status: string, d: DashDict): string {
  if (status === "confirmed" || status === "reminded") return d.statusConfirmed;
  if (status === "pending") return d.statusPending;
  if (status === "cancelled") return d.statusCancelled;
  if (status === "no_show") return d.statusNoShow;
  if (status === "completed") return d.statusCompleted;
  return `● ${status}`;
}

function getGreeting(d: DashDict): string {
  const hour = parseInt(
    new Intl.DateTimeFormat("de-AT", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Vienna",
    }).format(new Date()),
    10
  );
  if (hour >= 5 && hour < 12) return d.greetingMorning;
  if (hour >= 12 && hour < 18) return d.greetingDay;
  return d.greetingEvening;
}

function getTodayLabel(locale: Locale): string {
  const now = new Date();
  return now.toLocaleDateString(locale === "de" ? "de-AT" : "en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatWhen(isoStr: string, d: DashDict): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return d.justNow;
  if (mins < 60) return d.minutesAgo.replace("{m}", String(mins));
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return d.hoursAgo.replace("{h}", String(hrs));
  return d.daysAgo.replace("{d}", String(Math.floor(hrs / 24)));
}

export default function DashboardPage() {
  const { dict, locale } = useI18n();
  const d = dict.admin.dashboard;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<TodayBooking[]>([]);
  const [leads, setLeads] = useState<RecentLead[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => setStats(data as DashboardStats))
      .catch(() => setError(true));

    fetch("/api/admin/front-desk")
      .then((r) => r.json())
      .then((data: { columns?: { unconfirmed?: TodayBooking[]; confirmed?: TodayBooking[]; completed?: TodayBooking[] } }) => {
        const cols = data.columns ?? {};
        const all = [
          ...(cols.unconfirmed ?? []),
          ...(cols.confirmed ?? []),
          ...(cols.completed ?? []),
        ];
        setBookings(all.slice(0, 8));
      })
      .catch(() => {});

    fetch("/api/admin/leads?limit=5&page=1")
      .then((r) => r.json())
      .then((data: { leads?: RecentLead[] }) => setLeads(data.leads ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="dash-main">
      <header className="dash-header">
        <div>
          <h3>{getGreeting(d)}</h3>
          <div className="dash-date">{getTodayLabel(locale)}</div>
        </div>
        <div className="dash-header-right">
          {stats?.escalationQueue != null && stats.escalationQueue > 0 && (
            <Link href="/admin/escalations" className="kanban-pill intent-high">
              ⚠ {stats.escalationQueue} {stats.escalationQueue > 1 ? d.escalationMany : d.escalationOne}
            </Link>
          )}
          <button className="dash-bell" aria-label="Notifications" style={{ opacity: 0.3, cursor: "not-allowed" }} disabled>🔔</button>
          <div className="dash-avatar">A</div>
        </div>
      </header>

      {error && (
        <div style={{
          background: "var(--color-error-soft)",
          color: "var(--color-error)",
          border: "1px solid var(--color-error)",
          borderRadius: "var(--radius-md)",
          padding: "12px 16px",
          fontSize: "14px",
          marginBottom: "24px",
        }}>
          {d.statErrorReload}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--color-accent)" }}>
            {stats?.today.bookingsToday ?? "—"}
          </div>
          <div className="stat-label">{d.todayAppointments}</div>
          <div className="stat-trend up">
            {stats?.today.remindersScheduled != null
              ? d.remindersUp.replace("{count}", String(stats.today.remindersScheduled))
              : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--color-emerald)" }}>
            {"—"}
          </div>
          <div className="stat-label">{d.weekRevenue}</div>
          <div className="stat-trend up">
            {d.weekBookings.replace("{count}", String(stats?.thisWeek.totalBookings ?? 0))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--color-amber)" }}>
            {stats?.today.newLeads ?? "—"}
          </div>
          <div className="stat-label">{d.newLeads}</div>
          <div className="stat-trend neutral">
            {d.weekLeads.replace("{count}", String(stats?.thisWeek.totalLeads ?? 0))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--color-rose)" }}>
            {stats?.today.pendingActions ?? "—"}
          </div>
          <div className="stat-label">{d.pending}</div>
          <div className={`stat-trend ${(stats?.today.pendingActions ?? 0) > 0 ? "warn" : "neutral"}`}>
            {(stats?.today.pendingActions ?? 0) > 0 ? d.confirmationNeeded : d.allDone}
          </div>
        </div>
      </div>

      <div className="dash-row">
        <div className="dash-card">
          <div className="dash-card-head">
            <h4>{d.apptToday}</h4>
            <Link href="/admin/calendar">{d.toCalendar}</Link>
          </div>
          {bookings.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--color-text-faint)", fontSize: "14px" }}>
              {d.noApptToday}
            </div>
          ) : (
            <table className="appt-table">
              <thead>
                <tr>
                  <th>{d.thTime}</th>
                  <th>{d.thCustomer}</th>
                  <th>{d.thService}</th>
                  <th>{d.thStaff}</th>
                  <th>{d.thStatus}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => {
                  const color = SERVICE_COLORS[i % SERVICE_COLORS.length] ?? "var(--color-accent)";
                  return (
                    <tr key={b.id}>
                      <td className="appt-time">{b.appointmentTime}</td>
                      <td className="appt-name">{b.customerName}</td>
                      <td>
                        <div className="appt-svc-cell">
                          <span className="dot" style={{ background: color }} />
                          {b.serviceName ?? "—"}
                        </div>
                      </td>
                      <td>
                        <div className="appt-staff-cell">
                          <span className="dot" style={{ background: color }} />
                          {b.notes ? b.notes.slice(0, 20) : "—"}
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${getStatusPillClass(b.status)}`}>
                          {getStatusLabel(b.status, d)}
                        </span>
                      </td>
                      <td className="appt-actions-cell">
                        <button style={{ opacity: 0.3, cursor: "not-allowed" }} disabled>•••</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <h4>{d.leadsHeading}</h4>
            <Link href="/admin/front-desk">{d.showAll}</Link>
          </div>
          <div className="lead-list">
            {leads.length === 0 ? (
              <div style={{ padding: "16px 0", color: "var(--color-text-faint)", fontSize: "13px" }}>
                {d.noLeads}
              </div>
            ) : (
              leads.map((lead) => {
                const confVal = lead.intentConfidence ?? 0;
                const confPct = Math.round(confVal * 100);
                const confClass = confPct >= 80 ? "high" : confPct >= 50 ? "mid" : "mid";
                const confDotColor = confPct >= 80 ? "var(--color-emerald)" : "var(--color-amber)";
                const srcLabel = SOURCE_LABEL[lead.source ?? ""] ?? "W";
                const srcColor = SOURCE_COLOR[lead.source ?? ""] ?? "var(--color-accent)";

                return (
                  <div key={lead.id} className="lead-item">
                    <div>
                      <div className="lead-name">{lead.customerName ?? "—"}</div>
                      <div className="lead-svc">
                        <span className="lead-source-ic" style={{ color: srcColor }}>{srcLabel}</span>
                        {lead.intent ?? d.request}
                      </div>
                    </div>
                    <div className="lead-meta">
                      <span className={`lead-conf ${confClass}`}>
                        <span className="dot" style={{ background: confDotColor }} />
                        {confPct}%
                      </span>
                      <span>{formatWhen(lead.createdAt, d)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="ai-cost">
            {d.aiCostToday
              .replace("{cost}", stats?.aiCosts.estimatedCostEur.toFixed(4) ?? "0.0000")
              .replace("{tokens}", String(stats?.aiCosts.totalTokensToday.toLocaleString(locale === "de" ? "de-AT" : "en-GB") ?? 0))}
          </div>
        </div>
      </div>
    </div>
  );
}
