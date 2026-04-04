import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { runDueJobs, handleReminder, type JobRunnerDeps } from "@beauty-booking/core";
import { getCachedSalonConfig } from "@beauty-booking/config";
import {
  getDueJobs,
  claimJob,
  markJobCompleted,
  markJobFailed,
} from "@beauty-booking/db/queries/automation-jobs";
import { getBookingById } from "@beauty-booking/db/queries/bookings";
import { logEvent } from "@beauty-booking/db/queries/event-logs";
import { logger } from "@beauty-booking/shared";
import { sendEmail } from "../../../../../../packages/integrations/email/client.js";

const CLIENTS_DIR = join(process.cwd(), "..", "..", "clients");
const DEFAULT_SLUG = process.env["DEFAULT_CLIENT_SLUG"] ?? "demo-salon";

function verifyAuth(request: NextRequest): boolean {
  const secret = process.env["WEBHOOK_SECRET"];
  if (!secret) return true; // No secret configured → allow (dev mode)
  const header = request.headers.get("x-webhook-secret");
  return header === secret;
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  let salonConfig;
  try {
    salonConfig = getCachedSalonConfig(CLIENTS_DIR, DEFAULT_SLUG);
  } catch (err) {
    return NextResponse.json({ error: "Salon config not found" }, { status: 500 });
  }

  const deps: JobRunnerDeps = {
    getDueJobs: (opts) => getDueJobs(opts),
    claimJob: (jobId) => claimJob(jobId),
    markCompleted: (jobId, result) => markJobCompleted(jobId, result),
    markFailed: (jobId, error, attempts, max) => markJobFailed(jobId, error, attempts, max),
    handleReminder: (job) =>
      handleReminder(job, {
        getBooking: (id) => getBookingById(id),
        insertMessage: async () => {},  // messages table insert — simplified for V1
        sendEmail: (opts) => sendEmail(opts).then(() => {}),
        salonConfig,
      }),
    handleRecovery: async () => ({ skipped: true }), // not handled by this endpoint
  };

  // Run both reminder types
  const [r24, r3] = await Promise.all([
    runDueJobs({ jobType: "reminder_24h" }, deps),
    runDueJobs({ jobType: "reminder_3h" }, deps),
  ]);

  const summary = {
    processed: r24.processed + r3.processed,
    succeeded: r24.succeeded + r3.succeeded,
    failed: r24.failed + r3.failed,
    skipped: r24.skipped + r3.skipped,
    durationMs: Date.now() - startTime,
  };

  await logEvent({
    clientId: "00000000-0000-0000-0000-000000000001",
    eventType: "job_runner_reminders",
    agentName: "system",
    inputSummary: "reminder_24h + reminder_3h batch",
    outputSummary: `processed=${summary.processed} succeeded=${summary.succeeded} failed=${summary.failed}`,
    status: summary.failed > 0 ? "failure" : "success",
    durationMs: summary.durationMs,
    payload: summary,
  }).catch(() => {});

  logger.info("Reminder job runner completed", summary);
  return NextResponse.json({ success: true, ...summary });
}
