import { type NextRequest, NextResponse } from "next/server";
import { setAdminSession } from "../../../../../lib/admin-auth.js";

const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "change-me-in-production";

export async function POST(request: NextRequest) {
  let body: { password?: string } = {};
  try {
    body = await request.json() as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.password !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  setAdminSession(response);
  return response;
}
