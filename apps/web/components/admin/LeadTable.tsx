"use client";

import Link from "next/link";
import { useState } from "react";

interface Lead {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  source: string;
  intent: string | null;
  intentConfidence: number | null;
  status: string;
  assignedTo: string | null;
  language: string | null;
  rawMessage: string | null;
  createdAt: string;
}

interface LeadTableProps {
  leads: Lead[];
}

const SOURCE_LABELS: Record<string, string> = {
  web_form: "Web",
  instagram_dm: "Instagram",
  whatsapp: "WhatsApp",
  email: "E-Mail",
  phone: "Telefon",
  walk_in: "Walk-in",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "#e0f2fe", text: "#0369a1" },
  contacted: { bg: "#fef9c3", text: "#854d0e" },
  qualified: { bg: "#dcfce7", text: "#166534" },
  booking_started: { bg: "#ede9fe", text: "#5b21b6" },
  booked: { bg: "#d1fae5", text: "#065f46" },
  lost: { bg: "#fee2e2", text: "#991b1b" },
  spam: { bg: "#f1f5f9", text: "#475569" },
};

function confidenceColor(confidence: number | null): string {
  if (confidence === null) return "var(--color-text-muted)";
  if (confidence >= 80) return "#16a34a";
  if (confidence >= 60) return "#ca8a04";
  return "#dc2626";
}

export default function LeadTable({ leads }: LeadTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (leads.length === 0) {
    return (
      <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>
        Keine Leads gefunden.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: "2px solid var(--color-accent)" }}>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Datum</th>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Name</th>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Kontakt</th>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Kanal</th>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Intent</th>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Konfidenz</th>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Status</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const isExpanded = expandedId === lead.id;
            const needsReview = lead.assignedTo === "human_review";
            const statusStyle = STATUS_COLORS[lead.status] ?? { bg: "#f1f5f9", text: "#475569" };

            return (
              <>
                <tr
                  key={lead.id}
                  style={{
                    borderBottom: "1px solid var(--color-accent)",
                    backgroundColor: needsReview ? "#fefce8" : "transparent",
                  }}
                >
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(lead.createdAt).toLocaleDateString("de-AT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 font-medium" style={{ color: "var(--color-primary)" }}>
                    {lead.customerName ?? "—"}
                    {needsReview && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "#fef08a", color: "#854d0e" }}>
                        Review
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--color-text-muted)" }}>
                    {lead.customerEmail ?? lead.customerPhone ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--color-accent)", color: "var(--color-primary)" }}>
                      {SOURCE_LABELS[lead.source] ?? lead.source}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--color-primary)" }}>
                    {lead.intent ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-semibold" style={{ color: confidenceColor(lead.intentConfidence) }}>
                    {lead.intentConfidence !== null ? `${lead.intentConfidence}%` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                        className="text-xs underline"
                        style={{ color: "var(--color-secondary)" }}
                      >
                        {isExpanded ? "Schließen" : "Details"}
                      </button>
                      <Link
                        href={
                          lead.customerPhone && lead.customerPhone.length > 0
                            ? `/admin/clients/${encodeURIComponent(lead.customerPhone)}`
                            : `/admin/clients/${lead.id}`
                        }
                        className="text-xs underline"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Profili Gör
                      </Link>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${lead.id}-detail`} style={{ backgroundColor: "#fafaf8", borderBottom: "1px solid var(--color-accent)" }}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Lead-ID</p>
                          <p style={{ color: "var(--color-primary)", fontFamily: "monospace" }}>{lead.id}</p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Sprache</p>
                          <p style={{ color: "var(--color-primary)" }}>{lead.language?.toUpperCase() ?? "—"}</p>
                        </div>
                        {lead.customerEmail && (
                          <div>
                            <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>E-Mail</p>
                            <p style={{ color: "var(--color-primary)" }}>{lead.customerEmail}</p>
                          </div>
                        )}
                        {lead.customerPhone && (
                          <div>
                            <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Telefon</p>
                            <p style={{ color: "var(--color-primary)" }}>{lead.customerPhone}</p>
                          </div>
                        )}
                        {lead.rawMessage && (
                          <div className="col-span-2">
                            <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Nachricht</p>
                            <p className="rounded p-2" style={{ backgroundColor: "var(--color-accent)", color: "var(--color-primary)" }}>
                              {lead.rawMessage}
                            </p>
                          </div>
                        )}
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
