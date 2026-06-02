"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Dictionary } from "@/lib/i18n/dictionary";

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

function formatWhen(isoStr: string, rt: Dictionary["admin"]["relativeTime"]): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return rt.justNow;
  if (mins < 60) return rt.minutesAgo.replace("{m}", String(mins));
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return rt.hoursAgo.replace("{h}", String(hrs));
  return rt.daysAgo.replace("{d}", String(Math.floor(hrs / 24)));
}

function confColor(confidence: number): string {
  if (confidence >= 0.8) return "var(--color-emerald)";
  if (confidence >= 0.5) return "var(--color-amber)";
  return "var(--color-rose)";
}

export default function LeadCard({ lead, lane, onStatusChange }: LeadCardProps) {
  const { dict } = useI18n();
  const t = dict.admin.leadCard;
  const sourceLabels = dict.admin.sourceLabels as Record<string, string>;
  const [loading, setLoading] = useState(false);

  const isNeedsReview =
    lead.intentConfidence !== null && lead.intentConfidence < 0.5;
  const isHighIntent =
    lead.intentConfidence !== null && lead.intentConfidence >= 0.8;

  const srcClass = SOURCE_CLASS[lead.source ?? ""] ?? "";
  const srcLabel = sourceLabels[lead.source ?? ""] ?? lead.source ?? "—";

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
        <div className="kanban-name">{lead.customerName ?? t.unknown}</div>
        <div className="kanban-when">{formatWhen(lead.createdAt, dict.admin.relativeTime)}</div>
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
          <span className="kanban-pill intent-high">{t.highIntent}</span>
        )}
      </div>

      <div className="kanban-card-foot">
        <div className="kanban-conf">
          {lead.intentConfidence !== null ? (
            <>
              {t.aiPrefix} {(lead.intentConfidence * 100).toFixed(0)}%
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
            `${t.aiPrefix} —`
          )}
        </div>
        <div className="kanban-act-btns">
          {lane === "new" && (
            <>
              <button
                className="kanban-ico-btn"
                title={t.titleContacted}
                disabled={loading}
                onClick={() => move("contacted")}
              >
                ✉
              </button>
              <button
                className="kanban-ico-btn"
                title={t.titleLost}
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
                title={t.titleQualified}
                disabled={loading}
                onClick={() => move("qualified")}
              >
                ✓
              </button>
              <button
                className="kanban-ico-btn"
                title={t.titleLost}
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
              title={t.titleBook}
              disabled={loading}
              onClick={() => move("booked")}
            >
              📅
            </button>
          )}
          {lane === "booked" && (
            <button
              className="kanban-ico-btn"
              title={t.titleDetails}
              disabled={loading}
              onClick={() => undefined}
            >
              →
            </button>
          )}
          {lane === "lost" && (
            <button
              className="kanban-ico-btn"
              title={t.titleRestore}
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
