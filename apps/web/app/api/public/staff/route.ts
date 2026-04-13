export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb, clients } from "@beauty-booking/db";
import { eq } from "drizzle-orm";
import { getActiveStaff, type StaffMember } from "@/lib/load-staff-config";
import { z } from "zod";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

const PublicStaffMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  serviceIds: z.array(z.string()).optional(),
});

const PublicStaffResponseSchema = z.object({
  staff: z.array(PublicStaffMemberSchema),
});

export async function GET(): Promise<NextResponse> {
  try {
    let activeStaff: StaffMember[] = [];

    // DB-first: configSnapshot.staff
    try {
      const db = getDb();
      const clientRow = await db
        .select({ configSnapshot: clients.configSnapshot })
        .from(clients)
        .where(eq(clients.id, CLIENT_ID))
        .limit(1);

      const snapshot = clientRow[0]?.configSnapshot as Record<string, unknown> | null;
      const dbStaff = snapshot?.staff as StaffMember[] | undefined;

      if (Array.isArray(dbStaff) && dbStaff.length > 0) {
        activeStaff = dbStaff.filter(s => s.active === true);
      } else {
        // Fallback: staff.json
        activeStaff = getActiveStaff();
      }
    } catch {
      // DB okuma başarısız → file fallback
      activeStaff = getActiveStaff();
    }

    // Public endpoint: active field gizlenir, serviceIds dahil (BookingForm filtresi için)
    const publicStaff = activeStaff.map(({ id, name, title, serviceIds }) => ({
      id,
      name,
      title,
      serviceIds: serviceIds ?? [],
    }));

    const parsed = PublicStaffResponseSchema.safeParse({ staff: publicStaff });
    if (!parsed.success) {
      return NextResponse.json({ staff: [] });
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("[/api/public/staff]", err);
    return NextResponse.json({ staff: [] });
  }
}
