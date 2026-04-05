import { type NextRequest, NextResponse } from "next/server";
import {
  verifyInstagramSignature,
  verifyWebhookChallenge,
  logger,
} from "@beauty-booking/shared";

const INSTAGRAM_APP_SECRET = process.env["INSTAGRAM_APP_SECRET"] ?? "";
const INSTAGRAM_VERIFY_TOKEN = process.env["INSTAGRAM_VERIFY_TOKEN"] ?? "";

/**
 * GET — Instagram webhook verification challenge.
 * Meta sends this when you register or update the webhook URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const result = verifyWebhookChallenge(mode, token, challenge, INSTAGRAM_VERIFY_TOKEN);

  if (result) {
    logger.info("Instagram webhook verification successful");
    return new NextResponse(result, { status: 200 });
  }

  logger.warn("Instagram webhook verification failed", { mode, token });
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST — Receive Instagram Graph API event.
 * Verifies HMAC-SHA256 signature before processing.
 */
export async function POST(request: NextRequest) {
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("x-hub-signature-256");

  if (!INSTAGRAM_APP_SECRET) {
    logger.error("INSTAGRAM_APP_SECRET not configured — rejecting webhook");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 500 });
  }

  if (!verifyInstagramSignature(rawBody, signature, INSTAGRAM_APP_SECRET)) {
    logger.warn("Instagram webhook signature verification failed");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Extract messaging events from Instagram webhook payload
  // Full Instagram event structure: https://developers.facebook.com/docs/messenger-platform/webhooks
  const entry = (payload as Record<string, unknown>)?.["entry"];
  logger.info("Instagram webhook received", {
    entryCount: Array.isArray(entry) ? entry.length : 0,
  });

  // TODO Sprint 8: Route DM events to intake agent via orchestrator
  // For now: acknowledge receipt (Meta requires 200 within 20s)
  return NextResponse.json({ status: "received" }, { status: 200 });
}
