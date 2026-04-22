export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, leads, bookings, automationJobs, eventLogs } from "@beauty-booking/db";
import { eq, gte, and, count, sum, lte, between } from "drizzle-orm";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";
// Cost: $3 per 1M input tokens + $15 per 1M output tokens — simplified to $3/1M avg
const COST_PER_TOKEN = 3 / 1_000_000;
const EUR_PER_USD = 0.92;

export async function GET(request: NextRequest) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  // ── Today stats ─────────────────────────────────────────────────────────────
  const [newLeadsToday] = await db
    .select({ count: count() })
    .from(leads)
    .where(and(eq(leads.clientId, CLIENT_ID), gte(leads.createdAt, todayStart)));

  const [bookingsToday] = await db
    .select({ count: count() })
    .from(bookings)
    .where(and(
      eq(bookings.clientId, CLIENT_ID),
      gte(bookings.appointmentAt, todayStart),
      lte(bookings.appointmentAt, new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1))
    ));

  const [pendingActions] = await db
    .select({ count: count() })
    .from(leads)
    .where(and(eq(leads.clientId, CLIENT_ID), eq(leads.assignedTo, "human_review")));

  const [remindersScheduled] = await db
    .select({ count: count() })
    .from(automationJobs)
    .where(and(
      eq(automationJobs.clientId, CLIENT_ID),
      eq(automationJobs.status, "scheduled"),
      gte(automationJobs.scheduledAt, todayStart)
    ));

  // ── This week stats ──────────────────────────────────────────────────────────
  const [totalLeadsWeek] = await db
    .select({ count: count() })
    .from(leads)
    .where(and(eq(leads.clientId, CLIENT_ID), gte(leads.createdAt, weekStart)));

  const [totalBookingsWeek] = await db
    .select({ count: count() })
    .from(bookings)
    .where(and(eq(bookings.clientId, CLIENT_ID), gte(bookings.createdAt, weekStart)));

  const [noShowsWeek] = await db
    .select({ count: count() })
    .from(bookings)
    .where(and(
      eq(bookings.clientId, CLIENT_ID),
      eq(bookings.status, "no_show"),
      gte(bookings.updatedAt, weekStart)
    ));

  const [cancellationsWeek] = await db
    .select({ count: count() })
    .from(bookings)
    .where(and(
      eq(bookings.clientId, CLIENT_ID),
      eq(bookings.status, "cancelled"),
      gte(bookings.updatedAt, weekStart)
    ));

  const leadsWeek = totalLeadsWeek?.count ?? 0;
  const bookingsWeek = totalBookingsWeek?.count ?? 0;
  const conversionRate = leadsWeek > 0 ? Math.round((bookingsWeek / leadsWeek) * 100) : 0;

  // ── AI costs ─────────────────────────────────────────────────────────────────
  const [tokensToday] = await db
    .select({ total: sum(eventLogs.tokenCount) })
    .from(eventLogs)
    .where(and(eq(eventLogs.clientId, CLIENT_ID), gte(eventLogs.createdAt, todayStart)));

  const [tokensWeek] = await db
    .select({ total: sum(eventLogs.tokenCount) })
    .from(eventLogs)
    .where(and(eq(eventLogs.clientId, CLIENT_ID), gte(eventLogs.createdAt, weekStart)));

  const totalTokensWeek = Number(tokensWeek?.total ?? 0);
  const estimatedCostEur = +(totalTokensWeek * COST_PER_TOKEN * EUR_PER_USD).toFixed(4);

  // ── Escalation queue ─────────────────────────────────────────────────────────
  // "needs_human_review" leads: those assigned to human_review or with low confidence
  const [escalationQueue] = await db
    .select({ count: count() })
    .from(leads)
    .where(and(
      eq(leads.clientId, CLIENT_ID),
      eq(leads.status, "new"),
      eq(leads.assignedTo, "human_review")
    ));

  return NextResponse.json({
    today: {
      newLeads: newLeadsToday?.count ?? 0,
      bookingsToday: bookingsToday?.count ?? 0,
      pendingActions: pendingActions?.count ?? 0,
      remindersScheduled: remindersScheduled?.count ?? 0,
    },
    thisWeek: {
      totalLeads: leadsWeek,
      totalBookings: bookingsWeek,
      conversionRate,
      noShows: noShowsWeek?.count ?? 0,
      cancellations: cancellationsWeek?.count ?? 0,
    },
    aiCosts: {
      totalTokensToday: Number(tokensToday?.total ?? 0),
      totalTokensThisWeek: totalTokensWeek,
      estimatedCostEur,
    },
    escalationQueue: escalationQueue?.count ?? 0,
  });
}
