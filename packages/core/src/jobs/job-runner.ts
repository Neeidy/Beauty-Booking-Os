import type { AutomationJob, Booking } from "@beauty-booking/db";
import { logger } from "@beauty-booking/shared";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JobRunResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

export interface RunDueJobsOptions {
  clientId?: string;
  jobType?: string;
  batchSize?: number;
}

// ── DB query interfaces (injected for testability) ────────────────────────────

export interface JobRunnerDeps {
  getDueJobs: (opts: RunDueJobsOptions) => Promise<AutomationJob[]>;
  claimJob: (jobId: string) => Promise<boolean>;
  markCompleted: (jobId: string, result: unknown) => Promise<void>;
  markFailed: (jobId: string, error: string, attempts: number, maxAttempts: number) => Promise<void>;
  handleReminder: (job: AutomationJob) => Promise<{ skipped: boolean }>;
  handleRecovery: (job: AutomationJob) => Promise<{ skipped: boolean }>;
}

// ── Job runner ────────────────────────────────────────────────────────────────

/**
 * Runs all due automation jobs of the given type.
 * Uses dependency injection so handlers can be tested without a real DB.
 */
export async function runDueJobs(
  options: RunDueJobsOptions,
  deps: JobRunnerDeps
): Promise<JobRunResult> {
  const result: JobRunResult = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

  const jobs = await deps.getDueJobs({ ...options, batchSize: options.batchSize ?? 10 });

  for (const job of jobs) {
    result.processed++;
    const startTime = Date.now();

    // 1. Claim the job atomically (concurrency guard)
    const claimed = await deps.claimJob(job.id);
    if (!claimed) {
      // Another worker claimed it first
      result.skipped++;
      continue;
    }

    try {
      // 2. Dispatch to the correct handler
      let handlerResult: { skipped: boolean };

      if (job.jobType === "reminder_24h" || job.jobType === "reminder_3h") {
        handlerResult = await deps.handleReminder(job);
      } else if (job.jobType === "recovery" || job.jobType === "winback") {
        handlerResult = await deps.handleRecovery(job);
      } else {
        logger.warn("Unknown job type — skipping", { jobId: job.id, jobType: job.jobType });
        handlerResult = { skipped: true };
      }

      if (handlerResult.skipped) {
        result.skipped++;
        await deps.markCompleted(job.id, { skipped: true, reason: "handler skipped" });
      } else {
        result.succeeded++;
        await deps.markCompleted(job.id, { durationMs: Date.now() - startTime });
      }
    } catch (err) {
      result.failed++;
      const newAttempts = (job.attempts ?? 0) + 1;
      await deps.markFailed(job.id, String(err), newAttempts, job.maxAttempts);
      logger.error("Job execution failed", { jobId: job.id, jobType: job.jobType, error: String(err), attempts: newAttempts });
    }
  }

  return result;
}
