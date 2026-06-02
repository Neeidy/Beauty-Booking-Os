"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface CalendarBooking {
  id: string;
  customerName: string;
  customerContact: string;
  appointmentAt: string;
  appointmentTime: string;
  durationMinutes: number;
  status: string;
  serviceName: string | null;
  notes: string | null;
}

interface CalendarDay {
  date: string;
  dayName: string;
  dayShort: string;
  isToday: boolean;
  bookings: CalendarBooking[];
}

interface CalendarCellProps {
  day: CalendarDay;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed:   "#059669",
  pending:     "#D97706",
  reminded:    "#D97706",
  completed:   "#6B7280",
  cancelled:   "#6B7280",
  no_show:     "#DC2626",
  rescheduled: "#6B7280",
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#6B7280";
}

export default function CalendarCell({ day }: CalendarCellProps) {
  const { dict } = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (day.bookings.length === 0) {
    return (
      <div
        className="min-h-[80px] flex items-center justify-center text-xs"
        style={{ color: "var(--color-text-muted)" }}
      >
        —
      </div>
    );
  }

  const VISIBLE_COUNT = 3;
  const visibleBookings =
    expanded || day.bookings.length <= VISIBLE_COUNT
      ? day.bookings
      : day.bookings.slice(0, VISIBLE_COUNT);
  const hiddenCount = day.bookings.length - VISIBLE_COUNT;

  return (
    <div
      className="space-y-1.5 overflow-y-auto"
      style={{ maxHeight: "400px" }}
    >
      {visibleBookings.map((booking) => {
        const color = getStatusColor(booking.status);
        const isCancelled = booking.status === "cancelled";

        return (
          <div
            key={booking.id}
            className="rounded-sm px-2 py-1.5 cursor-pointer"
            style={{
              borderLeft: `3px solid ${color}`,
              backgroundColor: `${color}12`,
            }}
          >
            <p
              className="text-xs font-bold leading-tight"
              style={{
                color: "var(--color-primary)",
                textDecoration: isCancelled ? "line-through" : "none",
              }}
            >
              {booking.appointmentTime}
            </p>
            <p
              className="text-xs leading-tight truncate"
              style={{
                color: "var(--color-primary)",
                textDecoration: isCancelled ? "line-through" : "none",
              }}
            >
              {booking.customerName}
            </p>
            {booking.serviceName && (
              <p
                className="text-xs leading-tight truncate"
                style={{
                  color: "var(--color-text-muted)",
                  textDecoration: isCancelled ? "line-through" : "none",
                }}
              >
                {booking.serviceName}
              </p>
            )}
          </div>
        );
      })}

      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-xs py-1 rounded-sm text-center"
          style={{
            color: "var(--color-secondary)",
            backgroundColor: "var(--color-accent)",
          }}
        >
          {dict.admin.calendar.cellMore.replace("{count}", String(hiddenCount))}
        </button>
      )}
    </div>
  );
}
