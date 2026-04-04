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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: "#fef9c3", text: "#854d0e" },
  confirmed:   { bg: "#dcfce7", text: "#166534" },
  reminded:    { bg: "#dbeafe", text: "#1e40af" },
  completed:   { bg: "#d1fae5", text: "#065f46" },
  no_show:     { bg: "#fee2e2", text: "#991b1b" },
  cancelled:   { bg: "#f1f5f9", text: "#475569" },
  rescheduled: { bg: "#ede9fe", text: "#5b21b6" },
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
      <div className="text-sm text-center py-12" style={{ color: "var(--color-text-muted)" }}>
        Keine Buchungen gefunden.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: "2px solid var(--color-accent)" }}>
            {["Termin", "Kunde", "Kontakt", "Dauer", "Status", "Erinnerungen", "Aktionen"].map((h) => (
              <th key={h} className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                {h}
              </th>
            ))}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const isExpanded = expandedId === booking.id;
            const statusStyle = STATUS_COLORS[booking.status] ?? { bg: "#f1f5f9", text: "#475569" };
            const actions = NEXT_ACTIONS[booking.status] ?? [];
            const reminderCount = Array.isArray(booking.reminderSentAt) ? booking.reminderSentAt.length : 0;

            return (
              <>
                <tr
                  key={booking.id}
                  style={{ borderBottom: "1px solid var(--color-accent)" }}
                >
                  <td className="px-3 py-2 whitespace-nowrap font-medium" style={{ color: "var(--color-primary)" }}>
                    {new Date(booking.appointmentAt).toLocaleDateString("de-AT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}
                    <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(booking.appointmentAt).toLocaleTimeString("de-AT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--color-primary)" }}>{booking.customerName}</td>
                  <td className="px-3 py-2" style={{ color: "var(--color-text-muted)" }}>{booking.customerContact}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{booking.durationMinutes} Min.</td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {reminderCount > 0 ? `${reminderCount}x gesendet` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {actions.map((a) => (
                        <button
                          key={a.next}
                          onClick={() => handleAction(booking.id, a.next)}
                          disabled={pendingAction === booking.id}
                          className="text-xs px-2 py-1 rounded-sm disabled:opacity-40"
                          style={{ backgroundColor: "var(--color-secondary)", color: "#fff" }}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                      className="text-xs underline"
                      style={{ color: "var(--color-secondary)" }}
                    >
                      {isExpanded ? "Schließen" : "Details"}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${booking.id}-detail`} style={{ backgroundColor: "#fafaf8", borderBottom: "1px solid var(--color-accent)" }}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Buchungs-ID</p>
                          <p style={{ fontFamily: "monospace", color: "var(--color-primary)" }}>{booking.id}</p>
                        </div>
                        <div>
                          <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Erstellt am</p>
                          <p style={{ color: "var(--color-primary)" }}>
                            {new Date(booking.createdAt).toLocaleString("de-AT")}
                          </p>
                        </div>
                        {booking.notes && (
                          <div className="col-span-2">
                            <p className="font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>Notizen</p>
                            <p style={{ color: "var(--color-primary)" }}>{booking.notes}</p>
                          </div>
                        )}
                        {booking.cancelledAt && (
                          <div className="col-span-2">
                            <p className="font-semibold mb-1" style={{ color: "#dc2626" }}>Storniert</p>
                            <p style={{ color: "var(--color-primary)" }}>
                              {new Date(booking.cancelledAt).toLocaleString("de-AT")}
                              {booking.cancelReason && ` — ${booking.cancelReason}`}
                            </p>
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
    </div>
  );
}
