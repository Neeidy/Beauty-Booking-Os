"use client";

import { useEffect, useState, useCallback } from "react";
import LogViewer from "../../../components/admin/LogViewer";

interface EventLog {
  id: string;
  eventType: string;
  agentName: string | null;
  status: string;
  inputSummary: string | null;
  outputSummary: string | null;
  durationMs: number | null;
  tokenCount: number | null;
  errorMessage: string | null;
  leadId: string | null;
  bookingId: string | null;
  createdAt: string;
}

interface LogsResponse {
  logs: EventLog[];
  total: number;
  page: number;
  totalPages: number;
  totalTokens: number;
}

const EVENT_TYPES = ["", "agent_call", "flow_step", "error", "human_escalation", "config_change"];
const AGENT_NAMES = ["", "orchestrator", "intake-agent", "booking-agent", "followup-agent", "content-agent"];
const STATUS_OPTIONS = ["", "success", "failure", "timeout", "escalated"];

export default function LogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [eventType, setEventType] = useState("");
  const [agentName, setAgentName] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    if (eventType) params.set("eventType", eventType);
    if (agentName) params.set("agentName", agentName);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    params.set("page", String(page));
    params.set("limit", "50");

    try {
      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!res.ok) throw new Error("failed");
      const json = await res.json() as LogsResponse;
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [eventType, agentName, status, dateFrom, page]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">System</span>
          <h2>Event Logs</h2>
        </div>
        <div className="adm-header-actions">
          <button onClick={fetchLogs} className="btn btn-ghost btn-sm">⟳ Aktualisieren</button>
        </div>
      </header>
      <main className="adm-body">

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Event-Typ
            </label>
            <select
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); setPage(1); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t === "" ? "Alle Typen" : t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Agent
            </label>
            <select
              value={agentName}
              onChange={(e) => { setAgentName(e.target.value); setPage(1); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              {AGENT_NAMES.map((a) => <option key={a} value={a}>{a === "" ? "Alle Agents" : a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "" ? "Alle Status" : s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Ab Datum
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            />
          </div>
          <button
            onClick={fetchLogs}
            className="rounded-sm px-4 py-1.5 text-sm font-medium"
            style={{ backgroundColor: "var(--color-secondary)", color: "#fff" }}
          >
            Aktualisieren
          </button>
        </div>

        {data && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {data.total} Einträge — Seite {data.page} von {data.totalPages}
          </p>
        )}

        <div className="rounded-sm border" style={{ borderColor: "var(--color-accent)", backgroundColor: "#fff" }}>
          {error ? (
            <div className="p-4 text-sm" style={{ color: "#dc2626" }}>
              Fehler beim Laden. Bitte Seite neu laden.
            </div>
          ) : loading ? (
            <div className="p-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Wird geladen…
            </div>
          ) : (
            <LogViewer logs={data?.logs ?? []} totalTokens={data?.totalTokens ?? 0} />
          )}
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-sm border px-3 py-1.5 text-sm disabled:opacity-40"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              ← Zurück
            </button>
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-sm border px-3 py-1.5 text-sm disabled:opacity-40"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              Weiter →
            </button>
          </div>
        )}

      </main>
    </>
  );
}


