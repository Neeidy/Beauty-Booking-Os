export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, eventLogs } from "@beauty-booking/db";
import { eq, and, desc, gte, ilike, count, sum } from "drizzle-orm";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const eventType = searchParams.get("eventType");
  const agentName = searchParams.get("agentName");
  const status    = searchParams.get("status");
  const dateFrom  = searchParams.get("dateFrom");
  const page      = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit     = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));
  const offset    = (page - 1) * limit;

  const db = getDb();
  const conditions = [eq(eventLogs.clientId, CLIENT_ID)];

  if (eventType) conditions.push(eq(eventLogs.eventType, eventType));
  if (agentName) conditions.push(eq(eventLogs.agentName, agentName));
  if (status) conditions.push(eq(eventLogs.status, status));
  if (dateFrom) conditions.push(gte(eventLogs.createdAt, new Date(dateFrom)));

  const where = and(...conditions);

  const [rows, countResult, tokenResult] = await Promise.all([
    db.select().from(eventLogs).where(where).orderBy(desc(eventLogs.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(eventLogs).where(where),
    db.select({ totalTokens: sum(eventLogs.tokenCount) }).from(eventLogs).where(where),
  ]);
  const total = countResult[0]?.total ?? 0;
  const tokenSummary = tokenResult[0];

  return NextResponse.json({
    logs: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    totalTokens: Number(tokenSummary?.totalTokens ?? 0),
  });
}
