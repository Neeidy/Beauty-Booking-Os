export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, leads } from "@beauty-booking/db";
import { eq, and, desc, count } from "drizzle-orm";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Escalation queue: leads assigned to human_review that are still "new"
  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(and(
        eq(leads.clientId, CLIENT_ID),
        eq(leads.assignedTo, "human_review"),
        eq(leads.status, "new"),
      ))
      .orderBy(desc(leads.createdAt))
      .limit(50),
    db
      .select({ total: count() })
      .from(leads)
      .where(and(
        eq(leads.clientId, CLIENT_ID),
        eq(leads.assignedTo, "human_review"),
        eq(leads.status, "new"),
      )),
  ]);
  const total = countResult[0]?.total ?? 0;

  return NextResponse.json({ leads: rows, total });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { leadId: string; action: "qualify" | "spam" | "contacted" };
  const { leadId, action } = body;

  if (!leadId || !action) {
    return NextResponse.json({ error: "leadId and action required" }, { status: 400 });
  }

  const ACTION_STATUS_MAP = {
    qualify:   { status: "qualified",  assignedTo: null as string | null },
    spam:      { status: "spam",       assignedTo: null as string | null },
    contacted: { status: "contacted",  assignedTo: null as string | null },
  } as const;

  const update = ACTION_STATUS_MAP[action];
  if (!update) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const db = getDb();
  await db
    .update(leads)
    .set({ status: update.status as never, assignedTo: update.assignedTo, updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.clientId, CLIENT_ID)));

  return NextResponse.json({ ok: true });
}
