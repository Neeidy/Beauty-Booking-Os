export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { writeLog } from "@/lib/logger";

/**
 * Internal log sink for Edge-runtime callers (middleware) that cannot use fs.
 * Accepts a JSON log entry body and writes it to logs/app.log via writeLog.
 * Not authenticated — should never be exposed to public traffic (handled at infra level).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const entry = (await request.json()) as Record<string, unknown>;
    if (entry && typeof entry === "object") {
      writeLog(entry);
    }
  } catch {
    // Swallow all errors — logging must never affect app availability
  }
  return NextResponse.json({ ok: true });
}
