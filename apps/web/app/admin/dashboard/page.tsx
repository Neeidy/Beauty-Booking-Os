"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardStats {
  today: { newLeads: number; bookingsToday: number; pendingActions: number; remindersScheduled: number };
  thisWeek: { totalLeads: number; totalBookings: number; conversionRate: number; noShows: number; cancellations: number };
  aiCosts: { totalTokensToday: number; totalTokensThisWeek: number; estimatedCostEur: number };
  escalationQueue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(data => setStats(data as DashboardStats))
      .catch(() => setError(true));
  }, []);

  const today = new Date().toLocaleDateString("de-AT", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="adm-body">
      {/* Header */}
      <div className="adm-header" style={{ marginBottom: "24px" }}>
        <div className="adm-header-title">
          <h2>Guten Morgen, Admin 👋</h2>
          <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" }}>{today}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {stats?.escalationQueue != null && stats.escalationQueue > 0 && (
            <Link
              href="/admin/escalations"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                background: "var(--color-error-soft, #fef2f2)",
                color: "var(--color-error)",
                padding: "4px 12px",
                borderRadius: "999px",
                textDecoration: "none",
              }}
            >
              ⚠ {stats.escalationQueue} Eskalation{stats.escalationQueue > 1 ? "en" : ""}
            </Link>
          )}
          <div
            style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "var(--color-accent)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "15px",
            }}
          >
            A
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: "var(--color-error-soft, #fef2f2)",
          color: "var(--color-error)",
          border: "1px solid var(--color-error)",
          borderRadius: "8px",
          padding: "12px 16px",
          fontSize: "14px",
          marginBottom: "24px",
        }}>
          Fehler beim Laden der Statistiken. Bitte Seite neu laden.
        </div>
      )}

      {/* Stat Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--color-accent)" }}>
            {stats?.today.bookingsToday ?? "—"}
          </div>
          <div className="stat-label">Heute Termine</div>
          <div className="stat-trend neutral">
            {stats?.today.remindersScheduled ?? 0} Erinnerungen geplant
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--color-emerald)" }}>
            {stats ? `€ ${(stats.aiCosts.estimatedCostEur * 100).toFixed(0)}` : "—"}
          </div>
          <div className="stat-label">KI-Kosten Woche</div>
          <div className="stat-trend neutral">
            {stats?.aiCosts.totalTokensThisWeek.toLocaleString("de-AT") ?? 0} Tokens
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--color-amber)" }}>
            {stats?.today.newLeads ?? "—"}
          </div>
          <div className="stat-label">Neue Leads</div>
          <div className="stat-trend neutral">
            {stats?.thisWeek.totalLeads ?? 0} diese Woche
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--color-rose)" }}>
            {stats?.today.pendingActions ?? "—"}
          </div>
          <div className="stat-label">Ausstehend</div>
          <div className={`stat-trend ${(stats?.today.pendingActions ?? 0) > 0 ? "warn" : "neutral"}`}>
            {(stats?.today.pendingActions ?? 0) > 0 ? "Bestätigung nötig →" : "Alles erledigt"}
          </div>
        </div>
      </div>

      {/* Dash Row */}
      <div className="dash-row">
        {/* Appointments placeholder */}
        <div className="dash-card">
          <div className="dash-card-head">
            <h4>Termine heute</h4>
            <Link href="/admin/calendar">Zum Kalender →</Link>
          </div>
          <table className="appt-table">
            <thead>
              <tr>
                <th>Übersicht</th>
                <th>Heute</th>
                <th>Woche</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Buchungen</td>
                <td><span className="status-pill ok">{stats?.today.bookingsToday ?? 0}</span></td>
                <td>{stats?.thisWeek.totalBookings ?? 0}</td>
              </tr>
              <tr>
                <td>Leads</td>
                <td><span className="status-pill pending">{stats?.today.newLeads ?? 0}</span></td>
                <td>{stats?.thisWeek.totalLeads ?? 0}</td>
              </tr>
              <tr>
                <td>No-Shows</td>
                <td>—</td>
                <td><span className="status-pill cancel">{stats?.thisWeek.noShows ?? 0}</span></td>
              </tr>
              <tr>
                <td>Conversion</td>
                <td>—</td>
                <td><strong>{stats?.thisWeek.conversionRate ?? 0}%</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* AI Costs / Lead stats */}
        <div className="dash-card">
          <div className="dash-card-head">
            <h4>Neue Leads</h4>
            <Link href="/admin/leads">Alle anzeigen →</Link>
          </div>
          <div className="lead-list">
            <div className="lead-item">
              <div>
                <div className="lead-name">Leads heute</div>
                <div className="lead-svc">
                  <span className="lead-source-ic" style={{ color: "var(--color-accent)" }}>W</span>
                  Alle Quellen
                </div>
              </div>
              <div className="lead-meta">
                <span className="lead-conf high">
                  <span className="dot" style={{ background: "var(--color-emerald)" }} />
                  {stats?.today.newLeads ?? 0}
                </span>
              </div>
            </div>
            <div className="lead-item">
              <div>
                <div className="lead-name">Offene Aktionen</div>
                <div className="lead-svc">Bestätigung ausstehend</div>
              </div>
              <div className="lead-meta">
                <span className={`lead-conf ${(stats?.today.pendingActions ?? 0) > 0 ? "mid" : "high"}`}>
                  <span className="dot" style={{ background: (stats?.today.pendingActions ?? 0) > 0 ? "var(--color-amber)" : "var(--color-emerald)" }} />
                  {stats?.today.pendingActions ?? 0}
                </span>
              </div>
            </div>
            <div className="lead-item">
              <div>
                <div className="lead-name">Stornierungen (Woche)</div>
                <div className="lead-svc">Abgesagte Termine</div>
              </div>
              <div className="lead-meta">
                <span className="lead-conf mid">
                  <span className="dot" style={{ background: "var(--color-rose)" }} />
                  {stats?.thisWeek.cancellations ?? 0}
                </span>
              </div>
            </div>
          </div>
          <div className="ai-cost">
            KI-Kosten heute: € {stats?.aiCosts.estimatedCostEur.toFixed(4) ?? "0.0000"} · Tokens: {stats?.aiCosts.totalTokensToday.toLocaleString("de-AT") ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}
