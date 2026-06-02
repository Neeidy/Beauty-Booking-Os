import Link from "next/link";
import WeeklyCalendar from "./WeeklyCalendar";
import { getDb, bookings, services } from "@beauty-booking/db";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { formatDateVienna, formatTimeVienna } from "@/lib/vienna-helpers";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000000";

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

function getMondayOfWeekVienna(date: Date): string {
  const viennaDateStr = formatDateVienna(date);
  const d = new Date(`${viennaDateStr}T12:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
  return monday.toISOString().slice(0, 10);
}

function getViennaStartOfDay(dateStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const probeUtc = new Date(Date.UTC(y!, mo! - 1, d!, 12, 0, 0));
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Vienna",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(probeUtc)
      .map((p) => [p.type, p.value]),
  );
  const vHour = parseInt(parts["hour"] ?? "12", 10);
  const offsetMs = (vHour - 12) * 3600 * 1000;
  const utcMidnight = Date.UTC(y!, mo! - 1, d!, 0, 0, 0) - offsetMs;
  return new Date(utcMidnight);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ weekStart?: string }>;
}) {
  const { weekStart: weekStartParam } = await searchParams;
  const dict = getDictionary(await getLocale());
  const cal = dict.admin.calendar;

  let data: CalendarResponse | null = null;

  try {
    const baseDate = weekStartParam
      ? new Date(`${weekStartParam}T12:00:00Z`)
      : new Date();

    const mondayStr = getMondayOfWeekVienna(baseDate);
    const startUTC = getViennaStartOfDay(mondayStr);
    const endUTC = new Date(startUTC.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    const weekEndStr = formatDateVienna(endUTC);

    const dayNamesLong = cal.daysLong;
    const dayNamesShort = cal.daysShort;

    const db = getDb();

    type BookingRow = {
      id: string;
      customerName: string;
      customerContact: string | null;
      appointmentAt: Date | string;
      durationMinutes: number;
      status: string;
      notes: string | null;
      serviceName: string | null;
    };

    let rows: BookingRow[];
    try {
      rows = await db
        .select({
          id: bookings.id,
          customerName: bookings.customerName,
          customerContact: bookings.customerContact,
          appointmentAt: bookings.appointmentAt,
          durationMinutes: bookings.durationMinutes,
          status: bookings.status,
          notes: bookings.notes,
          serviceName: services.serviceName,
        })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .where(
          and(
            eq(bookings.clientId, CLIENT_ID),
            gte(bookings.appointmentAt, startUTC),
            lte(bookings.appointmentAt, endUTC),
          ),
        )
        .orderBy(asc(bookings.appointmentAt));
    } catch {
      const fallback = await db
        .select({
          id: bookings.id,
          customerName: bookings.customerName,
          customerContact: bookings.customerContact,
          appointmentAt: bookings.appointmentAt,
          durationMinutes: bookings.durationMinutes,
          status: bookings.status,
          notes: bookings.notes,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.clientId, CLIENT_ID),
            gte(bookings.appointmentAt, startUTC),
            lte(bookings.appointmentAt, endUTC),
          ),
        )
        .orderBy(asc(bookings.appointmentAt));
      rows = fallback.map((r) => ({ ...r, serviceName: null }));
    }

    const todayVienna = formatDateVienna(new Date());
    const days: CalendarDay[] = [];

    for (let i = 0; i < 7; i++) {
      const dayDateStr = (() => {
        const d = new Date(`${mondayStr}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + i);
        return d.toISOString().slice(0, 10);
      })();

      const dayBookings = rows
        .filter((r) => {
          const apptDate = r.appointmentAt instanceof Date
            ? r.appointmentAt
            : new Date(String(r.appointmentAt));
          return formatDateVienna(apptDate) === dayDateStr;
        })
        .map((r) => {
          const apptDate = r.appointmentAt instanceof Date
            ? r.appointmentAt
            : new Date(String(r.appointmentAt));
          return {
            id: r.id,
            customerName: r.customerName,
            customerContact: r.customerContact ?? "",
            appointmentAt: apptDate.toISOString(),
            appointmentTime: formatTimeVienna(apptDate),
            durationMinutes: r.durationMinutes,
            status: r.status,
            serviceName: r.serviceName ?? null,
            notes: r.notes ?? null,
          };
        });

      days.push({
        date: dayDateStr,
        dayName: dayNamesLong[i]!,
        dayShort: dayNamesShort[i]!,
        isToday: dayDateStr === todayVienna,
        bookings: dayBookings,
      });
    }

    data = {
      weekStart: mondayStr,
      weekEnd: weekEndStr,
      totalBookings: rows.length,
      days,
    };
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
          {cal.loadError}{" "}
          <Link href="/admin/calendar" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
            {cal.retry}
          </Link>
        </div>
      </div>
    );
  }

  return <WeeklyCalendar initialData={data} />;
}
