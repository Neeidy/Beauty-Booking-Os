import { eq, lte, and, inArray } from "drizzle-orm";
import { getDb, automationJobs, type NewAutomationJob, type AutomationJob } from "../index";

export async function createAutomationJob(data: NewAutomationJob): Promise<AutomationJob> {
  const db = getDb();
  const [job] = await db.insert(automationJobs).values(data).returning();
  if (!job) throw new Error("Failed to create automation job");
  return job;
}

export async function createAutomationJobs(
  items: NewAutomationJob[]
): Promise<AutomationJob[]> {
  if (items.length === 0) return [];
  const db = getDb();
  return db.insert(automationJobs).values(items).returning();
}

/** Get jobs that are due: status='scheduled' AND scheduledAt <= now */
export async function getDueJobs(opts: {
  clientId?: string;
  jobType?: string;
  batchSize?: number;
}): Promise<AutomationJob[]> {
  const db = getDb();
  const conditions = [
    eq(automationJobs.status, "scheduled"),
    lte(automationJobs.scheduledAt, new Date()),
  ];
  if (opts.clientId) conditions.push(eq(automationJobs.clientId, opts.clientId));
  if (opts.jobType) conditions.push(eq(automationJobs.jobType, opts.jobType));

  return db
    .select()
    .from(automationJobs)
    .where(and(...conditions))
    .limit(opts.batchSize ?? 10);
}

/**
 * Atomically claim a job by setting status='processing'.
 * Returns true if the claim succeeded (status was 'scheduled').
 */
export async function claimJob(jobId: string): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(automationJobs)
    .set({ status: "processing" })
    .where(and(eq(automationJobs.id, jobId), eq(automationJobs.status, "scheduled")))
    .returning();
  return updated.length > 0;
}

export async function markJobCompleted(jobId: string, result: unknown): Promise<void> {
  const db = getDb();
  await db
    .update(automationJobs)
    .set({ status: "completed", executedAt: new Date(), result: result as never })
    .where(eq(automationJobs.id, jobId));
}

export async function markJobFailed(
  jobId: string,
  error: string,
  newAttempts: number,
  maxAttempts: number
): Promise<void> {
  const db = getDb();
  const nextStatus = newAttempts >= maxAttempts ? "failed" : "scheduled";
  await db
    .update(automationJobs)
    .set({ status: nextStatus, attempts: newAttempts, error })
    .where(eq(automationJobs.id, jobId));
}

/** Cancel all pending reminder jobs for a booking (called on booking cancellation) */
export async function cancelJobsForBooking(bookingId: string): Promise<void> {
  const db = getDb();
  await db
    .update(automationJobs)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(automationJobs.bookingId, bookingId),
        inArray(automationJobs.status, ["scheduled", "processing"])
      )
    );
}

/** Count outbound recovery/winback messages for a booking (for maxFollowUpAttempts check) */
export async function countRecoveryAttemptsForBooking(bookingId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select()
    .from(automationJobs)
    .where(
      and(
        eq(automationJobs.bookingId, bookingId),
        inArray(automationJobs.jobType, ["recovery", "winback"]),
        eq(automationJobs.status, "completed")
      )
    );
  return rows.length;
}
