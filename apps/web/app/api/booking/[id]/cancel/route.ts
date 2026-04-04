import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { join } from "path";
import { getBookingById } from "@beauty-booking/db/queries/bookings";
import {
  cancelJobsForBooking,
  createAutomationJobs,
} from "@beauty-booking/db/queries/automation-jobs";
import { updateLeadStatus } from "@beauty-booking/db/queries/leads";
import { logEvent } from "@beauty-booking/db/queries/event-logs";
import { getCachedSalonConfig } from "@beauty-booking/config";
import { logger } from "@beauty-booking/shared";
import { getDb, bookings } from "@beauty-booking/db";
import { eq } from "drizzle-orm";

const CLIENTS_DIR = join(process.cwd(), "..", "..", "clients");
const DEFAULT_SLUG = process.env["DEFAULT_CLIENT_SLUG"] ?? "demo-salon";

const RequestBodySchema = z.object({
  cancelReason: z.string().max(500).optional(),
});

const CANCELLABLE = new Set(["pending", "confirmed", "reminded"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch { /* body is optional */ }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { cancelReason } = parsed.data;

  const booking = await getBookingById(bookingId).catch(() => undefined);
  if (!booking) {
    return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
  }

  if (!CANCELLABLE.has(booking.status)) {
    return NextResponse.json(
      { success: false, error: `Cannot cancel a booking with status: ${booking.status}` },
      { status: 400 }
    );
  }

  // Load config for recoveryWaitHours
  let recoveryWaitHours = 48;
  try {
    const cfg = getCachedSalonConfig(CLIENTS_DIR, DEFAULT_SLUG);
    recoveryWaitHours = cfg.client.bookingRules.recoveryWaitHours;
  } catch { /* use default */ }

  const db = getDb();

  // 1. Update booking to cancelled
  await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: cancelReason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));

  // 2. Cancel all pending reminder jobs
  await cancelJobsForBooking(bookingId).catch((err) => {
    logger.warn("Failed to cancel reminder jobs", { bookingId, error: String(err) });
  });

  // 3. Schedule recovery job
  const recoveryAt = new Date(Date.now() + recoveryWaitHours * 60 * 60 * 1000);
  await createAutomationJobs([{
    clientId: booking.clientId,
    bookingId: booking.id,
    leadId: booking.leadId ?? null,
    jobType: "recovery",
    scheduledAt: recoveryAt,
    status: "scheduled",
    attempts: 0,
    maxAttempts: 3,
  }]).catch((err) => {
    logger.warn("Failed to schedule recovery job", { bookingId, error: String(err) });
  });

  // 4. Update lead status
  if (booking.leadId) {
    await updateLeadStatus(booking.leadId, "contacted").catch(() => {});
  }

  // 5. Event log
  await logEvent({
    clientId: booking.clientId,
    bookingId: booking.id,
    leadId: booking.leadId ?? undefined,
    eventType: "booking_cancelled",
    agentName: "system",
    inputSummary: `bookingId=${bookingId} reason=${cancelReason ?? "none"}`,
    outputSummary: `cancelled, recovery scheduled at ${recoveryAt.toISOString()}`,
    status: "success",
    payload: { cancelReason, recoveryScheduledAt: recoveryAt },
  }).catch(() => {});

  logger.info("Booking cancelled, recovery scheduled", { bookingId, recoveryAt });

  return NextResponse.json({
    success: true,
    bookingId,
    status: "cancelled",
    recoveryScheduledAt: recoveryAt.toISOString(),
  });
}
