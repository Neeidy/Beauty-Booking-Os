export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, services, bookings, slotReservations } from "@beauty-booking/db";
import { and, eq, inArray, gte, lte, lt, gt } from "drizzle-orm";
import { viennaWallClockToUTC } from "@/lib/vienna-helpers";
import {
  generateReservationToken,
  calculateReservationWindow,
  createReservationExpiry,
  expireStaleSlotReservations,
  ACTIVE_TTL_MINUTES,
} from "@/lib/slot-reservations";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000000";

const ReservationRequestSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  replaceToken: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logRequest(request.method, "/api/booking/reservations", 400, Date.now() - start);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReservationRequestSchema.safeParse(body);
  if (!parsed.success) {
    logRequest(request.method, "/api/booking/reservations", 400, Date.now() - start);
    return NextResponse.json(
      { error: "Geçersiz istek.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { serviceId, date, time, replaceToken } = parsed.data;

  try {
    const db = getDb();
    const now = new Date();

    // Step 1 — Verify service is active and get durationMinutes
    const svcRows = await db
      .select({ id: services.id, durationMinutes: services.durationMinutes, active: services.active })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.clientId, CLIENT_ID)))
      .limit(1);

    if (svcRows.length === 0) {
      logRequest(request.method, "/api/booking/reservations", 400, Date.now() - start);
      return NextResponse.json({ error: "Hizmet bulunamadı." }, { status: 400 });
    }
    if (!svcRows[0]!.active) {
      logRequest(request.method, "/api/booking/reservations", 400, Date.now() - start);
      return NextResponse.json({ error: "Hizmet aktif değil." }, { status: 400 });
    }

    const durationMinutes = svcRows[0]!.durationMinutes;

    // Step 2 — Convert Vienna wall-clock → UTC
    const [hourStr, minuteStr] = time.split(":");
    const hour = parseInt(hourStr!, 10);
    const minute = parseInt(minuteStr!, 10);
    const appointmentAtUtc = viennaWallClockToUTC(date, hour, minute);

    // Step 3 — Calculate slot window
    const { slotStart, slotEnd } = calculateReservationWindow({ appointmentAtUtc, durationMinutes });

    // Step 4 — Expire stale reservations
    await expireStaleSlotReservations(db, now);

    // Step 5 — Best-effort release of the previous token if provided
    if (replaceToken) {
      await db
        .update(slotReservations)
        .set({ status: "released", releasedAt: now })
        .where(
          and(
            eq(slotReservations.reservationToken, replaceToken),
            inArray(slotReservations.status, ["active", "submitted"])
          )
        );
    }

    // Step 6 — Check existing booking conflicts
    const dayStartUTC = viennaWallClockToUTC(date, 0, 0);
    const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

    const existingBookings = await db
      .select({ appointmentAt: bookings.appointmentAt, durationMinutes: bookings.durationMinutes, status: bookings.status })
      .from(bookings)
      .where(
        and(
          eq(bookings.clientId, CLIENT_ID),
          gte(bookings.appointmentAt, dayStartUTC),
          lte(bookings.appointmentAt, dayEndUTC)
        )
      );

    const blocked = existingBookings.filter(
      (b) => b.status !== "cancelled" && b.status !== "no_show"
    );

    const bookingConflict = blocked.some((b) => {
      const bStart = b.appointmentAt instanceof Date ? b.appointmentAt : new Date(String(b.appointmentAt));
      const bEnd = new Date(bStart.getTime() + b.durationMinutes * 60000);
      return slotStart < bEnd && slotEnd > bStart;
    });

    if (bookingConflict) {
      logRequest(request.method, "/api/booking/reservations", 409, Date.now() - start);
      return NextResponse.json({ error: "Bu slot az önce doldu." }, { status: 409 });
    }

    // Step 7 — Check reservation conflicts (active/submitted for same client overlapping slot)
    const reservationConflicts = await db
      .select({ id: slotReservations.id })
      .from(slotReservations)
      .where(
        and(
          eq(slotReservations.clientId, CLIENT_ID),
          inArray(slotReservations.status, ["active", "submitted"]),
          lt(slotReservations.slotStart, slotEnd),
          gt(slotReservations.slotEnd, slotStart)
        )
      )
      .limit(1);

    if (reservationConflicts.length > 0) {
      logRequest(request.method, "/api/booking/reservations", 409, Date.now() - start);
      return NextResponse.json({ error: "Bu slot az önce doldu." }, { status: 409 });
    }

    // Step 8 — Insert reservation (catch DB unique/exclusion violation → 409)
    const reservationToken = generateReservationToken();
    const expiresAt = createReservationExpiry(now);

    try {
      await db.insert(slotReservations).values({
        clientId: CLIENT_ID,
        serviceId,
        reservationToken,
        slotStart,
        slotEnd,
        status: "active",
        expiresAt,
      });
    } catch (insertErr) {
      // DB unique violation or exclusion constraint violation
      const msg = insertErr instanceof Error ? insertErr.message : "";
      if (msg.includes("unique") || msg.includes("exclusion") || msg.includes("duplicate") || msg.includes("constraint")) {
        logRequest(request.method, "/api/booking/reservations", 409, Date.now() - start);
        return NextResponse.json({ error: "Bu slot az önce doldu." }, { status: 409 });
      }
      throw insertErr;
    }

    logRequest(request.method, "/api/booking/reservations", 200, Date.now() - start);
    return NextResponse.json({
      success: true,
      reservationToken,
      expiresAt: expiresAt.toISOString(),
      appointmentAt: appointmentAtUtc.toISOString(),
      holdSeconds: ACTIVE_TTL_MINUTES * 60,
    });
  } catch (err) {
    console.error("[POST /api/booking/reservations]", err);
    logError("/api/booking/reservations", err);
    logRequest(request.method, "/api/booking/reservations", 500, Date.now() - start, String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
