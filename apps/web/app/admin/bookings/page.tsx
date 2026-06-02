"use client";

import { useEffect, useState, useCallback } from "react";
import BookingTable from "../../../components/admin/BookingTable";
import { useI18n } from "@/lib/i18n/I18nProvider";

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
  const { dict } = useI18n();
  const t = dict.admin.bookings;
  const statusLabels = dict.admin.statusLabels as Record<string, string>;
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
          <span className="breadcrumb">{t.breadcrumb}</span>
          <h2>{t.title}</h2>
        </div>
        <div className="adm-header-actions">
          <button onClick={fetchBookings} className="btn btn-ghost btn-sm">{t.refresh}</button>
        </div>
      </header>

      <div className="logs-filter-bar">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "" ? t.allStatus : (statusLabels[s] ?? s)}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          placeholder={t.fromPlaceholder}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          placeholder={t.toPlaceholder}
        />
        <button onClick={fetchBookings} className="btn btn-ghost btn-sm">{t.filter}</button>
      </div>

      <div className="adm-body">
        {data && (
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "12px" }}>
            {t.count
              .replace("{total}", String(data.total))
              .replace("{page}", String(data.page))
              .replace("{totalPages}", String(data.totalPages))}
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
              {t.back}
            </button>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="btn btn-ghost btn-sm"
            >
              {t.next}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
