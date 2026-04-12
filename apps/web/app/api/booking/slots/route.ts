import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, bookings, services, slotReservations } from "@beauty-booking/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { expireStaleSlotReservations } from "@/lib/slot-reservations";
import {
  viennaWallClockToUTC,
  formatTimeVienna,
  getViennaWeekdayKey,
} from "@/lib/vienna-helpers";
import { loadClientConfig } from "@/lib/load-client-config";

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
  isDayClosed: z.boolean(),
  slots: z.array(SlotItemSchema),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parses "HH:MM" or "HHMM" into hour/minute numbers. */
function parseHHMM(timeStr: string): { hour: number; minute: number } {
  const normalized = timeStr.replace(":", ""); // handle both "0900" and "09:00"
  const padded = normalized.padStart(4, "0");
  return {
    hour: parseInt(padded.slice(0, 2), 10),
    minute: parseInt(padded.slice(2, 4), 10),
  };
}

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

    // Step 2 — Load config (operating hours + booking rules)
    const jsWeekday = getViennaWeekdayKey(date);

    let openHour = 9;
    let openMinute = 0;
    let closeHour = 18;
    let closeMinute = 0;
    let isDayClosed = false;

    try {
      const cfg = loadClientConfig(); // SYNC — no await
      if (cfg?.bookingRules?.minAdvanceBookingHours != null) {
        minAdvanceHours = cfg.bookingRules.minAdvanceBookingHours;
      }
      const dayConfig = cfg.operatingHours?.[jsWeekday];
      if (dayConfig === null || dayConfig === undefined) {
        isDayClosed = true;
      } else if (dayConfig.open && dayConfig.close) {
        const openParsed = parseHHMM(dayConfig.open);
        const closeParsed = parseHHMM(dayConfig.close);
        openHour = openParsed.hour;
        openMinute = openParsed.minute;
        closeHour = closeParsed.hour;
        closeMinute = closeParsed.minute;
      }
    } catch (err) {
      console.warn(
        "[slots] Failed to load config, using fallback 09:00–18:00",
        err,
      );
    }

    // Closed day — return early with empty slots
    if (isDayClosed) {
      return NextResponse.json({
        date,
        serviceId,
        serviceName,
        serviceDurationMinutes,
        isDayClosed: true,
        slots: [],
      });
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

    // Step 3b — Fetch active/submitted reservations for this day
    const callerToken = searchParams.get("reservationToken");

    const activeReservations = await db
      .select({
        slotStart: slotReservations.slotStart,
        slotEnd: slotReservations.slotEnd,
        reservationToken: slotReservations.reservationToken,
      })
      .from(slotReservations)
      .where(
        and(
          eq(slotReservations.clientId, clientId),
          inArray(slotReservations.status, ["active", "submitted"]),
          gte(slotReservations.slotStart, dayStartUTC),
          lte(slotReservations.slotStart, dayEndUTC)
        )
      );

    // Ignore caller's own lock so their countdown doesn't block their own view
    const reservationsToBlock = callerToken
      ? activeReservations.filter((r) => r.reservationToken !== callerToken)
      : activeReservations;

    // Step 4 — Generate slots from config-based operating hours
    const stepMinutes = Math.min(30, serviceDurationMinutes);
    const now = new Date();

    // Expire stale reservations before computing availability
    await expireStaleSlotReservations(db, now);
    const minBookableTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);

    const openTotalMinutes = openHour * 60 + openMinute;
    const closeTotalMinutes = closeHour * 60 + closeMinute;
    const closingUTC = viennaWallClockToUTC(date, closeHour, closeMinute);

    type SlotItem = { time: string; datetime: string; available: boolean };
    const slots: SlotItem[] = [];

    for (
      let minuteOfDay = openTotalMinutes;
      minuteOfDay < closeTotalMinutes;
      minuteOfDay += stepMinutes
    ) {
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;

      const slotStartUTC = viennaWallClockToUTC(date, hour, minute);
      const slotEndUTC = new Date(slotStartUTC.getTime() + serviceDurationMinutes * 60000);

      // Skip slots where service doesn't fit before closing
      if (slotEndUTC.getTime() > closingUTC.getTime()) continue;

      const isInPast = slotStartUTC.getTime() < minBookableTime.getTime();

      const overlapsExisting = blocked.some((b) => {
        const bStart =
          b.appointmentAt instanceof Date
            ? b.appointmentAt
            : new Date(String(b.appointmentAt));
        const bEnd = new Date(bStart.getTime() + b.durationMinutes * 60000);
        return slotStartUTC < bEnd && slotEndUTC > bStart;
      });

      const blockedByReservation = reservationsToBlock.some((r) => {
        const rStart = r.slotStart instanceof Date ? r.slotStart : new Date(String(r.slotStart));
        const rEnd = r.slotEnd instanceof Date ? r.slotEnd : new Date(String(r.slotEnd));
        return slotStartUTC.getTime() < rEnd.getTime() && slotEndUTC.getTime() > rStart.getTime();
      });

      slots.push({
        time: formatTimeVienna(slotStartUTC),
        datetime: slotStartUTC.toISOString(),
        available: !isInPast && !overlapsExisting && !blockedByReservation,
      });
    }

    // Step 5 — Zod-validate and return
    const payload = {
      date,
      serviceId,
      serviceName,
      serviceDurationMinutes,
      isDayClosed: false,
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
