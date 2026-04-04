"use client";

import { useEffect, useState } from "react";
import AdminHeader from "../../../components/admin/AdminHeader";
import StatCard from "../../../components/admin/StatCard";

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

  if (error) {
    return (
      <>
        <AdminHeader title="Dashboard" />
        <main className="p-6">
          <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Fehler beim Laden der Statistiken. Bitte Seite neu laden.
          </div>
        </main>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <AdminHeader title="Dashboard" />
        <main className="p-6">
          <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Wird geladen…</div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Dashboard" />
      <main className="p-6 space-y-8">

        {/* Escalation alert */}
        {stats.escalationQueue > 0 && (
          <div className="flex items-center gap-3 rounded-sm border border-red-300 bg-red-50 px-4 py-3">
            <span className="text-red-600 font-bold">⚠</span>
            <p className="text-sm text-red-700">
              <strong>{stats.escalationQueue}</strong> Anfrage{stats.escalationQueue > 1 ? "n" : ""} warten auf menschliche Bearbeitung.
              <a href="/admin/escalations" className="ml-2 underline font-medium">Jetzt ansehen →</a>
            </p>
          </div>
        )}

        {/* Today */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Heute</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Neue Leads" value={stats.today.newLeads} />
            <StatCard label="Buchungen heute" value={stats.today.bookingsToday} />
            <StatCard label="Offene Aktionen" value={stats.today.pendingActions} warn={stats.today.pendingActions > 0} />
            <StatCard label="Geplante Erinnerungen" value={stats.today.remindersScheduled} />
          </div>
        </section>

        {/* This week */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Diese Woche</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Leads gesamt" value={stats.thisWeek.totalLeads} />
            <StatCard label="Buchungen" value={stats.thisWeek.totalBookings} />
            <StatCard label="Conversion" value={`${stats.thisWeek.conversionRate}%`} accent />
            <StatCard label="No-Shows" value={stats.thisWeek.noShows} warn={stats.thisWeek.noShows > 0} />
            <StatCard label="Stornierungen" value={stats.thisWeek.cancellations} />
          </div>
        </section>

        {/* AI costs */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>AI-Kosten</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatCard label="Tokens heute" value={stats.aiCosts.totalTokensToday.toLocaleString("de-AT")} sub="input + output" />
            <StatCard label="Tokens diese Woche" value={stats.aiCosts.totalTokensThisWeek.toLocaleString("de-AT")} />
            <StatCard label="Geschätzte Kosten" value={`€ ${stats.aiCosts.estimatedCostEur.toFixed(4)}`} sub="Diese Woche, ca." accent />
          </div>
        </section>

      </main>
    </>
  );
}
