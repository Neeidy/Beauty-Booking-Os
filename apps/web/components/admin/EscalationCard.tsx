"use client";

import { useState } from "react";

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

const SOURCE_LABELS: Record<string, string> = {
  web_form: "Web",
  instagram_dm: "Instagram",
  whatsapp: "WhatsApp",
  email: "E-Mail",
};

export default function EscalationCard({ lead, onAction }: EscalationCardProps) {
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
    ? `vor ${age} Min.`
    : age < 1440
    ? `vor ${Math.round(age / 60)} Std.`
    : `vor ${Math.round(age / 1440)} Tagen`;

  return (
    <div className="rounded-sm border p-4 space-y-3" style={{ borderColor: "#fca5a5", backgroundColor: "#fff7f7" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--color-primary)" }}>
            {lead.customerName ?? "Unbekannt"}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {SOURCE_LABELS[lead.source] ?? lead.source} · {ageText}
            {lead.language && ` · ${lead.language.toUpperCase()}`}
          </p>
        </div>
        {lead.intentConfidence !== null && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
            {lead.intentConfidence}% Konfidenz
          </span>
        )}
      </div>

      {/* Contact */}
      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {lead.customerEmail && <span className="mr-3">✉ {lead.customerEmail}</span>}
        {lead.customerPhone && <span>☎ {lead.customerPhone}</span>}
      </div>

      {/* Intent */}
      {lead.intent && (
        <div>
          <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--color-text-muted)" }}>Erkannter Intent</p>
          <p className="text-xs" style={{ color: "var(--color-primary)" }}>{lead.intent}</p>
        </div>
      )}

      {/* Raw message */}
      {lead.rawMessage && (
        <div className="rounded p-2 text-xs" style={{ backgroundColor: "var(--color-accent)", color: "var(--color-primary)" }}>
          {lead.rawMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => handleAction("qualify")}
          disabled={loading}
          className="flex-1 rounded-sm py-1.5 text-xs font-medium disabled:opacity-40"
          style={{ backgroundColor: "#dcfce7", color: "#166534" }}
        >
          Qualifizieren
        </button>
        <button
          onClick={() => handleAction("contacted")}
          disabled={loading}
          className="flex-1 rounded-sm py-1.5 text-xs font-medium disabled:opacity-40"
          style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}
        >
          Kontaktiert
        </button>
        <button
          onClick={() => handleAction("spam")}
          disabled={loading}
          className="flex-1 rounded-sm py-1.5 text-xs font-medium disabled:opacity-40"
          style={{ backgroundColor: "#f1f5f9", color: "#475569" }}
        >
          Spam
        </button>
      </div>
    </div>
  );
}
