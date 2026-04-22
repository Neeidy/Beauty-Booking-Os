export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, leads } from "@beauty-booking/db";
import { eq, and, desc, gte, lte, ilike, or, count, sql } from "drizzle-orm";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status   = searchParams.get("status");
  const source   = searchParams.get("source");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo   = searchParams.get("dateTo");
  const search   = searchParams.get("search");
  const page     = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit    = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const offset   = (page - 1) * limit;

  const db = getDb();
  const conditions = [eq(leads.clientId, CLIENT_ID)];

  if (status) conditions.push(eq(leads.status, status as never));
  if (source) conditions.push(eq(leads.source, source as never));
  if (dateFrom) conditions.push(gte(leads.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(leads.createdAt, new Date(dateTo)));
  if (search) {
    conditions.push(or(
      ilike(leads.customerName, `%${search}%`),
      ilike(leads.customerEmail, `%${search}%`),
      ilike(leads.customerPhone, `%${search}%`),
    ) as ReturnType<typeof eq>);
  }

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(leads).where(where),
  ]);
  const total = countResult[0]?.total ?? 0;

  return NextResponse.json({
    leads: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
