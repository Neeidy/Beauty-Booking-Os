export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, automationJobs, bookings } from "@beauty-booking/db";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    const jobs = await db
      .select({
        id: automationJobs.id,
        bookingId: automationJobs.bookingId,
        scheduledAt: automationJobs.scheduledAt,
        executedAt: automationJobs.executedAt,
        status: automationJobs.status,
        result: automationJobs.result,
        customerName: bookings.customerName,
        customerContact: bookings.customerContact,
      })
      .from(automationJobs)
      .leftJoin(bookings, eq(automationJobs.bookingId, bookings.id))
      .where(eq(automationJobs.jobType, "rebooking_reminder"))
      .orderBy(desc(automationJobs.scheduledAt))
      .limit(50);

    return NextResponse.json({ success: true, jobs, count: jobs.length });
  } catch (err) {
    console.error("[GET /api/admin/rebooking]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const origin = request.nextUrl.origin;
    const res = await fetch(`${origin}/api/jobs/rebooking`, {
      method: "POST",
      headers: { "x-webhook-secret": process.env.WEBHOOK_SECRET ?? "" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Job trigger failed", details: err },
        { status: 502 }
      );
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("[POST /api/admin/rebooking]", err);
    return NextResponse.json({ error: "Job trigger failed" }, { status: 500 });
  }
}
