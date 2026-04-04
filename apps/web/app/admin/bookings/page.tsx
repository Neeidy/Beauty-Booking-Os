"use client";

import { useEffect, useState, useCallback } from "react";
import AdminHeader from "../../../components/admin/AdminHeader";
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
      <AdminHeader title="Buchungen" />
      <main className="p-6 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
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
              Termin von
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Termin bis
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="rounded-sm border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-primary)" }}
            />
          </div>
          <button
            onClick={fetchBookings}
            className="rounded-sm px-4 py-1.5 text-sm font-medium"
            style={{ backgroundColor: "var(--color-secondary)", color: "#fff" }}
          >
            Aktualisieren
          </button>
        </div>

        {data && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {data.total} Buchungen gefunden — Seite {data.page} von {data.totalPages}
          </p>
        )}

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
            <BookingTable bookings={data?.bookings ?? []} onStatusChange={handleStatusChange} />
          )}
        </div>

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
