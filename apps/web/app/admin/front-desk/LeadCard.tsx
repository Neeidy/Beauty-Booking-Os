"use client";

import { useState } from "react";

export interface FrontDeskLead {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  rawMessage: string | null;
  intent: string | null;
  intentConfidence: number | null;
  source: string | null;
  status: string;
  createdAt: string;
}

interface LeadCardProps {
  lead: FrontDeskLead;
  lane: "new" | "contacted" | "qualified" | "booked" | "lost";
  onStatusChange: (
    leadId: string,
    newStatus: string,
    fromLane: "new" | "contacted" | "qualified" | "booked" | "lost"
  ) => Promise<void>;
}

const SOURCE_CLASS: Record<string, string> = {
  web_form: "src-web",
  google_business: "src-google",
  google: "src-google",
  phone: "src-phone",
  instagram_dm: "src-instagram",
  instagram: "src-instagram",
};

const SOURCE_LABEL: Record<string, string> = {
  web_form: "🌐 Web",
  google_business: "📱 Google",
  google: "📱 Google",
  phone: "☎ Telefon",
  instagram_dm: "📸 Instagram",
  instagram: "📸 Instagram",
};

function formatWhen(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std`;
  return `vor ${Math.floor(hrs / 24)} Tagen`;
}

function confColor(confidence: number): string {
  if (confidence >= 0.8) return "var(--color-emerald)";
  if (confidence >= 0.5) return "var(--color-amber)";
  return "var(--color-rose)";
}

export default function LeadCard({ lead, lane, onStatusChange }: LeadCardProps) {
  const [loading, setLoading] = useState(false);

  const isNeedsReview =
    lead.intentConfidence !== null && lead.intentConfidence < 0.5;
  const isHighIntent =
    lead.intentConfidence !== null && lead.intentConfidence >= 0.8;

  const srcClass = SOURCE_CLASS[lead.source ?? ""] ?? "";
  const srcLabel = SOURCE_LABEL[lead.source ?? ""] ?? lead.source ?? "—";

  async function move(newStatus: string) {
    setLoading(true);
    try {
      await onStatusChange(lead.id, newStatus, lane);
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className={`kanban-card${isNeedsReview ? " needs-review" : ""}`}>
      <div className="kanban-card-top">
        <div className="kanban-name">{lead.customerName ?? "Unbekannt"}</div>
        <div className="kanban-when">{formatWhen(lead.createdAt)}</div>
      </div>

      {lead.rawMessage && (
        <div className="kanban-msg">
          &quot;{lead.rawMessage.slice(0, 120)}
          {lead.rawMessage.length > 120 ? "…" : ""}&quot;
        </div>
      )}

      <div className="kanban-meta">
        {srcClass && (
          <span className={`kanban-pill ${srcClass}`}>{srcLabel}</span>
        )}
        {lead.intent && (
          <span className="kanban-pill">{lead.intent}</span>
        )}
        {isHighIntent && (
          <span className="kanban-pill intent-high">High Intent</span>
        )}
      </div>

      <div className="kanban-card-foot">
        <div className="kanban-conf">
          {lead.intentConfidence !== null ? (
            <>
              AI: {(lead.intentConfidence * 100).toFixed(0)}%
              <span className="kanban-conf-bar">
                <span
                  className="kanban-conf-fill"
                  style={{
                    width: `${lead.intentConfidence * 100}%`,
                    background: confColor(lead.intentConfidence),
                  }}
                />
              </span>
            </>
          ) : (
            "AI: —"
          )}
        </div>
        <div className="kanban-act-btns">
          {lane === "new" && (
            <>
              <button
                className="kanban-ico-btn"
                title="Kontaktiert"
                disabled={loading}
                onClick={() => move("contacted")}
              >
                ✉
              </button>
              <button
                className="kanban-ico-btn"
                title="Verloren"
                disabled={loading}
                onClick={() => move("lost")}
              >
                ✗
              </button>
            </>
          )}
          {lane === "contacted" && (
            <>
              <button
                className="kanban-ico-btn"
                title="Qualifiziert"
                disabled={loading}
                onClick={() => move("qualified")}
              >
                ✓
              </button>
              <button
                className="kanban-ico-btn"
                title="Verloren"
                disabled={loading}
                onClick={() => move("lost")}
              >
                ✗
              </button>
            </>
          )}
          {lane === "qualified" && (
            <button
              className="kanban-ico-btn"
              title="Buchen"
              disabled={loading}
              onClick={() => move("booked")}
            >
              📅
            </button>
          )}
          {lane === "booked" && (
            <button
              className="kanban-ico-btn"
              title="Details"
              disabled={loading}
              onClick={() => undefined}
            >
              →
            </button>
          )}
          {lane === "lost" && (
            <button
              className="kanban-ico-btn"
              title="Wiederherstellen"
              disabled={loading}
              onClick={() => move("new")}
            >
              ↺
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
