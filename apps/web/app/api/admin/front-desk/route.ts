export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, bookings, services } from "@beauty-booking/db";
import { eq, and, gte, lte, asc } from "drizzle-orm";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";

// ── Timezone helpers ──────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" for today in Europe/Vienna. */
function getViennaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
  }).format(new Date());
}

/** Computes UTC start-of-day and end-of-day for a YYYY-MM-DD date in Europe/Vienna. */
function getViennaDateBounds(dateStr: string): { startOfDay: Date; endOfDay: Date } {
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
  return {
    startOfDay: new Date(utcMidnight),
    endOfDay: new Date(utcMidnight + 24 * 3600 * 1000 - 1),
  };
}

/** Formats a Date as "HH:mm" in Europe/Vienna. */
function toViennaTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const FrontDeskBookingSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  customerContact: z.string(),
  appointmentAt: z.string(),
  appointmentTime: z.string(),
  durationMinutes: z.number(),
  status: z.string(),
  serviceName: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

const FrontDeskResponseSchema = z.object({
  date: z.string(),
  totalBookings: z.number(),
  columns: z.object({
    unconfirmed: z.array(FrontDeskBookingSchema),
    confirmed: z.array(FrontDeskBookingSchema),
    completed: z.array(FrontDeskBookingSchema),
  }),
});

type FrontDeskBooking = z.infer<typeof FrontDeskBookingSchema>;

// ── Column grouping ───────────────────────────────────────────────────────────

function toColumn(status: string): "unconfirmed" | "confirmed" | "completed" {
  if (status === "confirmed") return "confirmed";
  if (status === "pending" || status === "reminded") return "unconfirmed";
  return "completed"; // completed, no_show, cancelled, rescheduled
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date") ?? getViennaToday();
  const clientId = searchParams.get("clientId") ?? CLIENT_ID;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const { startOfDay, endOfDay } = getViennaDateBounds(dateParam);

  try {
    const db = getDb();

    const rows = await db
      .select({
        id: bookings.id,
        customerName: bookings.customerName,
        customerContact: bookings.customerContact,
        appointmentAt: bookings.appointmentAt,
        durationMinutes: bookings.durationMinutes,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        serviceName: services.serviceName,
      })
      .from(bookings)
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(
        and(
          eq(bookings.clientId, clientId),
          gte(bookings.appointmentAt, startOfDay),
          lte(bookings.appointmentAt, endOfDay),
        ),
      )
      .orderBy(asc(bookings.appointmentAt));

    const columns: {
      unconfirmed: FrontDeskBooking[];
      confirmed: FrontDeskBooking[];
      completed: FrontDeskBooking[];
    } = { unconfirmed: [], confirmed: [], completed: [] };

    for (const row of rows) {
      const booking: FrontDeskBooking = {
        id: row.id,
        customerName: row.customerName,
        customerContact: row.customerContact ?? "",
        appointmentAt: row.appointmentAt instanceof Date
          ? row.appointmentAt.toISOString()
          : String(row.appointmentAt),
        appointmentTime: toViennaTime(
          row.appointmentAt instanceof Date ? row.appointmentAt : new Date(String(row.appointmentAt)),
        ),
        durationMinutes: row.durationMinutes,
        status: row.status,
        serviceName: row.serviceName ?? null,
        notes: row.notes ?? null,
        createdAt: row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
      };
      columns[toColumn(row.status)].push(booking);
    }

    const payload = {
      date: dateParam,
      totalBookings: rows.length,
      columns,
    };

    // Validate response through Zod before returning
    const parsed = FrontDeskResponseSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("front-desk-api: Zod validation failed", parsed.error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("front-desk-api error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
