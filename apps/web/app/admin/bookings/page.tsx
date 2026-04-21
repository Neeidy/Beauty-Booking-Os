"use client";

import { useEffect, useState, useCallback } from "react";
import BookingTable from "../../../components/admin/BookingTable";

interface Booking {
  id: string;
  customerName: string;
  customerContact: string;
  appointmentAt: string;
  durationMinutes: number;
  status: string;
  notes: string | null;
  reminderSentAt: string[] | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

interface BookingsResponse {
  bookings: Booking[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_OPTIONS = ["", "pending", "confirmed", "reminded", "completed", "no_show", "cancelled", "rescheduled"];

export default function BookingsPage() {
  const [data, setData] = useState<BookingsResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("limit", "20");

    try {
      const res = await fetch(`/api/admin/bookings?${params.toString()}`);
      if (!res.ok) throw new Error("failed");
      const json = await res.json() as BookingsResponse;
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [status, dateFrom, dateTo, page]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const handleStatusChange = (id: string, newStatus: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bookings: prev.bookings.map((b) => b.id === id ? { ...b, status: newStatus } : b),
      };
    });
  };

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Buchungen</span>
          <h2>Buchungen</h2>
        </div>
        <div className="adm-header-actions">
          <button onClick={fetchBookings} className="btn btn-ghost btn-sm">⟳ Aktualisieren</button>
        </div>
      </header>

      <div className="logs-filter-bar">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "" ? "Alle Status" : s}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          placeholder="Von"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          placeholder="Bis"
        />
        <button onClick={fetchBookings} className="btn btn-ghost btn-sm">Filtern</button>
      </div>

      <div className="adm-body">
        {data && (
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "12px" }}>
            {data.total} Buchungen — Seite {data.page} von {data.totalPages}
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
        ) : (
          <BookingTable bookings={data?.bookings ?? []} onStatusChange={handleStatusChange} />
        )}

        {data && data.totalPages > 1 && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-ghost btn-sm"
            >
              ← Zurück
            </button>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="btn btn-ghost btn-sm"
            >
              Weiter →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
