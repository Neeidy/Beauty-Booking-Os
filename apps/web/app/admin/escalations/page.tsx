"use client";

import { useEffect, useState, useCallback } from "react";
import EscalationCard from "../../../components/admin/EscalationCard";
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

interface EscalationsResponse {
  leads: Lead[];
  total: number;
}

export default function EscalationsPage() {
  const { dict } = useI18n();
  const t = dict.admin.escalations;
  const [data, setData] = useState<EscalationsResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEscalations = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/escalations");
      if (!res.ok) throw new Error("failed");
      const json = await res.json() as EscalationsResponse;
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEscalations();
  }, [fetchEscalations]);

  const handleAction = (leadId: string, _action?: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const filtered = prev.leads.filter((l) => l.id !== leadId);
      return { leads: filtered, total: filtered.length };
    });
  };

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <h2>{t.title}</h2>
          <div className="breadcrumb">{t.breadcrumb}</div>
        </div>
        <div className="adm-header-actions">
          <button onClick={fetchEscalations} className="btn btn-ghost" style={{ fontSize: "13px" }}>
            {t.refresh}
          </button>
        </div>
      </header>

      <div className="adm-body">
        <div style={{
          background: "var(--color-rose-soft)",
          color: "var(--color-rose-soft-text)",
          border: "1px solid var(--color-rose)",
          borderRadius: "var(--radius-md)",
          padding: "12px 16px",
          fontSize: "13px",
          marginBottom: "20px",
        }}>
          {t.notice}
        </div>

        {data && (
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
            {(data.total === 1 ? t.openOne : t.openMany).replace("{count}", String(data.total))}
          </p>
        )}

        {error ? (
          <div className="empty">
            <div className="empty-ico">⚠</div>
            <h4>{t.loadErrorTitle}</h4>
            <p>{t.loadErrorText}</p>
          </div>
        ) : loading ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>{t.loading}</div>
        ) : data && data.leads.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">✓</div>
            <h4>{t.emptyTitle}</h4>
            <p>{t.emptyText}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: "16px" }}>
            {data?.leads.map((lead) => (
              <EscalationCard key={lead.id} lead={lead} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
