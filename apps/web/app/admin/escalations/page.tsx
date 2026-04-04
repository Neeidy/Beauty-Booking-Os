"use client";

import { useEffect, useState, useCallback } from "react";
import AdminHeader from "../../../components/admin/AdminHeader";
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

  const handleAction = (leadId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const filtered = prev.leads.filter((l) => l.id !== leadId);
      return { leads: filtered, total: filtered.length };
    });
  };

  return (
    <>
      <AdminHeader title="Eskalations-Queue" />
      <main className="p-6 space-y-4">

        {/* Info banner */}
        <div className="rounded-sm border px-4 py-3 text-sm" style={{ borderColor: "#fca5a5", backgroundColor: "#fef2f2", color: "#991b1b" }}>
          Diese Anfragen wurden vom AI mit niedriger Konfidenz (&lt;70%) klassifiziert und benötigen manuelle Bearbeitung.
        </div>

        <div className="flex items-center justify-between">
          {data && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {data.total} offene Anfrage{data.total !== 1 ? "n" : ""}
            </p>
          )}
          <button
            onClick={fetchEscalations}
            className="rounded-sm px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: "var(--color-secondary)", color: "#fff" }}
          >
            Aktualisieren
          </button>
        </div>

        {error ? (
          <div className="rounded-sm border p-4 text-sm" style={{ borderColor: "var(--color-accent)", color: "#dc2626" }}>
            Fehler beim Laden. Bitte Seite neu laden.
          </div>
        ) : loading ? (
          <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Wird geladen…</div>
        ) : data && data.leads.length === 0 ? (
          <div className="rounded-sm border p-8 text-center" style={{ borderColor: "var(--color-accent)", backgroundColor: "#fff" }}>
            <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>Keine offenen Anfragen</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Alle Leads wurden bearbeitet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data?.leads.map((lead) => (
              <EscalationCard key={lead.id} lead={lead} onAction={handleAction} />
            ))}
          </div>
        )}

      </main>
    </>
  );
}
