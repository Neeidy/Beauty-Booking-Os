// apps/web/lib/vienna-helpers.ts
// Machine-TZ-independent Vienna timezone utilities.
// formatToParts + Date.UTC based — toLocaleString NOT used.

export function getViennaOffsetMinutes(date: Date): number {
  const utcFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const viennaFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parse = (f: Intl.DateTimeFormat, d: Date): number => {
    const p = f.formatToParts(d).reduce<Record<string, string>>((acc, x) => {
      if (x.type !== "literal") acc[x.type] = x.value;
      return acc;
    }, {});
    return Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour === "24" ? "0" : p.hour),
      Number(p.minute),
      Number(p.second)
    );
  };
  return Math.round((parse(viennaFmt, date) - parse(utcFmt, date)) / 60000);
}

export function formatDateVienna(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // → "YYYY-MM-DD"
}

export function formatTimeVienna(date: Date): string {
  return new Intl.DateTimeFormat("de-AT", {
    timeZone: "Europe/Vienna",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date); // → "09:00"
}

export function viennaWallClockToUTC(
  dateStr: string,
  hour: number,
  minute: number
): Date {
  const anchor = new Date(`${dateStr}T12:00:00Z`);
  const offsetMinutes = getViennaOffsetMinutes(anchor);
  const [y, m, d] = dateStr.split("-").map(Number);
  // m is 1-indexed from the split — subtract 1 for Date.UTC
  const asIfUtcMs = Date.UTC(y!, m! - 1, d!, hour, minute, 0);
  return new Date(asIfUtcMs - offsetMinutes * 60000);
}

// NOTE: m parameter is 0-indexed (JS Date.getMonth() convention).
// Pass month as d.getMonth(), NOT d.getMonth()+1.
export function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function getViennaWeekdayKey(dateStr: string): string {
  // Returns: "monday" | "tuesday" | "wednesday" | "thursday" |
  //          "friday" | "saturday" | "sunday"
  // Uses T12:00:00Z anchor — DST-safe, machine-TZ-independent.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    weekday: "long",
  })
    .format(new Date(`${dateStr}T12:00:00Z`))
    .toLowerCase();
}
