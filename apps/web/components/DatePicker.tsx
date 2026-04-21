"use client";

import { useState } from "react";

interface DatePickerProps {
  selectedDate: string | null;
  onDateChange: (date: string) => void;
  disabled?: boolean;
}

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const MONTH_LABELS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function toDateStr(year: number, month: number, day: number): string {
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
  const todayStr = getTodayVienna();
  const todayParts = todayStr.split("-").map(Number);
  const todayYear = todayParts[0]!;
  const todayMonth = todayParts[1]! - 1;

  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);

  const maxDateStr = addDaysStr(todayStr, 60);
  const maxParts = maxDateStr.split("-").map(Number);
  const maxYear = maxParts[0]!;
  const maxMonth = maxParts[1]! - 1;

  const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth;
  const canGoForward = viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);

  const monthLabel = `${MONTH_LABELS_DE[viewMonth]} ${viewYear}`;

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function goToPrevMonth() {
    if (isCurrentMonth) return;
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function goToNextMonth() {
    if (!canGoForward) return;
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function handleDayClick(day: number) {
    if (disabled) return;
    const dayStr = toDateStr(viewYear, viewMonth, day);
    if (dayStr < todayStr || dayStr > maxDateStr) return;
    onDateChange(dayStr);
  }

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) cells.push(null);
  }

  return (
    <div style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <div className="dp-head">
        <button
          type="button"
          className="cal-ico-btn"
          onClick={goToPrevMonth}
          disabled={isCurrentMonth}
          aria-label="Vorheriger Monat"
        >
          ‹
        </button>
        <div>{monthLabel}</div>
        <button
          type="button"
          className="cal-ico-btn"
          onClick={goToNextMonth}
          disabled={!canGoForward}
          aria-label="Nächster Monat"
        >
          ›
        </button>
      </div>

      <div className="dp-dow">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="dp-grid">
        {cells.map((day, idx) => {
          if (day === null) {
            return <span key={`empty-${idx}`} className="dp-d out" />;
          }
          const dayStr = toDateStr(viewYear, viewMonth, day);
          const isPast = dayStr < todayStr;
          const isBeyondMax = dayStr > maxDateStr;
          const isDisabled = isPast || isBeyondMax;
          const isToday = dayStr === todayStr;
          const isSelected = dayStr === selectedDate;

          let cls = "dp-d";
          if (isDisabled) cls += " disabled";
          else if (isSelected) cls += " selected";
          else if (isToday) cls += " today";

          return (
            <span
              key={dayStr}
              className={cls}
              onClick={() => !isDisabled && handleDayClick(day)}
              aria-label={dayStr}
              role="button"
              tabIndex={isDisabled ? -1 : 0}
              onKeyDown={(e) => e.key === "Enter" && !isDisabled && handleDayClick(day)}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
