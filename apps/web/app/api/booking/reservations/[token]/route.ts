export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getDb, slotReservations } from "@beauty-booking/db";
import { and, eq, inArray } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  try {
    const db = getDb();
    const now = new Date();

    // Idempotent — only transition active/submitted to released
    await db
      .update(slotReservations)
      .set({ status: "released", releasedAt: now })
      .where(
        and(
          eq(slotReservations.reservationToken, token),
          inArray(slotReservations.status, ["active", "submitted"])
        )
      );

    // Always 200 — token not found or already expired/released is fine
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/booking/reservations/[token]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
