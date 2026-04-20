"use client";

import { useState } from "react";

export interface FrontDeskBooking {
  id: string;
  customerName: string;
  customerContact: string;
  appointmentAt: string;
  appointmentTime: string;
  durationMinutes: number;
  status: string;
  serviceName: string | null;
  notes: string | null;
  createdAt: string;
}

interface BookingCardProps {
  booking: FrontDeskBooking;
  column: "unconfirmed" | "confirmed" | "completed";
  onStatusChange: (bookingId: string, newStatus: string, fromColumn: "unconfirmed" | "confirmed" | "completed") => Promise<void>;
}

export default function BookingCard({ booking, column, onStatusChange }: BookingCardProps) {
  const [loading, setLoading] = useState(false);

  async function handleAction(newStatus: string) {
    setLoading(true);
    try {
      await onStatusChange(booking.id, newStatus, column);
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="kanban-card">
      <div className="kanban-card-top">
        <div className="kanban-name">{booking.customerName}</div>
        <div className="kanban-when">{booking.appointmentTime}</div>
      </div>
      {booking.serviceName && (
        <div className="kanban-msg">{booking.serviceName} · {booking.durationMinutes} min</div>
      )}
      <div className="kanban-meta">
        {booking.customerContact && (
          <span className="kanban-pill">{booking.customerContact}</span>
        )}
        {booking.notes && (
          <span className="kanban-pill" title={booking.notes}>
            {booking.notes.slice(0, 30)}{booking.notes.length > 30 ? "…" : ""}
          </span>
        )}
      </div>
      {column !== "completed" && (
        <div className="kanban-card-foot">
          <div className="kanban-act-btns">
            {column === "unconfirmed" && (
              <>
                <button
                  className="kanban-ico-btn"
                  title="Bestätigen"
                  disabled={loading}
                  onClick={() => handleAction("confirmed")}
                >
                  ✓
                </button>
                <button
                  className="kanban-ico-btn"
                  title="Absagen"
                  disabled={loading}
                  onClick={() => handleAction("cancelled")}
                >
                  ✗
                </button>
              </>
            )}
            {column === "confirmed" && (
              <>
                <button
                  className="kanban-ico-btn"
                  title="Abgeschlossen"
                  disabled={loading}
                  onClick={() => handleAction("completed")}
                >
                  ✓
                </button>
                <button
                  className="kanban-ico-btn"
                  title="Nicht erschienen"
                  disabled={loading}
                  onClick={() => handleAction("no_show")}
                >
                  ✗
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
