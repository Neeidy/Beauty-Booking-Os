export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getAllStaff } from "@/lib/load-staff-config";
import { z } from "zod";

const AdminStaffMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  active: z.boolean(),
});

const AdminStaffResponseSchema = z.object({
  staff: z.array(AdminStaffMemberSchema),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const staff = getAllStaff(); // all members — active: false included

    const parsed = AdminStaffResponseSchema.safeParse({ staff });
    if (!parsed.success) {
      console.error("[/api/admin/staff] Zod validation failed:", parsed.error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("[/api/admin/staff] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
