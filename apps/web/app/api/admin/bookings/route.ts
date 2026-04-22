export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, bookings } from "@beauty-booking/db";
import { eq, and, desc, gte, lte, count } from "drizzle-orm";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";

export async function GET(request: NextRequest) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status   = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo   = searchParams.get("dateTo");
  const page     = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit    = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const offset   = (page - 1) * limit;

  const db = getDb();
  const conditions = [eq(bookings.clientId, CLIENT_ID)];

  if (status) conditions.push(eq(bookings.status, status as never));
  if (dateFrom) conditions.push(gte(bookings.appointmentAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(bookings.appointmentAt, new Date(dateTo)));

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db.select().from(bookings).where(where).orderBy(desc(bookings.appointmentAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(bookings).where(where),
  ]);
  const total = countResult[0]?.total ?? 0;

  return NextResponse.json({
    bookings: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
