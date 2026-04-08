import AdminHeader from "../../../components/admin/AdminHeader";
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

  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3030";
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
    // data stays null — rendered as error below
  }

  return (
    <>
      <AdminHeader title="Takvim" />
      <main className="p-6" style={{ minHeight: "calc(100vh - 65px)" }}>
        {data === null ? (
          <div
            className="rounded-sm border p-6 text-sm text-center"
            style={{ borderColor: "var(--color-accent)", color: "#dc2626" }}
          >
            Takvim yüklenemedi
          </div>
        ) : (
          <WeeklyCalendar initialData={data} />
        )}
      </main>
    </>
  );
}
