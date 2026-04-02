import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { z } from "zod";
import { getCachedSalonConfig } from "@beauty-booking/config";
import { getLeadById, updateLeadStatus } from "@beauty-booking/db/queries/leads";
import { createBooking } from "@beauty-booking/db/queries/bookings";
import { createAutomationJobs } from "@beauty-booking/db/queries/automation-jobs";
import { logEvent } from "@beauty-booking/db/queries/event-logs";
import { logger } from "@beauty-booking/shared";
import { sendEmail } from "../../../../../packages/integrations/email/client.js";
import {
  buildBookingConfirmationHtml,
  getBookingConfirmationSubject,
  type SupportedLanguage,
} from "../../../../../packages/integrations/email/templates/booking-confirmation.js";

const CLIENTS_DIR = join(process.cwd(), "..", "..", "clients");

const RequestBodySchema = z.object({
  leadId: z.string().uuid(),
  serviceId: z.string().min(1),        // Service slug from services.json (e.g. "svc_gel_manicure")
  customerName: z.string().min(1).max(200),
  customerContact: z.string().min(1).max(200), // email or phone
  appointmentAt: z.string().datetime(),        // ISO 8601
  durationMinutes: z.number().int().positive(),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // 1. Parse body
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

  const { leadId, serviceId, customerName, customerContact, appointmentAt, durationMinutes, notes } = parsed.data;

  // 2. Load lead
  let lead;
  try {
    lead = await getLeadById(leadId);
  } catch (err) {
    logger.error("DB error fetching lead for booking", { leadId, error: String(err) });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }

  if (!lead) {
    return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
  }

  // 3. Load salon config to get reminder rules
  let salonConfig;
  try {
    const slug = process.env["DEFAULT_CLIENT_SLUG"] ?? "demo-salon";
    salonConfig = getCachedSalonConfig(CLIENTS_DIR, slug);
  } catch (err) {
    logger.error("Failed to load salon config for booking", { leadId, error: String(err) });
    return NextResponse.json({ success: false, error: "Salon config not found" }, { status: 500 });
  }

  const appointmentDate = new Date(appointmentAt);

  // 4. Create booking record
  let booking;
  try {
    booking = await createBooking({
      clientId: lead.clientId,
      leadId,
      serviceId: null,          // DB service UUID — service slug used in metadata
      customerName,
      customerContact,
      appointmentAt: appointmentDate,
      durationMinutes,
      status: "pending",
      notes: notes ?? null,
    });
  } catch (err) {
    logger.error("Failed to create booking", { leadId, error: String(err) });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }

  // 5. Update lead status to "booked"
  await updateLeadStatus(leadId, "booked").catch((err) => {
    logger.warn("Failed to update lead status to booked", { leadId, error: String(err) });
  });

  // 6. Schedule reminder jobs
  const reminderHours: number[] = salonConfig.client.bookingRules.reminderHoursBefore ?? [24, 3];
  const reminderJobs = reminderHours.map((hoursBeforeAppt) => ({
    clientId: lead.clientId,
    bookingId: booking.id,
    leadId,
    jobType: `reminder_${hoursBeforeAppt}h`,
    scheduledAt: new Date(appointmentDate.getTime() - hoursBeforeAppt * 60 * 60 * 1000),
    status: "scheduled" as const,
    attempts: 0,
    maxAttempts: 3,
  }));

  await createAutomationJobs(reminderJobs).catch((err) => {
    logger.warn("Failed to schedule reminder jobs", { bookingId: booking.id, error: String(err) });
  });

  // 7. Send confirmation email (non-blocking — failure must not break booking)
  if (lead.customerEmail) {
    const lang = (lead.language ?? "de") as SupportedLanguage;
    const apptDate = new Date(appointmentAt);
    const dateStr = apptDate.toLocaleDateString(lang === "de" ? "de-AT" : lang === "tr" ? "tr-TR" : "en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = apptDate.toLocaleTimeString(lang === "de" ? "de-AT" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    sendEmail({
      to: lead.customerEmail,
      subject: getBookingConfirmationSubject(lang),
      html: buildBookingConfirmationHtml(
        {
          customerName,
          serviceName: serviceId,   // Until services DB table is wired with name lookup
          date: dateStr,
          time: timeStr,
          salonName: salonConfig.client.clientName,
          salonAddress: salonConfig.client.contact.address,
          salonPhone: salonConfig.client.contact.phone,
          salonEmail: salonConfig.client.contact.email,
        },
        lang
      ),
    }).catch((err) => {
      logger.warn("Confirmation email failed", { bookingId: booking.id, error: String(err) });
    });
  }

  // 8. Log event
  const durationMs = Date.now() - startTime;
  await logEvent({
    clientId: lead.clientId,
    leadId,
    bookingId: booking.id,
    eventType: "booking_created",
    agentName: "system",
    inputSummary: `service=${serviceId} appointmentAt=${appointmentAt}`,
    outputSummary: `booking=${booking.id} status=pending reminders=${reminderJobs.length}`,
    status: "success",
    durationMs,
    payload: {
      bookingId: booking.id,
      serviceId,
      appointmentAt,
      reminderJobsScheduled: reminderJobs.length,
    },
  }).catch(() => {});

  return NextResponse.json(
    {
      success: true,
      bookingId: booking.id,
      booking: {
        id: booking.id,
        customerName: booking.customerName,
        appointmentAt: booking.appointmentAt,
        durationMinutes: booking.durationMinutes,
        status: booking.status,
      },
      remindersScheduled: reminderJobs.length,
    },
    { status: 201 }
  );
}
