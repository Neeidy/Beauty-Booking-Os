export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb, bookings, automationJobs, gdprConsents } from "@beauty-booking/db";
import { and, eq, isNull } from "drizzle-orm";
import { loadClientConfig } from "@/lib/load-client-config";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // dev mode — V2-9 pattern
  return request.headers.get("x-webhook-secret") === secret;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const path = "/api/jobs/rebooking";

  if (!isAuthorized(request)) {
    logRequest(request.method, path, 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let weeks = 4;
  try {
    const cfg = loadClientConfig();
    weeks = Math.max(2, Math.min(12, cfg.rebookingWeeks ?? 4));
  } catch {
    // config yüklenemezse default 4
  }

  // scheduledAt = şu an + rebookingWeeks — job gelecekteki bir hatırlatmayı temsil eder
  const scheduledAt = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  try {
    const db = getDb();

    const completedBookings = await db
      .select({
        id: bookings.id,
        leadId: bookings.leadId,
        customerName: bookings.customerName,
        customerContact: bookings.customerContact,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.clientId, CLIENT_ID),
          eq(bookings.status, "completed")
        )
      );

    const processed: string[] = [];
    const skippedConsent: string[] = [];
    const skippedDuplicate: string[] = [];
    const skippedNoLead: string[] = [];

    for (const b of completedBookings) {
      // leadId yoksa GDPR kontrolü yapılamaz
      if (!b.leadId) {
        skippedNoLead.push(b.id);
        continue;
      }

      // GDPR: gdprConsents tablosundan reminder_messages consent kontrolü
      const consent = await db
        .select({ id: gdprConsents.id })
        .from(gdprConsents)
        .where(
          and(
            eq(gdprConsents.leadId, b.leadId),
            eq(gdprConsents.consentType, "reminder_messages"),
            eq(gdprConsents.granted, true),
            isNull(gdprConsents.revokedAt)
          )
        )
        .limit(1);

      if (consent.length === 0) {
        skippedConsent.push(b.id);
        continue;
      }

      // Duplicate kontrolü
      const existing = await db
        .select({ id: automationJobs.id })
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.bookingId, b.id),
            eq(automationJobs.jobType, "rebooking_reminder")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        skippedDuplicate.push(b.id);
        continue;
      }

      // Insert: status="scheduled", executedAt=null (henüz çalışmadı)
      await db.insert(automationJobs).values({
        clientId: CLIENT_ID,
        bookingId: b.id,
        leadId: b.leadId,
        jobType: "rebooking_reminder",
        scheduledAt,
        status: "scheduled",
        attempts: 0,
        maxAttempts: 3,
        result: {
          rebookingWeeks: weeks,
          customerContact: b.customerContact,
          scheduledFor: scheduledAt.toISOString(),
          createdAt: now.toISOString(),
        },
      });

      processed.push(b.id);
    }

    logRequest(request.method, path, 200, Date.now() - start);
    return NextResponse.json({
      success: true,
      summary: {
        eligible: completedBookings.length,
        processed: processed.length,
        processedIds: processed,
        skippedConsent: skippedConsent.length,
        skippedDuplicate: skippedDuplicate.length,
        skippedNoLead: skippedNoLead.length,
        rebookingWeeks: weeks,
        scheduledFor: scheduledAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[/api/jobs/rebooking]", err);
    logError(path, err);
    logRequest(request.method, path, 500, Date.now() - start, String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
