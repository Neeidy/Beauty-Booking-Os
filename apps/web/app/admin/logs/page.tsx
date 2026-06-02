"use client";

import { useEffect, useState, useCallback } from "react";
import LogViewer from "../../../components/admin/LogViewer";
import { useI18n } from "@/lib/i18n/I18nProvider";

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
  const { dict } = useI18n();
  const t = dict.admin.logs;
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
          <span className="breadcrumb">{t.breadcrumb}</span>
          <h2>{t.title}</h2>
        </div>
        <div className="adm-header-actions">
          <button onClick={fetchLogs} className="btn btn-ghost btn-sm">{t.refresh}</button>
        </div>
      </header>

      <div className="logs-filter-bar">
        <select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setPage(1); }}
        >
          {EVENT_TYPES.map((opt) => <option key={opt} value={opt}>{opt === "" ? t.allTypes : opt}</option>)}
        </select>
        <select
          value={agentName}
          onChange={(e) => { setAgentName(e.target.value); setPage(1); }}
        >
          {AGENT_NAMES.map((a) => <option key={a} value={a}>{a === "" ? t.allAgents : a}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "" ? t.allStatus : s}</option>)}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="logs-date-input"
        />
        <button onClick={fetchLogs} className="btn btn-ghost btn-sm">{t.filter}</button>
      </div>

      <div className="adm-body">
        {data && (
          <p className="log-count">
            {t.count
              .replace("{total}", String(data.total))
              .replace("{page}", String(data.page))
              .replace("{totalPages}", String(data.totalPages))}
          </p>
        )}

        {error ? (
          <div className="empty">
            <div className="empty-ico">⚠</div>
            <h4>{t.loadErrorTitle}</h4>
            <p>{t.loadErrorText}</p>
          </div>
        ) : loading ? (
          <div className="loading-text">{t.loading}</div>
        ) : (
          <LogViewer logs={data?.logs ?? []} totalTokens={data?.totalTokens ?? 0} />
        )}

        {data && data.totalPages > 1 && (
          <div className="log-pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-ghost btn-sm"
            >
              {t.back}
            </button>
            <span className="log-pagination-info">
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="btn btn-ghost btn-sm"
            >
              {t.next}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
