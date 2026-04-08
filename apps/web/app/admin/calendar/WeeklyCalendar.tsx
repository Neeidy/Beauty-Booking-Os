"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CalendarCell from "./CalendarCell";

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

interface CalendarResponse {
  weekStart: string;
  weekEnd: string;
  totalBookings: number;
  days: CalendarDay[];
}

interface WeeklyCalendarProps {
  initialData: CalendarResponse;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getTodayMondayVienna(): string {
  const todayVienna = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
  }).format(new Date());
  const d = new Date(`${todayVienna}T12:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
  return monday.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  return new Intl.DateTimeFormat("de-AT", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeeklyCalendar({ initialData }: WeeklyCalendarProps) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setData(initialData);
    setIsLoading(false);
  }, [initialData]);

  const prevWeek = addDays(data.weekStart, -7);
  const nextWeek = addDays(data.weekStart, 7);
  const todayMondayStr = getTodayMondayVienna();
  const isCurrentWeek = data.weekStart === todayMondayStr;

  function navigateToWeek(newWeekStart: string) {
    setIsLoading(true);
    router.push(`/admin/calendar?weekStart=${newWeekStart}`);
  }

  const weekStartDisplay = formatDisplayDate(data.weekStart);
  const weekEndDisplay = formatDisplayDate(data.weekEnd);

  return (
    <div
      style={{ opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? "none" : "auto" }}
    >
      {/* ── Top navigation bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => navigateToWeek(prevWeek)}
          className="px-3 py-1.5 text-sm rounded-sm border"
          style={{
            borderColor: "var(--color-accent)",
            color: "var(--color-primary)",
            backgroundColor: "var(--color-background)",
          }}
        >
          ←
        </button>

        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-primary)" }}
        >
          {weekStartDisplay} – {weekEndDisplay}
        </span>

        <button
          onClick={() => navigateToWeek(nextWeek)}
          className="px-3 py-1.5 text-sm rounded-sm border"
          style={{
            borderColor: "var(--color-accent)",
            color: "var(--color-primary)",
            backgroundColor: "var(--color-background)",
          }}
        >
          →
        </button>

        <button
          onClick={() => !isCurrentWeek && navigateToWeek(todayMondayStr)}
          disabled={isCurrentWeek}
          className="px-3 py-1.5 text-sm rounded-sm border"
          style={{
            borderColor: isCurrentWeek ? "var(--color-accent)" : "var(--color-secondary)",
            color: isCurrentWeek ? "var(--color-text-muted)" : "var(--color-secondary)",
            backgroundColor: "var(--color-background)",
            opacity: isCurrentWeek ? 0.5 : 1,
            cursor: isCurrentWeek ? "default" : "pointer",
          }}
        >
          Heute
        </button>

        <span
          className="text-xs ml-auto"
          style={{ color: "var(--color-text-muted)" }}
        >
          {data.totalBookings} Termin{data.totalBookings !== 1 ? "e" : ""}
        </span>
      </div>

      {/* ── Desktop: 7-column grid ─────────────────────────────────────────── */}
      <div className="hidden md:grid md:grid-cols-7 gap-2">
        {data.days.map((day) => {
          const dayNumber = parseInt(day.date.slice(8), 10);
          return (
            <div key={day.date}>
              {/* Column header */}
              <div
                className="text-center py-2 rounded-sm mb-1"
                style={{
                  backgroundColor: day.isToday ? "var(--color-accent)" : "transparent",
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {day.dayShort}
                </p>
                <p
                  className={day.isToday ? "text-base font-bold" : "text-base"}
                  style={{ color: "var(--color-primary)" }}
                >
                  {dayNumber}
                </p>
              </div>
              <CalendarCell day={day} />
            </div>
          );
        })}
      </div>

      {/* ── Mobile: vertical stack ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {data.days.map((day) => (
          <div
            key={day.date}
            className="rounded-sm border"
            style={{
              borderColor: "var(--color-accent)",
              backgroundColor: day.isToday ? "var(--color-accent)" : "var(--color-background)",
            }}
          >
            {/* Day header */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b"
              style={{ borderColor: "var(--color-accent)" }}
            >
              <span
                className={`text-sm ${day.isToday ? "font-bold" : "font-medium"}`}
                style={{ color: "var(--color-primary)" }}
              >
                {day.dayName}
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                {day.date.slice(5)}
              </span>
            </div>
            {/* Bookings */}
            <div className="p-2">
              <CalendarCell day={day} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
