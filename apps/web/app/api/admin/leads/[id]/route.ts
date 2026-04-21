export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, leads } from "@beauty-booking/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

const VALID_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "booking_started",
  "booked",
  "lost",
  "spam",
] as const;

const LeadPatchSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("PATCH", "/api/admin/leads/[id]", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    logRequest("PATCH", "/api/admin/leads/[id]", 400, Date.now() - start);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = LeadPatchSchema.safeParse(body);
  if (!parsed.success) {
    logRequest("PATCH", "/api/admin/leads/[id]", 400, Date.now() - start);
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    logRequest("PATCH", "/api/admin/leads/[id]", 400, Date.now() - start);
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const db = getDb();

    const existing = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.clientId, CLIENT_ID)))
      .limit(1);

    if (existing.length === 0) {
      logRequest("PATCH", "/api/admin/leads/[id]", 404, Date.now() - start);
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const updated = await db
      .update(leads)
      .set(parsed.data)
      .where(and(eq(leads.id, id), eq(leads.clientId, CLIENT_ID)))
      .returning();

    logRequest("PATCH", "/api/admin/leads/[id]", 200, Date.now() - start);
    return NextResponse.json({ success: true, lead: updated[0] });
  } catch (err) {
    logError("/api/admin/leads/[id]", err);
    logRequest("PATCH", "/api/admin/leads/[id]", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
