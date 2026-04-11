import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, bookings, services } from "@beauty-booking/db";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  getViennaOffsetMinutes,
  viennaWallClockToUTC,
  formatTimeVienna,
} from "@/lib/vienna-helpers";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000000";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const SlotItemSchema = z.object({
  time: z.string(),
  datetime: z.string(),
  available: z.boolean(),
});

const SlotsResponseSchema = z.object({
  date: z.string(),
  serviceId: z.string(),
  serviceName: z.string().nullable(),
  serviceDurationMinutes: z.number(),
  slots: z.array(SlotItemSchema),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const clientId = searchParams.get("clientId") ?? CLIENT_ID;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Missing or invalid date" }, { status: 400 });
  }
  if (!serviceId) {
    return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });
  }

  let serviceDurationMinutes = 60;
  let serviceName: string | null = null;
  let minAdvanceHours = 2;

  try {
    const db = getDb();

    // Step 1 — Load service duration
    try {
      const svc = await db
        .select({
          id: services.id,
          serviceName: services.serviceName,
          durationMinutes: services.durationMinutes,
        })
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);
      if (svc[0]) {
        serviceDurationMinutes = svc[0].durationMinutes;
        serviceName = svc[0].serviceName;
      }
    } catch (err) {
      console.warn("booking-slots-api: services query failed, using default 60min", err);
    }

    // Step 2 — Load minAdvanceBookingHours from client config
    try {
      const { loadClientConfig } = await import("@/lib/load-client-config");
      const cfg = loadClientConfig();
      if (cfg?.bookingRules?.minAdvanceBookingHours != null) {
        minAdvanceHours = cfg.bookingRules.minAdvanceBookingHours;
      }
    } catch {
      // fallback to 2 hours
    }

    // Step 3 — Fetch existing bookings for the day
    const dayStartUTC = viennaWallClockToUTC(date, 0, 0);
    const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

    const existingBookings = await db
      .select({
        appointmentAt: bookings.appointmentAt,
        durationMinutes: bookings.durationMinutes,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.clientId, clientId),
          gte(bookings.appointmentAt, dayStartUTC),
          lte(bookings.appointmentAt, dayEndUTC),
        ),
      );

    // cancelled and no_show do NOT block slots
    const blocked = existingBookings.filter(
      (b) => b.status !== "cancelled" && b.status !== "no_show",
    );

    // Step 4 — Business hours (hardcoded; V2-5 will move to config)
    const anchor = new Date(`${date}T12:00:00Z`);
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Vienna",
      weekday: "short",
    }).format(anchor); // "Mon", "Tue", ..., "Sun"

    const isSunday = weekday === "Sun";
    const openHour = isSunday ? 10 : 9;
    const closeHour = isSunday ? 16 : 18;

    // Step 5 — Generate slots
    // Only generate slots that fit before closing (avoids non-bookable trailing slots)
    const stepMinutes = Math.min(30, serviceDurationMinutes);
    const now = new Date();
    const minBookableTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);

    type SlotItem = { time: string; datetime: string; available: boolean };
    const slots: SlotItem[] = [];

    for (
      let minuteOfDay = openHour * 60;
      minuteOfDay + serviceDurationMinutes <= closeHour * 60;
      minuteOfDay += stepMinutes
    ) {
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;

      const slotStartUTC = viennaWallClockToUTC(date, hour, minute);
      const slotEndUTC = new Date(slotStartUTC.getTime() + serviceDurationMinutes * 60000);

      const isInPast = slotStartUTC.getTime() < minBookableTime.getTime();

      const overlapsExisting = blocked.some((b) => {
        const bStart =
          b.appointmentAt instanceof Date
            ? b.appointmentAt
            : new Date(String(b.appointmentAt));
        const bEnd = new Date(bStart.getTime() + b.durationMinutes * 60000);
        return slotStartUTC < bEnd && slotEndUTC > bStart;
      });

      slots.push({
        time: formatTimeVienna(slotStartUTC),
        datetime: slotStartUTC.toISOString(),
        available: !isInPast && !overlapsExisting,
      });
    }

    // Step 6 — Zod-validate and return
    const payload = {
      date,
      serviceId,
      serviceName,
      serviceDurationMinutes,
      slots,
    };

    const parsed = SlotsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("booking-slots-api: Zod validation failed", parsed.error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("booking-slots-api error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
