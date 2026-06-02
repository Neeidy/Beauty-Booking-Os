"use client";

import { useState } from "react";
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

function agentBadgeClass(agentName: string | null): string {
  if (!agentName) return "";
  if (agentName.includes("triage") || agentName.includes("intake") || agentName.includes("orchestrator")) return "triage";
  if (agentName.includes("rebook") || agentName.includes("rebooking")) return "rebook";
  if (agentName.includes("notify") || agentName.includes("followup")) return "notify";
  if (agentName.includes("review") || agentName.includes("content")) return "review";
  if (agentName.includes("slot") || agentName.includes("booking")) return "slot";
  return "";
}

export default function LogViewer({ logs, totalTokens }: LogViewerProps) {
  const { dict, locale } = useI18n();
  const t = dict.admin.logs;
  const numLocale = locale === "de" ? "de-AT" : "en-GB";
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="empty">
        <div className="empty-ico">📋</div>
        <h4>{t.emptyTitle}</h4>
        <p>{t.emptyText}</p>
      </div>
    );
  }

  return (
    <div>
      {totalTokens > 0 && (
        <div style={{ padding: "8px 16px", fontSize: "12px", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
          {t.tokensInView} <strong style={{ color: "var(--color-text)" }}>{totalTokens.toLocaleString(numLocale)}</strong>
          <span style={{ marginLeft: "8px" }}>≈ €{(totalTokens * (3 / 1_000_000) * 0.92).toFixed(4)}</span>
        </div>
      )}

      <table className="logs-table">
        <thead>
          <tr>
            <th style={{ width: "120px" }}>{t.thTimestamp}</th>
            <th style={{ width: "80px" }}>{t.thLevel}</th>
            <th style={{ width: "150px" }}>{t.thAgent}</th>
            <th>{t.thEventMessage}</th>
            <th style={{ width: "90px" }}>{t.thTokens}</th>
            <th style={{ width: "70px" }}>{t.thDuration}</th>
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
                    {new Date(log.createdAt).toLocaleTimeString(numLocale, {
                      hour: "2-digit", minute: "2-digit", second: "2-digit",
                    })}
                    <br />
                    {new Date(log.createdAt).toLocaleDateString(numLocale, { day: "2-digit", month: "2-digit" })}
                  </td>
                  <td>
                    <span className={`log-level ${levelClass}`}>{log.status}</span>
                  </td>
                  <td>
                    {log.agentName && (
                      <span className={`log-agent-badge ${agentBadgeClass(log.agentName)}`}>
                        {icon} {log.agentName}
                      </span>
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
                    {log.tokenCount !== null && log.tokenCount > 0 ? log.tokenCount.toLocaleString(numLocale) : "—"}
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
                            <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>{t.logId}</div>
                            <div style={{ fontFamily: "monospace" }}>{log.id}</div>
                          </div>
                          {log.leadId && (
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>{t.leadId}</div>
                              <div style={{ fontFamily: "monospace" }}>{log.leadId}</div>
                            </div>
                          )}
                          {log.bookingId && (
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>{t.bookingId}</div>
                              <div style={{ fontFamily: "monospace" }}>{log.bookingId}</div>
                            </div>
                          )}
                          {log.inputSummary && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>{t.input}</div>
                              <div style={{ background: "var(--color-bg-card)", padding: "8px", borderRadius: "var(--radius-sm)", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                                {log.inputSummary}
                              </div>
                            </div>
                          )}
                          {log.outputSummary && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>{t.output}</div>
                              <div style={{ background: "var(--color-bg-card)", padding: "8px", borderRadius: "var(--radius-sm)", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                                {log.outputSummary}
                              </div>
                            </div>
                          )}
                          {log.errorMessage && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div style={{ fontWeight: 600, color: "var(--color-rose)", marginBottom: "4px" }}>{t.error}</div>
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
