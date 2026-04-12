export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, bookings } from "@beauty-booking/db";
import { eq } from "drizzle-orm";
import { loadClientConfig } from "@/lib/load-client-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bookingId } = await params;

  try {
    const db = getDb();

    // Booking'i bul ve status'ünü doğrula
    const result = await db
      .select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (result[0].status !== "completed") {
      return NextResponse.json(
        { error: "Booking is not completed" },
        { status: 400 }
      );
    }

    // Config'den review URL'ini al
    let reviewUrl = "";
    try {
      const cfg = loadClientConfig();
      reviewUrl = cfg.googleBusiness?.reviewUrl ?? "";
    } catch {
      // Config hatası — reviewUrl boş kalır
    }

    if (!reviewUrl) {
      return NextResponse.json(
        { error: "No review URL configured for this salon" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      bookingId,
      reviewUrl,
      message: "Review link ready to send",
    });
  } catch (err) {
    console.error("[/api/admin/bookings/[id]/reviews] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
