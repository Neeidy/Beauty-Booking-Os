import { type NextRequest, NextResponse } from "next/server";
import { getDb, automationJobs, leads } from "@beauty-booking/db";
import { eq, and, count, gte, sql } from "drizzle-orm";
import { logger } from "@beauty-booking/shared";

const FAILED_JOBS_THRESHOLD = 5;
const ESCALATION_QUEUE_THRESHOLD = 10;
const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";

export interface HealthStatus {
  status: "ok" | "degraded" | "critical";
  timestamp: string;
  checks: {
    database: "ok" | "error";
    failedJobs: { count: number; alert: boolean };
    escalationQueue: { count: number; alert: boolean };
  };
  alerts: string[];
}

export async function GET(_request: NextRequest) {
  const timestamp = new Date().toISOString();
  const alerts: string[] = [];

  // ── Database check ─────────────────────────────────────────────────────────
  let dbStatus: "ok" | "error" = "ok";
  let failedJobCount = 0;
  let escalationCount = 0;

  try {
    const db = getDb();

    // Count failed jobs in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [failedResult] = await db
      .select({ count: count() })
      .from(automationJobs)
      .where(
        and(
          eq(automationJobs.clientId, CLIENT_ID),
          eq(automationJobs.status, "failed"),
          gte(automationJobs.createdAt, since)
        )
      );
    failedJobCount = failedResult?.count ?? 0;

    // Count leads in human review queue
    const [escalationResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(
        and(
          eq(leads.clientId, CLIENT_ID),
          eq(leads.assignedTo, "human_review"),
          eq(leads.status, "new")
        )
      );
    escalationCount = escalationResult?.count ?? 0;
  } catch (err) {
    dbStatus = "error";
    alerts.push("Database connection failed");
    logger.error("Health check: database error", { error: err });
  }

  // ── Threshold alerts ───────────────────────────────────────────────────────
  const failedJobAlert = failedJobCount >= FAILED_JOBS_THRESHOLD;
  const escalationAlert = escalationCount >= ESCALATION_QUEUE_THRESHOLD;

  if (failedJobAlert) {
    alerts.push(`${failedJobCount} failed jobs in last 24h (threshold: ${FAILED_JOBS_THRESHOLD})`);
    logger.warn("Health alert: failed jobs threshold exceeded", { failedJobCount });
  }

  if (escalationAlert) {
    alerts.push(`${escalationCount} leads in escalation queue (threshold: ${ESCALATION_QUEUE_THRESHOLD})`);
    logger.warn("Health alert: escalation queue threshold exceeded", { escalationCount });
  }

  // ── Overall status ─────────────────────────────────────────────────────────
  let status: "ok" | "degraded" | "critical" = "ok";
  if (dbStatus === "error") {
    status = "critical";
  } else if (failedJobAlert || escalationAlert) {
    status = "degraded";
  }

  const body: HealthStatus = {
    status,
    timestamp,
    checks: {
      database: dbStatus,
      failedJobs: { count: failedJobCount, alert: failedJobAlert },
      escalationQueue: { count: escalationCount, alert: escalationAlert },
    },
    alerts,
  };

  const httpStatus = status === "critical" ? 503 : 200;
  return NextResponse.json(body, { status: httpStatus });
}
