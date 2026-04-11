import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBookingById, updateBookingStatus } from "@beauty-booking/db/queries/bookings";
import { createAutomationJobs } from "@beauty-booking/db/queries/automation-jobs";
import { updateLeadStatus } from "@beauty-booking/db/queries/leads";
import { logEvent } from "@beauty-booking/db/queries/event-logs";
import { logger } from "@beauty-booking/shared";
import { getDb, leads, type Booking } from "@beauty-booking/db";
import { eq, and, sql } from "drizzle-orm";

// ── Allowed status transitions ─────────────────────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled", "rescheduled"],
  reminded:  ["completed", "no_show", "cancelled"],
};

const RequestBodySchema = z.object({
  status: z.enum(["confirmed", "completed", "no_show", "cancelled", "rescheduled"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { status: newStatus } = parsed.data;

  const booking = await getBookingById(bookingId).catch(() => undefined);
  if (!booking) {
    return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid transition: ${booking.status} → ${newStatus}`,
        allowedTransitions: allowed,
      },
      { status: 400 }
    );
  }

  const updated = await updateBookingStatus(bookingId, newStatus as Booking["status"]);

  // Side effects for terminal states
  if (newStatus === "no_show" && booking.leadId) {
    // Schedule winback job
    const winbackAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await createAutomationJobs([{
      clientId: booking.clientId,
      bookingId: booking.id,
      leadId: booking.leadId,
      jobType: "winback",
      scheduledAt: winbackAt,
      status: "scheduled",
      attempts: 0,
      maxAttempts: 3,
    }]).catch((err) => {
      logger.warn("Failed to schedule winback job for no_show", { bookingId, error: String(err) });
    });

    await updateLeadStatus(booking.leadId, "contacted").catch(() => {});
  }

  await logEvent({
    clientId: booking.clientId,
    bookingId: booking.id,
    leadId: booking.leadId ?? undefined,
    eventType: "booking_status_changed",
    agentName: "system",
    inputSummary: `${booking.status} → ${newStatus}`,
    outputSummary: `booking=${bookingId} newStatus=${newStatus}`,
    status: "success",
    payload: { previousStatus: booking.status, newStatus },
  }).catch(() => {});

  // Notify waiting list entries when a slot opens up
  if (newStatus === "cancelled" || newStatus === "no_show") {
    try {
      const { serviceId, appointmentAt, clientId } = booking;
      if (serviceId && appointmentAt) {
        const requestedDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Vienna",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(appointmentAt));

        const db = getDb();

        const waitingEntries = await db
          .select({ id: leads.id, metadata: leads.metadata })
          .from(leads)
          .where(
            and(
              eq(leads.clientId, clientId),
              sql`${leads.metadata}->>'waitingList' = 'true'`,
              sql`${leads.metadata}->>'waitingList_notified' = 'false'`,
              sql`${leads.metadata}->>'requestedServiceId' = ${serviceId}`,
              sql`${leads.metadata}->>'requestedDate' = ${requestedDate}`,
            ),
          );

        for (const entry of waitingEntries) {
          const updatedMeta = {
            ...(entry.metadata as Record<string, unknown>),
            waitingList_notified: true,
            waitingList_notifiedAt: new Date().toISOString(),
          };
          await db
            .update(leads)
            .set({ metadata: updatedMeta, updatedAt: new Date() })
            .where(eq(leads.id, entry.id));
        }
      }
    } catch (err) {
      // Non-blocking — booking status change must succeed regardless
      console.error("[waiting-list] notification hook failed:", err);
    }
  }

  return NextResponse.json({ success: true, booking: updated });
}
