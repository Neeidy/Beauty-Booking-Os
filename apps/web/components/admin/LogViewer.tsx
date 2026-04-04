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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  success:   { bg: "#dcfce7", text: "#166534" },
  failure:   { bg: "#fee2e2", text: "#991b1b" },
  timeout:   { bg: "#fef9c3", text: "#854d0e" },
  escalated: { bg: "#ede9fe", text: "#5b21b6" },
};

const EVENT_ICONS: Record<string, string> = {
  agent_call:        "🤖",
  flow_step:         "→",
  error:             "✕",
  human_escalation:  "👤",
  config_change:     "⚙",
};

export default function LogViewer({ logs, totalTokens }: LogViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>
        Keine Logs gefunden.
      </div>
    );
  }

  return (
    <div>
      {/* Token summary */}
      {totalTokens > 0 && (
        <div className="px-4 py-2 text-xs border-b" style={{ borderColor: "var(--color-accent)", color: "var(--color-text-muted)" }}>
          Tokens in dieser Ansicht: <strong style={{ color: "var(--color-primary)" }}>{totalTokens.toLocaleString("de-AT")}</strong>
          <span className="ml-2">≈ €{(totalTokens * (3 / 1_000_000) * 0.92).toFixed(4)}</span>
        </div>
      )}

      <div className="divide-y" style={{ borderColor: "var(--color-accent)" }}>
        {logs.map((log) => {
          const isExpanded = expandedId === log.id;
          const statusStyle = STATUS_COLORS[log.status] ?? { bg: "#f1f5f9", text: "#475569" };
          const icon = EVENT_ICONS[log.eventType] ?? "•";

          return (
            <div key={log.id}>
              <div
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                {/* Time */}
                <span className="text-xs pt-0.5 w-32 shrink-0" style={{ color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                  {new Date(log.createdAt).toLocaleTimeString("de-AT", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                  <span className="block text-xs">
                    {new Date(log.createdAt).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })}
                  </span>
                </span>

                {/* Icon + event type */}
                <span className="text-sm w-4 shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium" style={{ color: "var(--color-primary)" }}>
                      {log.eventType}
                    </span>
                    {log.agentName && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-accent)", color: "var(--color-secondary)" }}>
                        {log.agentName}
                      </span>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                      {log.status}
                    </span>
                    {log.durationMs !== null && (
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{log.durationMs}ms</span>
                    )}
                    {log.tokenCount !== null && log.tokenCount > 0 && (
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{log.tokenCount} tok</span>
                    )}
                  </div>
                  {log.outputSummary && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                      {log.outputSummary}
                    </p>
                  )}
                  {log.errorMessage && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#dc2626" }}>
                      {log.errorMessage}
                    </p>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-3 pt-1 ml-7" style={{ backgroundColor: "#fafaf8", borderTop: "1px solid var(--color-accent)" }}>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Log-ID</p>
                      <p style={{ fontFamily: "monospace", color: "var(--color-primary)" }}>{log.id}</p>
                    </div>
                    {log.leadId && (
                      <div>
                        <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Lead-ID</p>
                        <p style={{ fontFamily: "monospace", color: "var(--color-primary)" }}>{log.leadId}</p>
                      </div>
                    )}
                    {log.bookingId && (
                      <div>
                        <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Booking-ID</p>
                        <p style={{ fontFamily: "monospace", color: "var(--color-primary)" }}>{log.bookingId}</p>
                      </div>
                    )}
                    {log.inputSummary && (
                      <div className="col-span-2">
                        <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Input</p>
                        <p className="rounded p-2" style={{ backgroundColor: "var(--color-accent)", color: "var(--color-primary)" }}>
                          {log.inputSummary}
                        </p>
                      </div>
                    )}
                    {log.outputSummary && (
                      <div className="col-span-2">
                        <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Output</p>
                        <p className="rounded p-2" style={{ backgroundColor: "var(--color-accent)", color: "var(--color-primary)" }}>
                          {log.outputSummary}
                        </p>
                      </div>
                    )}
                    {log.errorMessage && (
                      <div className="col-span-2">
                        <p className="font-semibold mb-1" style={{ color: "#dc2626" }}>Fehler</p>
                        <p className="rounded p-2" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                          {log.errorMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
