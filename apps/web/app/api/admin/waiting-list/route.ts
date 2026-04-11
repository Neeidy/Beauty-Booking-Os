import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, leads } from "@beauty-booking/db";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";

// ── Zod schemas ────────────────────────────────────────────────────────────────

const WaitingListEntrySchema = z.object({
  id: z.string().uuid(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerPhone: z.string().nullable(),
  requestedDate: z.string(),
  requestedServiceId: z.string(),
  notified: z.boolean(),
  registeredAt: z.string(),
  createdAt: z.string(),
});

const WaitingListResponseSchema = z.object({
  entries: z.array(WaitingListEntrySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get("clientId") ?? CLIENT_ID;
  const serviceId = searchParams.get("serviceId") ?? undefined;
  const date = searchParams.get("date") ?? undefined;
  const notified = searchParams.get("notified") ?? undefined;
  const pageNum = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  try {
    const db = getDb();

    const allWaiting = await db
      .select({
        id: leads.id,
        customerName: leads.customerName,
        customerEmail: leads.customerEmail,
        customerPhone: leads.customerPhone,
        metadata: leads.metadata,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.clientId, clientId),
          sql`${leads.metadata}->>'waitingList' = 'true'`,
          ...(serviceId
            ? [sql`${leads.metadata}->>'requestedServiceId' = ${serviceId}`]
            : []),
          ...(date ? [sql`${leads.metadata}->>'requestedDate' = ${date}`] : []),
          ...(notified === "true"
            ? [sql`${leads.metadata}->>'waitingList_notified' = 'true'`]
            : notified === "false"
              ? [sql`${leads.metadata}->>'waitingList_notified' = 'false'`]
              : []),
        ),
      )
      .orderBy(leads.createdAt)
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    const entries = allWaiting.map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone,
        requestedDate: (meta["requestedDate"] as string) ?? "",
        requestedServiceId: (meta["requestedServiceId"] as string) ?? "",
        notified: meta["waitingList_notified"] === true,
        registeredAt:
          (meta["waitingList_registeredAt"] as string) ??
          (row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt)),
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt),
      };
    });

    const payload = {
      entries,
      total: allWaiting.length,
      page: pageNum,
      limit: limitNum,
    };

    const parsed = WaitingListResponseSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("admin/waiting-list: Zod validation failed", parsed.error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("admin/waiting-list GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
