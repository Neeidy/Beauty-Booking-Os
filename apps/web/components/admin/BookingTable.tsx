"use client";

import { useState } from "react";

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

interface BookingTableProps {
  bookings: Booking[];
  onStatusChange?: (id: string, newStatus: string) => void;
}

const STATUS_PILL: Record<string, string> = {
  pending:     "pending",
  confirmed:   "ok",
  reminded:    "ok",
  completed:   "ok",
  no_show:     "cancel",
  cancelled:   "cancel",
  rescheduled: "pending",
};

const NEXT_ACTIONS: Record<string, { label: string; next: string }[]> = {
  pending:   [{ label: "Bestätigen", next: "confirmed" }],
  confirmed: [{ label: "Abgeschlossen", next: "completed" }, { label: "No-Show", next: "no_show" }],
  reminded:  [{ label: "Abgeschlossen", next: "completed" }, { label: "No-Show", next: "no_show" }],
};

export default function BookingTable({ bookings, onStatusChange }: BookingTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function handleAction(id: string, next: string) {
    setPendingAction(id);
    try {
      const res = await fetch(`/api/booking/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok && onStatusChange) onStatusChange(id, next);
    } finally {
      setPendingAction(null);
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="empty">
        <div className="empty-ico">📅</div>
        <h4>Keine Buchungen</h4>
        <p>Keine Buchungen für diesen Filter.</p>
      </div>
    );
  }

  return (
    <table className="appt-table">
      <thead>
        <tr>
          <th>Termin</th>
          <th>Kunde</th>
          <th>Kontakt</th>
          <th>Dauer</th>
          <th>Status</th>
          <th>Erinnerungen</th>
          <th>Aktionen</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((booking) => {
          const isExpanded = expandedId === booking.id;
          const pillClass = STATUS_PILL[booking.status] ?? "pending";
          const actions = NEXT_ACTIONS[booking.status] ?? [];
          const reminderCount = Array.isArray(booking.reminderSentAt) ? booking.reminderSentAt.length : 0;
          const apptDate = new Date(booking.appointmentAt);

          return (
            <>
              <tr key={booking.id}>
                <td className="appt-time">
                  {apptDate.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Vienna" })}
                  <br />
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                    {apptDate.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Vienna" })}
                  </span>
                </td>
                <td className="appt-name">{booking.customerName}</td>
                <td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>{booking.customerContact}</td>
                <td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>{booking.durationMinutes} Min.</td>
                <td>
                  <span className={`status-pill ${pillClass}`}>● {booking.status}</span>
                </td>
                <td style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
                  {reminderCount > 0 ? `${reminderCount}x` : "—"}
                </td>
                <td className="appt-actions-cell">
                  <div style={{ display: "flex", gap: "6px" }}>
                    {actions.map((a) => (
                      <button
                        key={a.next}
                        onClick={() => handleAction(booking.id, a.next)}
                        disabled={pendingAction === booking.id}
                        className="btn btn-ghost btn-sm"
                        style={{ opacity: pendingAction === booking.id ? 0.5 : 1 }}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="appt-actions-cell">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                    className="btn btn-ghost btn-sm"
                  >
                    {isExpanded ? "×" : "•••"}
                  </button>
                </td>
              </tr>
              {isExpanded && (
                <tr key={`${booking.id}-detail`}>
                  <td colSpan={8} style={{ background: "var(--color-bg-surface)", padding: "12px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12px" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Buchungs-ID</div>
                        <div style={{ fontFamily: "monospace", color: "var(--color-text)" }}>{booking.id}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Erstellt am</div>
                        <div style={{ color: "var(--color-text)" }}>{new Date(booking.createdAt).toLocaleString("de-AT")}</div>
                      </div>
                      {booking.notes && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "4px" }}>Notizen</div>
                          <div style={{ color: "var(--color-text)" }}>{booking.notes}</div>
                        </div>
                      )}
                      {booking.cancelledAt && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontWeight: 600, color: "var(--color-rose)", marginBottom: "4px" }}>Storniert</div>
                          <div style={{ color: "var(--color-text)" }}>
                            {new Date(booking.cancelledAt).toLocaleString("de-AT")}
                            {booking.cancelReason && ` — ${booking.cancelReason}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          );
        })}
      </tbody>
    </table>
  );
}
