"use client";

import { useEffect, useState, useCallback } from "react";
import AdminHeader from "../../../components/admin/AdminHeader";
import LeadTable from "../../../components/admin/LeadTable";

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

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_OPTIONS = ["", "new", "contacted", "qualified", "booking_started", "booked", "lost", "spam"];
const SOURCE_OPTIONS = ["", "web_form", "instagram_dm", "whatsapp", "email", "phone", "walk_in"];

export default function LeadsPage() {
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("limit", "20");

    try {
      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      if (!res.ok) throw new Error("failed");
      const json = await res.json() as LeadsResponse;
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [status, source, search, dateFrom, dateTo, page]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const handleFilterChange = () => {
    setPage(1);
  };

  return (
    <>
      <AdminHeader title="Leads" />
      <main className="p-6 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Suche
            </label>
            <input
              type="text"
              value={search}
              placeholder="Name, E-Mail, Telefon…"
              onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)", minWidth: "200px" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); handleFilterChange(); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === "" ? "Alle Status" : s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Kanal
            </label>
            <select
              value={source}
              onChange={(e) => { setSource(e.target.value); handleFilterChange(); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === "" ? "Alle Kanäle" : s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Von
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); handleFilterChange(); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Bis
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); handleFilterChange(); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            />
          </div>
          <button
            onClick={fetchLeads}
            className="rounded-sm px-4 py-1.5 text-sm font-medium"
            style={{ backgroundColor: "var(--color-secondary)", color: "#fff" }}
          >
            Aktualisieren
          </button>
        </div>

        {/* Results info */}
        {data && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {data.total} Leads gefunden — Seite {data.page} von {data.totalPages}
          </p>
        )}

        {/* Table */}
        <div className="rounded-sm border" style={{ borderColor: "var(--color-accent)", backgroundColor: "#fff" }}>
          {error ? (
            <div className="p-4 text-sm" style={{ color: "#dc2626" }}>
              Fehler beim Laden. Bitte Seite neu laden.
            </div>
          ) : loading ? (
            <div className="p-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Wird geladen…
            </div>
          ) : (
            <LeadTable leads={data?.leads ?? []} />
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-sm border px-3 py-1.5 text-sm disabled:opacity-40"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              ← Zurück
            </button>
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-sm border px-3 py-1.5 text-sm disabled:opacity-40"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              Weiter →
            </button>
          </div>
        )}

      </main>
    </>
  );
}
