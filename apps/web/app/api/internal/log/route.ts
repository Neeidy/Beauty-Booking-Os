export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { writeLog } from "@/lib/logger";

// Shared secret proving the caller is our own middleware, not arbitrary public
// traffic. On Vercel every /api/* path is publicly reachable, so the previous
// "handled at infra level" assumption did not hold — without this guard anyone
// could inject/flood log entries. The middleware sends this header on its
// fire-and-forget POST. Falls back to WEBHOOK_SECRET (already provisioned).
const LOG_SECRET =
  process.env["INTERNAL_LOG_SECRET"] ?? process.env["WEBHOOK_SECRET"] ?? "";

/**
 * Internal log sink for Edge-runtime callers (middleware) that cannot use fs.
 * Accepts a JSON log entry body and writes it to logs/app.log via writeLog.
 * Authenticated via the x-internal-log header to block public abuse.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Reject unless the caller presents the shared secret. If no secret is
  // configured (local dev), allow through so logging keeps working.
  if (LOG_SECRET) {
    const provided = request.headers.get("x-internal-log");
    if (provided !== LOG_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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
