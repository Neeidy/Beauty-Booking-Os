export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, services } from "@beauty-booking/db";
import { eq } from "drizzle-orm";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("GET", "/api/admin/services", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const result = await db
      .select({
        id: services.id,
        serviceName: services.serviceName,
        category: services.category,
        durationMinutes: services.durationMinutes,
        priceEur: services.priceEur,
        description: services.description,
        active: services.active,
        sortOrder: services.sortOrder,
      })
      .from(services)
      .where(eq(services.clientId, CLIENT_ID))
      .orderBy(services.sortOrder);

    logRequest("GET", "/api/admin/services", 200, Date.now() - start);
    return NextResponse.json({ success: true, services: result });
  } catch (err) {
    logError("/api/admin/services", err);
    logRequest("GET", "/api/admin/services", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
