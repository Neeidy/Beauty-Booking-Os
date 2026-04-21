"use client";

import { useEffect, useState, useCallback } from "react";
import EscalationCard from "../../../components/admin/EscalationCard";

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
          <h2>Eskalations-Queue</h2>
          <div className="breadcrumb">Admin / Eskalationen</div>
        </div>
        <div className="adm-header-actions">
          <button onClick={fetchEscalations} className="btn btn-ghost" style={{ fontSize: "13px" }}>
            Aktualisieren
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
          Diese Anfragen wurden vom AI mit niedriger Konfidenz (&lt;70%) klassifiziert und benötigen manuelle Bearbeitung.
        </div>

        {data && (
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
            {data.total} offene Anfrage{data.total !== 1 ? "n" : ""}
          </p>
        )}

        {error ? (
          <div className="empty">
            <div className="empty-ico">⚠</div>
            <h4>Fehler beim Laden</h4>
            <p>Bitte Seite neu laden.</p>
          </div>
        ) : loading ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>Wird geladen…</div>
        ) : data && data.leads.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">✓</div>
            <h4>Keine offenen Anfragen</h4>
            <p>Alle Leads wurden bearbeitet.</p>
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
