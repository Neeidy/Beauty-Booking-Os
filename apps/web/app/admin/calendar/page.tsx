import Link from "next/link";
import WeeklyCalendar from "./WeeklyCalendar";

export const dynamic = "force-dynamic";

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

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ weekStart?: string }>;
}) {
  const { weekStart } = await searchParams;

  const baseUrl = process.env["APP_URL"] ?? "http://localhost:3030";
  const adminSecret = process.env["ADMIN_SECRET"] ?? "change-me-in-production";

  let data: CalendarResponse | null = null;

  try {
    const url = `${baseUrl}/api/admin/calendar${weekStart ? `?weekStart=${weekStart}` : ""}`;
    const res = await fetch(url, {
      headers: { "x-admin-secret": adminSecret },
      cache: "no-store",
    });
    if (res.ok) {
      data = (await res.json()) as CalendarResponse;
    }
  } catch {
    // data stays null
  }

  if (data === null) {
    return (
      <div style={{ padding: "32px", textAlign: "center" }}>
        <div style={{
          display: "inline-block",
          background: "var(--color-error-soft)",
          color: "var(--color-error)",
          border: "1px solid var(--color-error)",
          borderRadius: "var(--radius-md)",
          padding: "12px 24px",
          fontSize: "14px",
        }}>
          Kalender konnte nicht geladen werden.{" "}
          <Link href="/admin/calendar" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
            Erneut versuchen
          </Link>
        </div>
      </div>
    );
  }

  return <WeeklyCalendar initialData={data} />;
}
