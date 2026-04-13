export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, clients } from "@beauty-booking/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { loadClientConfig } from "@/lib/load-client-config";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

const DayHoursSchema = z
  .object({ open: z.string().regex(/^\d{4}$/), close: z.string().regex(/^\d{4}$/) })
  .nullable();

const OperatingHoursSchema = z.object({
  monday: DayHoursSchema,
  tuesday: DayHoursSchema,
  wednesday: DayHoursSchema,
  thursday: DayHoursSchema,
  friday: DayHoursSchema,
  saturday: DayHoursSchema,
  sunday: DayHoursSchema,
});

const BookingRulesSchema = z.object({
  minAdvanceBookingHours: z.number().int().min(0).max(168).optional(),
  cancellationPolicyHours: z.number().int().min(0).max(168).optional(),
  maxFollowUpAttempts: z.number().int().min(0).max(10).optional(),
  recoveryWaitHours: z.number().int().min(0).max(720).optional(),
});

const ConfigPatchSchema = z.object({
  operatingHours: OperatingHoursSchema.optional(),
  bookingRules: BookingRulesSchema.optional(),
  closedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("GET", "/api/admin/config", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const clientRow = await db
      .select({ configSnapshot: clients.configSnapshot })
      .from(clients)
      .where(eq(clients.id, CLIENT_ID))
      .limit(1);

    let fileConfig: Record<string, unknown> = {};
    try {
      fileConfig = loadClientConfig() as unknown as Record<string, unknown>;
    } catch {
      // config file unavailable — use empty
    }

    const snapshot = (clientRow[0]?.configSnapshot as Record<string, unknown>) ?? {};

    const merged = {
      operatingHours: snapshot.operatingHours ?? fileConfig.operatingHours ?? {},
      bookingRules: snapshot.bookingRules ?? fileConfig.bookingRules ?? {},
      closedDates: (snapshot.closedDates as string[]) ?? [],
    };

    logRequest("GET", "/api/admin/config", 200, Date.now() - start);
    return NextResponse.json({ success: true, config: merged });
  } catch (err) {
    logError("/api/admin/config", err);
    logRequest("GET", "/api/admin/config", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("PATCH", "/api/admin/config", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    logRequest("PATCH", "/api/admin/config", 400, Date.now() - start);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ConfigPatchSchema.safeParse(body);
  if (!parsed.success) {
    logRequest("PATCH", "/api/admin/config", 400, Date.now() - start);
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    logRequest("PATCH", "/api/admin/config", 400, Date.now() - start);
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const db = getDb();

    const clientRow = await db
      .select({ configSnapshot: clients.configSnapshot })
      .from(clients)
      .where(eq(clients.id, CLIENT_ID))
      .limit(1);

    if (clientRow.length === 0) {
      logRequest("PATCH", "/api/admin/config", 404, Date.now() - start);
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const current = (clientRow[0]!.configSnapshot as Record<string, unknown>) ?? {};
    const updated = { ...current, ...parsed.data };

    await db
      .update(clients)
      .set({ configSnapshot: updated })
      .where(eq(clients.id, CLIENT_ID));

    logRequest("PATCH", "/api/admin/config", 200, Date.now() - start);
    return NextResponse.json({ success: true, config: updated });
  } catch (err) {
    logError("/api/admin/config", err);
    logRequest("PATCH", "/api/admin/config", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
