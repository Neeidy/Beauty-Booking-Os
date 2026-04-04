import type { AutomationJob, Booking } from "@beauty-booking/db";
import { generateFollowUp } from "@beauty-booking/followup-agent";
import type { SalonConfig } from "@beauty-booking/config";
import { logger } from "@beauty-booking/shared";

export interface ReminderHandlerDeps {
  getBooking: (bookingId: string) => Promise<Booking | undefined>;
  insertMessage: (data: {
    clientId: string;
    leadId: string | null;
    bookingId: string;
    channel: string;
    direction: string;
    senderType: string;
    agentName: string;
    body: string;
  }) => Promise<void>;
  sendEmail: (opts: { to: string; subject: string; html: string }) => Promise<void>;
  salonConfig: SalonConfig;
}

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "reminded"]);

/**
 * Handles reminder_24h and reminder_3h jobs.
 * Skips if booking is cancelled, completed, or no_show.
 */
export async function handleReminder(
  job: AutomationJob,
  deps: ReminderHandlerDeps
): Promise<{ skipped: boolean }> {
  if (!job.bookingId) {
    logger.warn("Reminder job has no bookingId — skipping", { jobId: job.id });
    return { skipped: true };
  }

  const booking = await deps.getBooking(job.bookingId);

  if (!booking) {
    logger.warn("Booking not found for reminder job — skipping", { jobId: job.id, bookingId: job.bookingId });
    return { skipped: true };
  }

  // Skip if booking is in a terminal or cancelled state
  if (!ACTIVE_STATUSES.has(booking.status)) {
    logger.info("Booking not active — skipping reminder", {
      jobId: job.id,
      bookingId: booking.id,
      status: booking.status,
    });
    return { skipped: true };
  }

  const { client } = deps.salonConfig;
  const triggerType = job.jobType === "reminder_24h" ? "reminder_24h" : "reminder_3h";

  const appointmentDate = booking.appointmentAt.toLocaleDateString("de-AT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const appointmentTime = booking.appointmentAt.toLocaleTimeString("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const followUpResult = await generateFollowUp({
    triggerType,
    customerName: booking.customerName,
    customerContact: booking.customerContact,
    serviceName: booking.notes ?? "Ihr Termin",
    appointmentDate,
    appointmentTime,
    followUpAttempt: 1,
    language: "de",
    clientId: job.clientId,
    bookingId: booking.id,
    salonConfig: deps.salonConfig,
  });

  if (!followUpResult.success || !followUpResult.data) {
    throw new Error(`Follow-up agent failed: ${followUpResult.error ?? "unknown"}`);
  }

  const message = followUpResult.data;

  // Log message to messages table
  await deps.insertMessage({
    clientId: job.clientId,
    leadId: job.leadId ?? null,
    bookingId: booking.id,
    channel: message.channel,
    direction: "outbound",
    senderType: "agent",
    agentName: "followup-agent",
    body: message.message,
  });

  // Send email if contact looks like email and channel allows it
  const isEmail = booking.customerContact.includes("@");
  if (isEmail && message.channel !== "sms") {
    await deps.sendEmail({
      to: booking.customerContact,
      subject: `Terminerinnerung — ${client.clientName}`,
      html: `<p>${message.message}</p>`,
    }).catch((err) => {
      logger.warn("Email send failed in reminder handler", { bookingId: booking.id, error: String(err) });
    });
  }

  logger.info("Reminder sent", { jobId: job.id, bookingId: booking.id, triggerType, channel: message.channel });
  return { skipped: false };
}
