import type { SalonConfig } from "@beauty-booking/config";
import { generateMessage } from "@beauty-booking/content-agent";
import { logger } from "@beauty-booking/shared";

// ── Result types ──────────────────────────────────────────────────────────────

export type RecoveryOutcome =
  | "message_sent"
  | "skipped_wait"
  | "skipped_status"
  | "skipped_no_gdpr"
  | "stopped_max_attempts"
  | "error";

export interface RecoveryResult {
  outcome: RecoveryOutcome;
  message?: string;
  nextFollowUpAt?: Date;
}

// ── Deps (injected for testability) ──────────────────────────────────────────

export interface CancellationRecoveryDeps {
  getBooking: (bookingId: string) => Promise<{
    id: string;
    clientId: string;
    leadId: string | null;
    customerName: string;
    customerContact: string;
    status: string;
    cancelledAt: Date | null;
    updatedAt: Date;
    appointmentAt: Date;
    notes: string | null;
  } | undefined>;

  hasReminderConsent: (leadId: string) => Promise<boolean>;

  countRecoveryAttempts: (bookingId: string) => Promise<number>;

  markLeadInactive: (leadId: string) => Promise<void>;

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

  scheduleFollowUp: (data: {
    clientId: string;
    bookingId: string;
    leadId: string | null;
    jobType: string;
    scheduledAt: Date;
  }) => Promise<void>;

  logEvent: (data: {
    clientId: string;
    leadId: string | null;
    bookingId: string;
    eventType: string;
    agentName: string;
    outputSummary: string;
    status: string;
    tokenCount: number;
  }) => Promise<void>;

  sendEmail: (opts: { to: string; subject: string; html: string }) => Promise<void>;

  salonConfig: SalonConfig;
}

// ── Flow ──────────────────────────────────────────────────────────────────────

const RECOVERABLE_STATUSES = new Set(["cancelled", "no_show"]);
const FINAL_FOLLOW_UP_DAYS = 7;

/**
 * Full cancellation/no-show recovery flow.
 *
 * Steps:
 * 1. Load booking, check status is cancelled/no_show
 * 2. Check recoveryWaitHours has passed
 * 3. Check GDPR reminder consent for the lead
 * 4. Count previous recovery attempts
 * 5. If max attempts reached → mark lead inactive, stop
 * 6. Generate winback message via Content Agent
 * 7. Send message + insert message log
 * 8. Schedule next follow-up (7 days) if not at max attempts
 * 9. Log event
 */
export async function executeCancellationRecovery(
  options: {
    bookingId: string;
    clientId: string;
    triggerType: "cancellation" | "no_show";
  },
  deps: CancellationRecoveryDeps
): Promise<RecoveryResult> {
  const { bookingId, clientId, triggerType } = options;
  const { client } = deps.salonConfig;

  // 1. Load booking
  const booking = await deps.getBooking(bookingId);
  if (!booking || !RECOVERABLE_STATUSES.has(booking.status)) {
    logger.info("Recovery skipped — booking not in recoverable state", { bookingId, status: booking?.status });
    return { outcome: "skipped_status" };
  }

  // 2. Check wait period
  const recoveryWaitMs = client.bookingRules.recoveryWaitHours * 60 * 60 * 1000;
  const referenceTime = booking.cancelledAt ?? booking.updatedAt;
  const elapsed = Date.now() - referenceTime.getTime();

  if (elapsed < recoveryWaitMs) {
    logger.info("Recovery skipped — wait period not passed", {
      bookingId,
      waitedHours: Math.floor(elapsed / 3600000),
      requiredHours: client.bookingRules.recoveryWaitHours,
    });
    return { outcome: "skipped_wait" };
  }

  // 3. GDPR consent check — only message if reminder consent was granted
  if (booking.leadId) {
    const hasConsent = await deps.hasReminderConsent(booking.leadId);
    if (!hasConsent) {
      logger.info("Recovery skipped — no GDPR reminder consent", { bookingId, leadId: booking.leadId });
      return { outcome: "skipped_no_gdpr" };
    }
  }

  // 4. Count previous recovery attempts
  const previousAttempts = await deps.countRecoveryAttempts(bookingId);

  // 5. Max attempts reached → mark lead inactive and stop
  if (previousAttempts >= client.bookingRules.maxFollowUpAttempts) {
    logger.info("Max recovery attempts reached — marking lead inactive", { bookingId, previousAttempts });
    if (booking.leadId) {
      await deps.markLeadInactive(booking.leadId);
    }
    return { outcome: "stopped_max_attempts" };
  }

  // 6. Generate winback message via Content Agent
  const appointmentDate = booking.appointmentAt.toLocaleDateString("de-AT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const appointmentTime = booking.appointmentAt.toLocaleTimeString("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const contentResult = await generateMessage({
    purpose: "winback",
    language: client.defaultLanguage as "de" | "en" | "tr",
    context: {
      customerName: booking.customerName,
      serviceName: booking.notes ?? "Ihren Termin",
      date: appointmentDate,
      time: appointmentTime,
    },
    clientConfig: deps.salonConfig,
    maxLength: 300,
  });

  if (!contentResult.success || !contentResult.data) {
    logger.error("Content Agent failed in recovery flow", { bookingId, error: contentResult.error });
    return { outcome: "error" };
  }

  const messageText = contentResult.data.message;
  const isEmail = booking.customerContact.includes("@");
  const channel = isEmail ? "email" : "whatsapp";

  // 7. Send message + insert log
  await deps.insertMessage({
    clientId,
    leadId: booking.leadId ?? null,
    bookingId,
    channel,
    direction: "outbound",
    senderType: "agent",
    agentName: "content-agent",
    body: messageText,
  });

  if (isEmail) {
    await deps.sendEmail({
      to: booking.customerContact,
      subject: `Wir würden uns freuen, Sie wiederzusehen — ${client.clientName}`,
      html: `<p>${messageText}</p>`,
    }).catch((err) => {
      logger.warn("Email send failed in recovery flow", { bookingId, error: String(err) });
    });
  }

  // 8. Schedule next follow-up if not at max attempts
  const isLastAttempt = previousAttempts + 1 >= client.bookingRules.maxFollowUpAttempts;
  let nextFollowUpAt: Date | undefined;

  if (!isLastAttempt) {
    nextFollowUpAt = new Date(Date.now() + FINAL_FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000);
    await deps.scheduleFollowUp({
      clientId,
      bookingId,
      leadId: booking.leadId ?? null,
      jobType: "winback",
      scheduledAt: nextFollowUpAt,
    });
  }

  // 9. Log event
  await deps.logEvent({
    clientId,
    leadId: booking.leadId ?? null,
    bookingId,
    eventType: "agent_call",
    agentName: "content-agent",
    outputSummary: `Recovery ${triggerType} attempt ${previousAttempts + 1}: ${messageText.slice(0, 100)}`,
    status: "success",
    tokenCount: contentResult.tokenUsage.total,
  });

  logger.info("Recovery message sent", {
    bookingId,
    triggerType,
    attempt: previousAttempts + 1,
    channel,
    nextFollowUpAt,
  });

  return {
    outcome: "message_sent",
    message: messageText,
    ...(nextFollowUpAt !== undefined ? { nextFollowUpAt } : {}),
  };
}
