import type { AutomationJob, Booking } from "@beauty-booking/db";
import { generateFollowUp } from "@beauty-booking/followup-agent";
import type { SalonConfig } from "@beauty-booking/config";
import { logger } from "@beauty-booking/shared";

export interface RecoveryHandlerDeps {
  getBooking: (bookingId: string) => Promise<Booking | undefined>;
  countPreviousRecoveryAttempts: (bookingId: string) => Promise<number>;
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

const RECOVERY_STATUSES = new Set(["cancelled", "no_show"]);

/**
 * Handles recovery and winback jobs.
 * Skips if:
 * - Booking not found
 * - Booking not in cancelled/no_show state
 * - recoveryWaitHours hasn't passed yet
 * - maxFollowUpAttempts already exceeded
 */
export async function handleRecovery(
  job: AutomationJob,
  deps: RecoveryHandlerDeps
): Promise<{ skipped: boolean }> {
  if (!job.bookingId) {
    logger.warn("Recovery job has no bookingId — skipping", { jobId: job.id });
    return { skipped: true };
  }

  const booking = await deps.getBooking(job.bookingId);

  if (!booking) {
    logger.warn("Booking not found for recovery job — skipping", { jobId: job.id });
    return { skipped: true };
  }

  // Must be in a recoverable state
  if (!RECOVERY_STATUSES.has(booking.status)) {
    logger.info("Booking not in recoverable state — skipping", { jobId: job.id, status: booking.status });
    return { skipped: true };
  }

  const { client } = deps.salonConfig;
  const recoveryWaitMs = client.bookingRules.recoveryWaitHours * 60 * 60 * 1000;
  const cancelledAt = booking.cancelledAt ?? booking.updatedAt;
  const waitedMs = Date.now() - cancelledAt.getTime();

  // Check if wait period has passed
  if (waitedMs < recoveryWaitMs) {
    logger.info("Recovery wait period not passed — skipping", {
      jobId: job.id,
      bookingId: booking.id,
      waitedHours: Math.floor(waitedMs / 3600000),
      requiredHours: client.bookingRules.recoveryWaitHours,
    });
    return { skipped: true };
  }

  // Check if max follow-up attempts already reached
  const previousAttempts = await deps.countPreviousRecoveryAttempts(booking.id);
  if (previousAttempts >= client.bookingRules.maxFollowUpAttempts) {
    logger.info("Max recovery attempts reached — skipping", { jobId: job.id, previousAttempts });
    return { skipped: true };
  }

  const appointmentDate = booking.appointmentAt.toLocaleDateString("de-AT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const appointmentTime = booking.appointmentAt.toLocaleTimeString("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const triggerType = booking.status === "no_show" ? "no_show" : "cancellation";

  const followUpResult = await generateFollowUp({
    triggerType,
    customerName: booking.customerName,
    customerContact: booking.customerContact,
    serviceName: booking.notes ?? "Ihr Termin",
    appointmentDate,
    appointmentTime,
    followUpAttempt: previousAttempts + 1,
    language: "de",
    clientId: job.clientId,
    bookingId: booking.id,
    salonConfig: deps.salonConfig,
  });

  if (!followUpResult.success || !followUpResult.data) {
    throw new Error(`Follow-up agent failed: ${followUpResult.error ?? "unknown"}`);
  }

  const message = followUpResult.data;

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

  const isEmail = booking.customerContact.includes("@");
  if (isEmail && message.channel !== "sms") {
    await deps.sendEmail({
      to: booking.customerContact,
      subject: `Wir freuen uns auf Sie — ${client.clientName}`,
      html: `<p>${message.message}</p>`,
    }).catch((err) => {
      logger.warn("Email send failed in recovery handler", { bookingId: booking.id, error: String(err) });
    });
  }

  logger.info("Recovery message sent", { jobId: job.id, bookingId: booking.id, triggerType, attempt: previousAttempts + 1 });
  return { skipped: false };
}
