"use client";

import { useState } from "react";

interface DatePickerProps {
  selectedDate: string | null;
  onDateChange: (date: string) => void;
  disabled?: boolean;
}

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function toDateString(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function getTodayVienna(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
  }).format(new Date());
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function DatePicker({ selectedDate, onDateChange, disabled = false }: DatePickerProps) {
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth()); // 0-indexed

  const todayStr = getTodayVienna();
  const maxDateStr = addDaysStr(todayStr, 60);

  // Current month bounds for nav buttons
  const todayParts = todayStr.split("-").map(Number);
  const todayYear = todayParts[0]!;
  const todayMonth = todayParts[1]! - 1; // 0-indexed

  const maxParts = maxDateStr.split("-").map(Number);
  const maxYear = maxParts[0]!;
  const maxMonth = maxParts[1]! - 1; // 0-indexed

  const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth;
  const canGoForward = viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);

  // Month header label (German)
  const monthLabel = new Intl.DateTimeFormat("de-AT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(viewYear, viewMonth, 15)));

  // Grid math
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sunday
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // ISO: Mon=0 offset
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function goToPrevMonth() {
    if (isCurrentMonth) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (!canGoForward) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDayClick(day: number) {
    if (disabled) return;
    const dayStr = toDateString(viewYear, viewMonth, day);
    if (dayStr < todayStr || dayStr > maxDateStr) return;
    onDateChange(dayStr);
  }

  // Build grid cells: empty offsets + day numbers
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) cells.push(null);
  }

  return (
    <div
      style={{
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goToPrevMonth}
          disabled={isCurrentMonth}
          className="px-2 py-1 text-sm rounded-sm"
          style={{
            color: isCurrentMonth ? "var(--color-text-muted)" : "var(--color-primary)",
            cursor: isCurrentMonth ? "default" : "pointer",
          }}
          aria-label="Vorheriger Monat"
        >
          ←
        </button>
        <span
          className="text-sm font-medium capitalize"
          style={{ color: "var(--color-primary)" }}
        >
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={goToNextMonth}
          disabled={!canGoForward}
          className="px-2 py-1 text-sm rounded-sm"
          style={{
            color: !canGoForward ? "var(--color-text-muted)" : "var(--color-primary)",
            cursor: !canGoForward ? "default" : "pointer",
          }}
          aria-label="Nächster Monat"
        >
          →
        </button>
      </div>

      {/* Weekday header row */}
      <div
        className="grid grid-cols-7 mb-1"
        role="row"
      >
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs py-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const dayStr = toDateString(viewYear, viewMonth, day);
          const isPast = dayStr < todayStr;
          const isBeyondMax = dayStr > maxDateStr;
          const isDisabled = isPast || isBeyondMax;
          const isToday = dayStr === todayStr;
          const isSelected = dayStr === selectedDate;

          return (
            <button
              key={dayStr}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              className="flex items-center justify-center text-sm font-medium rounded-sm transition-colors"
              style={{
                minHeight: "44px",
                minWidth: "44px",
                opacity: isDisabled ? 0.4 : 1,
                pointerEvents: isDisabled ? "none" : "auto",
                backgroundColor: isSelected
                  ? "var(--color-primary)"
                  : "transparent",
                color: isSelected
                  ? "#fff"
                  : "var(--color-primary)",
                border: isToday && !isSelected
                  ? "1px solid var(--color-primary)"
                  : isSelected
                  ? "1px solid var(--color-primary)"
                  : "1px solid transparent",
                cursor: isDisabled ? "default" : "pointer",
              }}
              aria-label={dayStr}
              aria-pressed={isSelected}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
