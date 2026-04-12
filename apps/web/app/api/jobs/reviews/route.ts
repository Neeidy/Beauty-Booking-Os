export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb, bookings, automationJobs } from "@beauty-booking/db";
import { and, eq } from "drizzle-orm";
import { loadClientConfig } from "@/lib/load-client-config";

// WEBHOOK_SECRET auth — reminders/recovery route'larıyla tutarlı
function verifyAuth(request: NextRequest): boolean {
  const secret = process.env["WEBHOOK_SECRET"];
  if (!secret) return true; // No secret configured → allow (dev mode)
  const header = request.headers.get("x-webhook-secret");
  return header === secret;
}

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Config'den review URL'ini al — yoksa erken çık
    let reviewUrl = "";
    try {
      const cfg = loadClientConfig();
      reviewUrl = cfg.googleBusiness?.reviewUrl ?? "";
    } catch {
      // Config yüklenemedi
    }

    if (!reviewUrl) {
      return NextResponse.json(
        { error: "No review URL configured" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Tüm completed booking'leri al
    const completedBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.clientId, CLIENT_ID),
          eq(bookings.status, "completed")
        )
      );

    const processed: string[] = [];
    const now = new Date();

    for (const booking of completedBookings) {
      // Bu booking için daha önce review job'u oluşturulmuş mu?
      const existingJob = await db
        .select({ id: automationJobs.id })
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.bookingId, booking.id),
            eq(automationJobs.jobType, "send_review_link")
          )
        )
        .limit(1);

      if (existingJob.length > 0) continue; // Duplicate önleme

      // Yeni review job'u oluştur
      await db.insert(automationJobs).values({
        clientId: CLIENT_ID,
        bookingId: booking.id,
        jobType: "send_review_link",
        scheduledAt: now,
        executedAt: now,
        status: "completed",
        attempts: 1,
        maxAttempts: 1,
        result: { reviewUrl, sentAt: now.toISOString() },
        // id: schema defaultRandom() kullanıyor — verme
        // leadId: bu job lead'e bağlı değil — verme (nullable)
      });

      processed.push(booking.id);
    }

    return NextResponse.json({
      success: true,
      processed: processed.length,
      bookingIds: processed,
    });
  } catch (err) {
    console.error("[/api/jobs/reviews] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
