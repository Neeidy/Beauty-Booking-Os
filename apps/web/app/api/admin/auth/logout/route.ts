import { NextResponse } from "next/server";
import { clearAdminSession } from "../../../../../lib/admin-auth.js";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAdminSession(response);
  return response;
}
