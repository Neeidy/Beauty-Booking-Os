"use client";

import { useState } from "react";

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

interface LogViewerProps {
  logs: EventLog[];
  totalTokens: number;
}

const STATUS_LEVEL: Record<string, string> = {
  success:   "success",
  failure:   "error",
  timeout:   "warn",
  escalated: "warn",
};

const EVENT_ICONS: Record<string, string> = {
  agent_call:       "🤖",
  flow_step:        "→",
  error:            "✕",
  human_escalation: "👤",
  config_change:    "⚙",
};

export default function LogViewer({ logs, totalTokens }: LogViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="empty">
        <div className="empty-ico">📋</div>
        <h4>Keine Logs</h4>
        <p>Keine Einträge für diesen Filter.</p>
      </div>
    );
  }

  return (
    <div>
      {totalTokens > 0 && (
        <div style={{ padding: "8px 16px", fontSize: "12px", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
          Tokens in dieser Ansicht: <strong style={{ color: "var(--color-text)" }}>{totalTokens.toLocaleString("de-AT")}</strong>
          <span style={{ marginLeft: "8px" }}>≈ €{(totalTokens * (3 / 1_000_000) * 0.92).toFixed(4)}</span>
        </div>
      )}

      <table className="logs-table">
        <thead>
          <tr>
            <th style={{ width: "120px" }}>Timestamp</th>
            <th style={{ width: "80px" }}>Level</th>
            <th style={{ width: "150px" }}>Agent</th>
            <th>Event / Message</th>
            <th style={{ width: "90px" }}>Tokens</th>
            <th style={{ width: "70px" }}>Dauer</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const levelClass = STATUS_LEVEL[log.status] ?? "info";
            const icon = EVENT_ICONS[log.eventType] ?? "•";

            return (
              <>
                <tr
                  key={log.id}
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="log-ts">
                    {new Date(log.createdAt).toLocaleTimeString("de-AT", {
                      hour: "2-digit", minute: "2-digit", second: "2-digit",
                    })}
                    <br />
                    {new Date(log.createdAt).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })}
                  </td>
                  <td>
                    <span className={`log-level ${levelClass}`}>{log.status}</span>
                  </td>
                  <td>
                    {log.agentName && (
                      <span className="log-agent">{icon} {log.agentName}</span>
                    )}
                  </td>
                  <td>
                    <div className="log-msg">{log.eventType}</div>
                    {log.outputSummary && (
                      <div className="log-meta">{log.outputSummary}</div>
                    )}
                    {log.errorMessage && (
                      <div className="log-meta" style={{ color: "var(--color-rose)" }}>{log.errorMessage}</div>
                    )}
                  </td>
                  <td className="log-tokens">
                    {log.tokenCount !== null && log.tokenCount > 0 ? log.tokenCount.toLocaleString("de-AT") : "—"}
                  </td>
                  <td className="log-duration">
                    {log.durationMs !== null ? `${log.durationMs}ms` : "—"}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${log.id}-expanded`} className="expanded-row">
                    <td colSpan={6}>
                      <div style={{ padding: "12px 16px", background: "var(--color-bg-surface)", fontSize: "12px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Log-ID</div>
                            <div style={{ fontFamily: "monospace" }}>{log.id}</div>
                          </div>
                          {log.leadId && (
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Lead-ID</div>
                              <div style={{ fontFamily: "monospace" }}>{log.leadId}</div>
                            </div>
                          )}
                          {log.bookingId && (
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Booking-ID</div>
                              <div style={{ fontFamily: "monospace" }}>{log.bookingId}</div>
                            </div>
                          )}
                          {log.inputSummary && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Input</div>
                              <div style={{ background: "var(--color-bg-card)", padding: "8px", borderRadius: "var(--radius-sm)", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                                {log.inputSummary}
                              </div>
                            </div>
                          )}
                          {log.outputSummary && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Output</div>
                              <div style={{ background: "var(--color-bg-card)", padding: "8px", borderRadius: "var(--radius-sm)", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                                {log.outputSummary}
                              </div>
                            </div>
                          )}
                          {log.errorMessage && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div style={{ fontWeight: 600, color: "var(--color-rose)", marginBottom: "4px" }}>Fehler</div>
                              <div style={{ background: "var(--color-rose-soft)", padding: "8px", borderRadius: "var(--radius-sm)", color: "var(--color-rose)" }}>
                                {log.errorMessage}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
