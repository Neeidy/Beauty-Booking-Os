export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, slotReservations } from "@beauty-booking/db";
import { and, eq } from "drizzle-orm";
import {
  expireStaleSlotReservations,
  extendSubmittedExpiry,
} from "@/lib/slot-reservations";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000000";

// Validate only what this route needs to inspect — full validation in /api/lead
const submitBodySchema = z
  .object({
    reservationToken: z.string().min(20),
    metadata: z
      .object({
        serviceId: z.string().optional(),
        appointmentAt: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  let bodyRaw: Record<string, unknown>;
  try {
    bodyRaw = await request.json();
  } catch {
    logRequest(request.method, "/api/booking/submit", 400, Date.now() - start);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = submitBodySchema.safeParse(bodyRaw);
  if (!parsed.success) {
    logRequest(request.method, "/api/booking/submit", 400, Date.now() - start);
    return NextResponse.json(
      { error: "reservationToken gerekli." },
      { status: 400 }
    );
  }

  const { reservationToken, ...forwardPayload } = parsed.data;
  const metadata = parsed.data.metadata;

  try {
    const db = getDb();
    const now = new Date();

    // Step 1 — Expire stale reservations
    await expireStaleSlotReservations(db, now);

    // Step 2 — Find reservation
    const rows = await db
      .select({
        id: slotReservations.id,
        status: slotReservations.status,
        expiresAt: slotReservations.expiresAt,
        serviceId: slotReservations.serviceId,
        slotStart: slotReservations.slotStart,
      })
      .from(slotReservations)
      .where(
        and(
          eq(slotReservations.reservationToken, reservationToken),
          eq(slotReservations.clientId, CLIENT_ID)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      logRequest(request.method, "/api/booking/submit", 409, Date.now() - start);
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı." },
        { status: 409 }
      );
    }

    const reservation = rows[0]!;

    if (reservation.status !== "active") {
      logRequest(request.method, "/api/booking/submit", 409, Date.now() - start);
      return NextResponse.json(
        { error: "Rezervasyon süresi doldu. Lütfen yeniden slot seç." },
        { status: 409 }
      );
    }

    if (reservation.expiresAt <= now) {
      logRequest(request.method, "/api/booking/submit", 409, Date.now() - start);
      return NextResponse.json(
        { error: "Rezervasyon süresi doldu. Lütfen yeniden slot seç." },
        { status: 409 }
      );
    }

    // Step 3 — Validate serviceId matches
    const bodyServiceId = metadata?.serviceId;
    if (bodyServiceId && bodyServiceId !== reservation.serviceId) {
      logRequest(request.method, "/api/booking/submit", 409, Date.now() - start);
      return NextResponse.json(
        { error: "Rezervasyon hizmeti eşleşmiyor." },
        { status: 409 }
      );
    }

    // Step 4 — Validate slotStart matches appointmentAt (1-minute tolerance)
    const bodyAppointmentAt = metadata?.appointmentAt;
    if (bodyAppointmentAt) {
      const bodySlotStart = new Date(bodyAppointmentAt);
      const reservationSlotStart =
        reservation.slotStart instanceof Date
          ? reservation.slotStart
          : new Date(String(reservation.slotStart));
      const diffMs = Math.abs(bodySlotStart.getTime() - reservationSlotStart.getTime());
      if (diffMs > 60 * 1000) {
        logRequest(request.method, "/api/booking/submit", 409, Date.now() - start);
        return NextResponse.json(
          { error: "Rezervasyon saati eşleşmiyor." },
          { status: 409 }
        );
      }
    }

    // Step 5 — Forward to /api/lead
    const origin =
      process.env["NEXT_PUBLIC_APP_URL"] ??
      process.env["APP_URL"] ??
      (process.env["VERCEL_URL"] ? `https://${process.env["VERCEL_URL"]}` : null) ??
      request.nextUrl.origin;
    let leadRes: Response;
    try {
      leadRes = await fetch(`${origin}/api/lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CLIENT_ID,
        },
        body: JSON.stringify(forwardPayload),
      });
    } catch (fetchErr) {
      console.error("[POST /api/booking/submit] fetch /api/lead failed", fetchErr);
      logError("/api/booking/submit", fetchErr);
      logRequest(request.method, "/api/booking/submit", 502, Date.now() - start, String(fetchErr));
      // Do NOT release reservation — keep active until TTL
      return NextResponse.json(
        { error: "Gönderim başarısız oldu, rezervasyonun kısa süre daha korunuyor." },
        { status: 502 }
      );
    }

    if (!leadRes.ok) {
      console.error("[POST /api/booking/submit] /api/lead returned", leadRes.status);
      logRequest(request.method, "/api/booking/submit", 502, Date.now() - start);
      // Do NOT release reservation
      return NextResponse.json(
        { error: "Gönderim başarısız oldu, rezervasyonun kısa süre daha korunuyor." },
        { status: 502 }
      );
    }

    // Step 6 — Parse leadId and transition reservation to submitted
    let leadId: string | undefined;
    try {
      const leadBody = await leadRes.json() as { leadId?: string };
      leadId = leadBody.leadId;
    } catch {
      // non-JSON response — continue without leadId
    }

    await db
      .update(slotReservations)
      .set({
        status: "submitted",
        submittedAt: now,
        expiresAt: extendSubmittedExpiry(now),
        ...(leadId ? { leadId } : {}),
      })
      .where(eq(slotReservations.id, reservation.id));

    // Forward the lead response back to the client
    const responseBody = leadId !== undefined
      ? { success: true, leadId }
      : { success: true };

    logRequest(request.method, "/api/booking/submit", 200, Date.now() - start);
    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("[POST /api/booking/submit]", err);
    logError("/api/booking/submit", err);
    logRequest(request.method, "/api/booking/submit", 500, Date.now() - start, String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
