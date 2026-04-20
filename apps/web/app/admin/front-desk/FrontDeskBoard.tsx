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
  dotColor: string;
}[] = [
  { key: "unconfirmed", title: "Ausstehend", dotColor: "var(--color-amber)" },
  { key: "confirmed",   title: "Bestätigt",  dotColor: "var(--color-emerald)" },
  { key: "completed",   title: "Abgeschlossen", dotColor: "var(--color-text-faint)" },
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

  return (
    <div>
      {error && (
        <div style={{
          background: "var(--color-error-soft, #fef2f2)",
          color: "var(--color-error)",
          border: "1px solid var(--color-error)",
          borderRadius: "8px",
          padding: "10px 16px",
          fontSize: "13px",
          marginBottom: "16px",
        }}>
          {error}
        </div>
      )}

      {initialData.totalBookings === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
          Heute keine Termine
        </div>
      ) : (
        <div className="kanban">
          {COLUMN_CONFIG.map(({ key, title, dotColor }) => (
            <section key={key} className="kanban-col" data-lane={key}>
              <header className="kanban-col-head">
                <span className="kanban-col-head-left">
                  <span className="kanban-col-dot" style={{ background: dotColor }} />
                  {title}
                </span>
                <span className="kanban-count">{columns[key].length}</span>
              </header>
              <div className="kanban-list">
                {columns[key].length === 0 ? (
                  <p style={{ textAlign: "center", padding: "24px 0", fontSize: "13px", color: "var(--color-text-faint)" }}>
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
