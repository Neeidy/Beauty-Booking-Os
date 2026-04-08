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
    <div
      className="rounded-sm border p-3 space-y-1.5"
      style={{
        backgroundColor: "var(--color-background)",
        borderColor: "var(--color-accent)",
      }}
    >
      {/* Time + Duration */}
      <div className="flex items-baseline justify-between">
        <span
          className="text-lg font-bold"
          style={{ color: "var(--color-primary)" }}
        >
          {booking.appointmentTime}
        </span>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {booking.durationMinutes} dk
        </span>
      </div>

      {/* Customer name */}
      <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
        {booking.customerName}
      </p>

      {/* Service */}
      {booking.serviceName ? (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {booking.serviceName}
        </p>
      ) : (
        <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
          Hizmet belirtilmemiş
        </p>
      )}

      {/* Contact */}
      <p
        className="text-xs truncate"
        style={{ color: "var(--color-text-muted)", maxWidth: "100%" }}
        title={booking.customerContact}
      >
        {booking.customerContact}
      </p>

      {/* Notes */}
      {booking.notes && (
        <p
          className="text-xs"
          style={{
            color: "var(--color-text-muted)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {booking.notes}
        </p>
      )}

      {/* Action buttons */}
      {column !== "completed" && (
        <div className="flex gap-2 pt-1">
          {column === "unconfirmed" && (
            <>
              <button
                onClick={() => handleAction("confirmed")}
                disabled={loading}
                className="flex-1 text-xs px-2 py-1 rounded-sm font-medium disabled:opacity-40"
                style={{ backgroundColor: "var(--color-secondary)", color: "#fff" }}
              >
                {loading ? "..." : "Onayla"}
              </button>
              <button
                onClick={() => handleAction("cancelled")}
                disabled={loading}
                className="flex-1 text-xs px-2 py-1 rounded-sm font-medium disabled:opacity-40 border"
                style={{
                  borderColor: "var(--color-accent)",
                  color: "var(--color-text-muted)",
                  backgroundColor: "transparent",
                }}
              >
                {loading ? "..." : "İptal"}
              </button>
            </>
          )}
          {column === "confirmed" && (
            <>
              <button
                onClick={() => handleAction("completed")}
                disabled={loading}
                className="flex-1 text-xs px-2 py-1 rounded-sm font-medium disabled:opacity-40"
                style={{ backgroundColor: "var(--color-secondary)", color: "#fff" }}
              >
                {loading ? "..." : "Tamamlandı"}
              </button>
              <button
                onClick={() => handleAction("no_show")}
                disabled={loading}
                className="flex-1 text-xs px-2 py-1 rounded-sm font-medium disabled:opacity-40 border"
                style={{
                  borderColor: "var(--color-accent)",
                  color: "var(--color-text-muted)",
                  backgroundColor: "transparent",
                }}
              >
                {loading ? "..." : "Gelmedi"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
