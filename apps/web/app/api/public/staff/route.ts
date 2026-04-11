export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getActiveStaff } from "@/lib/load-staff-config";
import { z } from "zod";

const PublicStaffMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
});

const PublicStaffResponseSchema = z.object({
  staff: z.array(PublicStaffMemberSchema),
});

export async function GET(): Promise<NextResponse> {
  try {
    const activeStaff = getActiveStaff();
    const publicStaff = activeStaff.map(({ id, name, title }) => ({
      id,
      name,
      title,
    }));

    const parsed = PublicStaffResponseSchema.safeParse({ staff: publicStaff });
    if (!parsed.success) {
      console.error("[/api/public/staff] Zod validation failed:", parsed.error);
      return NextResponse.json({ staff: [] });
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("[/api/public/staff] Unexpected error:", err);
    return NextResponse.json({ staff: [] });
  }
}
