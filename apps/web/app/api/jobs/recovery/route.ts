import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { runDueJobs, handleRecovery, type JobRunnerDeps } from "@beauty-booking/core";
import { getCachedSalonConfig } from "@beauty-booking/config";
import {
  getDueJobs,
  claimJob,
  markJobCompleted,
  markJobFailed,
  countRecoveryAttemptsForBooking,
} from "@beauty-booking/db/queries/automation-jobs";
import { getBookingById } from "@beauty-booking/db/queries/bookings";
import { logEvent } from "@beauty-booking/db/queries/event-logs";
import { logger } from "@beauty-booking/shared";
import { sendEmail } from "../../../../../../packages/integrations/email/client.js";

const CLIENTS_DIR = join(process.cwd(), "..", "..", "clients");
const DEFAULT_SLUG = process.env["DEFAULT_CLIENT_SLUG"] ?? "demo-salon";

function verifyAuth(request: NextRequest): boolean {
  const secret = process.env["WEBHOOK_SECRET"];
  if (!secret) return true;
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
  } catch {
    return NextResponse.json({ error: "Salon config not found" }, { status: 500 });
  }

  const deps: JobRunnerDeps = {
    getDueJobs: (opts) => getDueJobs(opts),
    claimJob: (jobId) => claimJob(jobId),
    markCompleted: (jobId, result) => markJobCompleted(jobId, result),
    markFailed: (jobId, error, attempts, max) => markJobFailed(jobId, error, attempts, max),
    handleReminder: async () => ({ skipped: true }), // not handled by this endpoint
    handleRecovery: (job) =>
      handleRecovery(job, {
        getBooking: (id) => getBookingById(id),
        countPreviousRecoveryAttempts: (bookingId) =>
          countRecoveryAttemptsForBooking(bookingId),
        insertMessage: async () => {},
        sendEmail: (opts) => sendEmail(opts).then(() => {}),
        salonConfig,
      }),
  };

  const [recovery, winback] = await Promise.all([
    runDueJobs({ jobType: "recovery" }, deps),
    runDueJobs({ jobType: "winback" }, deps),
  ]);

  const summary = {
    processed: recovery.processed + winback.processed,
    succeeded: recovery.succeeded + winback.succeeded,
    failed: recovery.failed + winback.failed,
    skipped: recovery.skipped + winback.skipped,
    durationMs: Date.now() - startTime,
  };

  await logEvent({
    clientId: "00000000-0000-0000-0000-000000000001",
    eventType: "job_runner_recovery",
    agentName: "system",
    inputSummary: "recovery + winback batch",
    outputSummary: `processed=${summary.processed} succeeded=${summary.succeeded} failed=${summary.failed}`,
    status: summary.failed > 0 ? "failure" : "success",
    durationMs: summary.durationMs,
    payload: summary,
  }).catch(() => {});

  logger.info("Recovery job runner completed", summary);
  return NextResponse.json({ success: true, ...summary });
}
