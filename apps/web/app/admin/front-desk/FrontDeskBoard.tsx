"use client";

import { useState } from "react";
import BookingCard, { type FrontDeskBooking } from "./BookingCard";

interface FrontDeskColumns {
  unconfirmed: FrontDeskBooking[];
  confirmed: FrontDeskBooking[];
  completed: FrontDeskBooking[];
}

interface FrontDeskResponse {
  date: string;
  totalBookings: number;
  columns: FrontDeskColumns;
}

interface FrontDeskBoardProps {
  initialData: FrontDeskResponse;
}

const COLUMN_CONFIG: {
  key: "unconfirmed" | "confirmed" | "completed";
  title: string;
  badgeColor: string;
}[] = [
  { key: "unconfirmed", title: "Onaylanmadı", badgeColor: "#D97706" },
  { key: "confirmed",   title: "Onaylandı",   badgeColor: "#059669" },
  { key: "completed",   title: "Tamamlandı",  badgeColor: "#6B7280" },
];

function toColumn(status: string): "unconfirmed" | "confirmed" | "completed" {
  if (status === "confirmed") return "confirmed";
  if (status === "pending" || status === "reminded") return "unconfirmed";
  return "completed";
}

export default function FrontDeskBoard({ initialData }: FrontDeskBoardProps) {
  const [columns, setColumns] = useState<FrontDeskColumns>(initialData.columns);
  const [error, setError] = useState<string | null>(null);

  async function onStatusChange(
    bookingId: string,
    newStatus: string,
    fromColumn: "unconfirmed" | "confirmed" | "completed",
  ): Promise<void> {
    const booking = columns[fromColumn].find((b) => b.id === bookingId);
    if (!booking) return;

    const toCol = toColumn(newStatus);

    // Optimistic update
    setColumns((prev) => ({
      ...prev,
      [fromColumn]: prev[fromColumn].filter((b) => b.id !== bookingId),
      [toCol]: [...prev[toCol], { ...booking, status: newStatus }],
    }));

    try {
      const res = await fetch(`/api/booking/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("Status update failed:", err);

      // Rollback
      setColumns((prev) => ({
        ...prev,
        [fromColumn]: [...prev[fromColumn], booking],
        [toCol]: prev[toCol].filter((b) => b.id !== bookingId),
      }));

      setError("Status konnte nicht aktualisiert werden. Bitte erneut versuchen.");
      setTimeout(() => setError(null), 3000);
    }
  }

  if (initialData.totalBookings === 0) {
    return (
      <div
        className="flex items-center justify-center py-24 text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        Heute keine Termine
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <div
          className="rounded-sm border px-4 py-2 text-sm"
          style={{ borderColor: "#fca5a5", backgroundColor: "#fee2e2", color: "#991b1b" }}
        >
          {error}
        </div>
      )}

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMN_CONFIG.map(({ key, title, badgeColor }) => (
          <div
            key={key}
            className="rounded-sm border flex flex-col"
            style={{
              backgroundColor: "var(--color-accent)",
              borderColor: "var(--color-accent)",
              minHeight: "400px",
            }}
          >
            {/* Column header */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b"
              style={{ borderColor: "rgba(0,0,0,0.08)" }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-primary)" }}
              >
                {title}
              </span>
              <span
                className="text-xs font-bold rounded-full px-2 py-0.5 min-w-[1.5rem] text-center"
                style={{ backgroundColor: badgeColor, color: "#fff" }}
              >
                {columns[key].length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {columns[key].length === 0 ? (
                <p
                  className="text-xs text-center py-6"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  —
                </p>
              ) : (
                columns[key].map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    column={key}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
