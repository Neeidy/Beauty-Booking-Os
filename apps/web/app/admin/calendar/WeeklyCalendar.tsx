"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CalendarTimeIndicator from "../../../components/admin/CalendarTimeIndicator";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/locales";

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

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

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

function formatDisplayDate(dateStr: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

function getApptColor(serviceName: string | null): string {
  const s = (serviceName ?? "").toLowerCase();
  if (/nagel|nail|acryl|gel|pediküre|maniküre/.test(s)) return "purple";
  if (/haar|hair|schnitt|coloration|balayage|friseur/.test(s)) return "amber";
  if (/facial|gesicht|hydra|peeling|skin|kosmetik/.test(s)) return "emerald";
  if (/wimpern|brauen|lash|brow|waxing|epilasyon/.test(s)) return "rose";
  return "accent";
}

function parseTimeToMinutes(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

export default function WeeklyCalendar({ initialData }: WeeklyCalendarProps) {
  const { dict, locale } = useI18n();
  const cal = dict.admin.calendar;
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

  const weekStartDisplay = formatDisplayDate(data.weekStart, locale);
  const weekEndDisplay = formatDisplayDate(data.weekEnd, locale);

  return (
    <div style={{ opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? "none" : "auto" }}>
      {/* Cal Header */}
      <header className="cal-header">
        <div className="cal-header-left">
          <button
            className="cal-ico-btn"
            aria-label={cal.prevWeek}
            onClick={() => navigateToWeek(prevWeek)}
          >
            ‹
          </button>
          <div className="cal-date-range">
            {weekStartDisplay} – {weekEndDisplay}
          </div>
          <button
            className="cal-ico-btn"
            aria-label={cal.nextWeek}
            onClick={() => navigateToWeek(nextWeek)}
          >
            ›
          </button>
          <button
            className="cal-today-btn"
            onClick={() => !isCurrentWeek && navigateToWeek(todayMondayStr)}
            disabled={isCurrentWeek}
          >
            {cal.today}
          </button>
        </div>
        <div className="cal-header-right">
          <span className="cal-count">{cal.weekCount.replace("{count}", String(data.totalBookings))}</span>
        </div>
      </header>

      {/* Cal Grid */}
      <div className="cal-scroll">
        <div className="cal-grid">
          {/* Day headers */}
          <div className="cal-day-headers">
            <div className="cal-gutter-top" />
            {data.days.map((day) => {
              const dayNum = parseInt(day.date.slice(8), 10);
              return (
                <div key={day.date} className={`cal-day-head${day.isToday ? " today" : ""}`}>
                  {day.isToday ? (
                    <>
                      <div className="cal-today-pill">{dayNum}</div>
                      <div className="cal-today-label">{day.dayShort}</div>
                    </>
                  ) : (
                    <>
                      {day.dayShort}<span>{dayNum}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div className="cal-body">
            {/* Gutter */}
            <div className="cal-gutter">
              {HOURS.map((h) => (
                <div key={h} className="cal-hour">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {data.days.map((day) => (
              <div key={day.date} className={`cal-col${day.isToday ? " today-col" : ""}`}>
                <div className="cal-col-lines" />
                {day.bookings.map((booking) => {
                  const { h, m } = parseTimeToMinutes(booking.appointmentTime);
                  const topPx = ((h - 8) * 60 + m) * (96 / 60);
                  const heightPx = Math.max(booking.durationMinutes * (96 / 60), 32);
                  const color = getApptColor(booking.serviceName);
                  const isCancelled = booking.status === "cancelled" || booking.status === "no_show";
                  const isPending = booking.status === "pending";

                  return (
                    <div
                      key={booking.id}
                      className={`cal-appt ${color}${isCancelled ? " cancelled" : ""}${isPending ? " pending" : ""}${day.isToday ? " today" : ""}`}
                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                    >
                      <div className="cal-appt-time">{booking.appointmentTime}</div>
                      <div className="cal-appt-name" style={{ textDecoration: isCancelled ? "line-through" : undefined }}>
                        {booking.customerName}
                      </div>
                      {booking.serviceName && (
                        <div className="cal-appt-svc">{booking.serviceName}</div>
                      )}
                      <span
                        className="cal-staff"
                        style={{ background: `var(--color-${color === "accent" ? "accent" : color})` }}
                      >
                        {booking.customerName.charAt(0)}
                      </span>
                    </div>
                  );
                })}
                {day.isToday && <CalendarTimeIndicator />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
