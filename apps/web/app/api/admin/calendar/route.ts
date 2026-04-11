import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, bookings, services } from "@beauty-booking/db";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { formatDateVienna, formatTimeVienna } from "@/lib/vienna-helpers";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000000";

/**
 * Given any Date, returns the "YYYY-MM-DD" of the Monday of that date's
 * week in Vienna time. Pure UTC arithmetic — no local-timezone dependency.
 */
function getMondayOfWeekVienna(date: Date): string {
  const viennaDateStr = formatDateVienna(date);
  // Parse as UTC noon to get a stable day-of-week regardless of DST edges
  const d = new Date(`${viennaDateStr}T12:00:00Z`);
  const day = d.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const diff = day === 0 ? -6 : 1 - day; // ISO 8601: Monday is week start
  const monday = new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
  return monday.toISOString().slice(0, 10);
}

/**
 * Computes UTC start-of-day for a YYYY-MM-DD date in Europe/Vienna.
 * Uses the same probe technique as the front-desk route — no local TZ dependency.
 */
function getViennaStartOfDay(dateStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  // Probe noon UTC to find Vienna's UTC offset (avoids DST edge on midnight itself)
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

// ── Zod schemas ───────────────────────────────────────────────────────────────

const CalendarBookingSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  customerContact: z.string(),
  appointmentAt: z.string(),
  appointmentTime: z.string(),
  durationMinutes: z.number(),
  status: z.string(),
  serviceName: z.string().nullable(),
  notes: z.string().nullable(),
});

const CalendarDaySchema = z.object({
  date: z.string(),
  dayName: z.string(),
  dayShort: z.string(),
  isToday: z.boolean(),
  bookings: z.array(CalendarBookingSchema),
});

const CalendarResponseSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  totalBookings: z.number(),
  days: z.array(CalendarDaySchema).length(7),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const weekStartParam = searchParams.get("weekStart");
  const clientId = searchParams.get("clientId") ?? CLIENT_ID;

  // Validate weekStart format if provided
  if (weekStartParam !== null) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(weekStartParam) ||
      isNaN(new Date(weekStartParam).getTime())
    ) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
  }

  // Determine target week — noon UTC avoids DST edges
  const baseDate: Date = weekStartParam
    ? new Date(`${weekStartParam}T12:00:00Z`)
    : new Date();

  // Find Monday of the week in Vienna time (machine-tz-independent)
  const mondayStr = getMondayOfWeekVienna(baseDate);

  // UTC bounds: Monday 00:00 Vienna → Sunday 23:59:59.999 Vienna
  const startUTC = getViennaStartOfDay(mondayStr);
  const endUTC = new Date(startUTC.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  const weekStartStr = mondayStr;
  const weekEndStr = formatDateVienna(endUTC);

  const dayNamesLong = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const dayNamesShort = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  try {
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
            eq(bookings.clientId, clientId),
            gte(bookings.appointmentAt, startUTC),
            lte(bookings.appointmentAt, endUTC),
          ),
        )
        .orderBy(asc(bookings.appointmentAt));
    } catch (joinErr) {
      console.warn("calendar-api: services join failed, falling back to plain bookings select", joinErr);
      const fallbackRows = await db
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
            eq(bookings.clientId, clientId),
            gte(bookings.appointmentAt, startUTC),
            lte(bookings.appointmentAt, endUTC),
          ),
        )
        .orderBy(asc(bookings.appointmentAt));
      rows = fallbackRows.map((r) => ({ ...r, serviceName: null }));
    }

    const todayVienna = formatDateVienna(new Date());

    const days = [];
    for (let i = 0; i < 7; i++) {
      // Each day starts at Vienna midnight: Monday + i days
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

    const payload = {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      totalBookings: rows.length,
      days,
    };

    const parsed = CalendarResponseSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("calendar-api: Zod validation failed", parsed.error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("calendar-api error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
