"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Lead {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  source: string;
  intent: string | null;
  intentConfidence: number | null;
  rawMessage: string | null;
  language: string | null;
  createdAt: string;
}

interface EscalationCardProps {
  lead: Lead;
  onAction: (leadId: string, action: "qualify" | "spam" | "contacted") => void;
}

export default function EscalationCard({ lead, onAction }: EscalationCardProps) {
  const { dict } = useI18n();
  const t = dict.admin.escalations;
  const rt = dict.admin.relativeTime;
  const sourceLabels = t.sourceLabels as Record<string, string>;
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "qualify" | "spam" | "contacted") {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/escalations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, action }),
      });
      if (res.ok) onAction(lead.id, action);
    } finally {
      setLoading(false);
    }
  }

  const age = Math.round((Date.now() - new Date(lead.createdAt).getTime()) / 60000);
  const ageText = age < 60
    ? rt.minutesAgo.replace("{m}", String(age))
    : age < 1440
    ? rt.hoursAgo.replace("{h}", String(Math.round(age / 60)))
    : rt.daysAgo.replace("{d}", String(Math.round(age / 1440)));

  const conf = lead.intentConfidence ?? 0;
  const confFill = conf < 50 ? "var(--color-amber)" : "var(--color-emerald)";

  return (
    <article className="kanban-card needs-review">
      <div className="kanban-card-top">
        <div className="kanban-name">{lead.customerName ?? t.unknown}</div>
        <div className="kanban-when">{ageText}</div>
      </div>

      {lead.rawMessage && (
        <div className="kanban-msg">{lead.rawMessage}</div>
      )}

      <div className="kanban-meta">
        <span className="kanban-pill">{sourceLabels[lead.source] ?? lead.source}</span>
        {lead.intent && <span className="kanban-pill">{lead.intent}</span>}
        {lead.language && <span className="kanban-pill">{lead.language.toUpperCase()}</span>}
      </div>

      {lead.customerEmail && (
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "4px" }}>
          ✉ {lead.customerEmail}
        </div>
      )}
      {lead.customerPhone && (
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "8px" }}>
          ☎ {lead.customerPhone}
        </div>
      )}

      <div className="kanban-card-foot">
        <div className="kanban-conf">
          {t.aiPrefix} {lead.intentConfidence !== null ? `${lead.intentConfidence}%` : "—"}
          {lead.intentConfidence !== null && (
            <span className="kanban-conf-bar">
              <span className="kanban-conf-fill" style={{ width: `${conf}%`, background: confFill }} />
            </span>
          )}
        </div>
        <div className="kanban-act-btns">
          <button
            className="kanban-ico-btn"
            title={t.titleQualify}
            onClick={() => handleAction("qualify")}
            disabled={loading}
          >
            ✓
          </button>
          <button
            className="kanban-ico-btn"
            title={t.titleContacted}
            onClick={() => handleAction("contacted")}
            disabled={loading}
          >
            ✉
          </button>
          <button
            className="kanban-ico-btn"
            title={t.titleSpam}
            onClick={() => handleAction("spam")}
            disabled={loading}
          >
            ✕
          </button>
        </div>
      </div>
    </article>
  );
}
