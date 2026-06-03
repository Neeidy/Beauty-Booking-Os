import { type NextRequest, NextResponse } from "next/server";
import { setAdminSession, verifyAdminSecret } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  let body: { password?: string } = {};
  try {
    body = await request.json() as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!verifyAdminSecret(body.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  setAdminSession(response);
  return response;
}
