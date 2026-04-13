export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, services } from "@beauty-booking/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

// durationMinutes and category are intentionally excluded — they affect slot calculations
const ServicePatchSchema = z.object({
  serviceName: z.string().min(2).max(100).optional(),
  priceEur: z.number().int().min(0).max(99999).nullable().optional(),
  active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("PATCH", "/api/admin/services/[id]", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    logRequest("PATCH", "/api/admin/services/[id]", 400, Date.now() - start);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ServicePatchSchema.safeParse(body);
  if (!parsed.success) {
    logRequest("PATCH", "/api/admin/services/[id]", 400, Date.now() - start);
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    logRequest("PATCH", "/api/admin/services/[id]", 400, Date.now() - start);
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const db = getDb();

    // clientId ownership check — prevents editing another salon's services
    const existing = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, id), eq(services.clientId, CLIENT_ID)))
      .limit(1);

    if (existing.length === 0) {
      logRequest("PATCH", "/api/admin/services/[id]", 404, Date.now() - start);
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const updated = await db
      .update(services)
      .set(parsed.data)
      .where(and(eq(services.id, id), eq(services.clientId, CLIENT_ID)))
      .returning();

    logRequest("PATCH", "/api/admin/services/[id]", 200, Date.now() - start);
    return NextResponse.json({ success: true, service: updated[0] });
  } catch (err) {
    logError("/api/admin/services/[id]", err);
    logRequest("PATCH", "/api/admin/services/[id]", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
