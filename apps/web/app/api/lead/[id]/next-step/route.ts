import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { z } from "zod";
import { getCachedSalonConfig } from "@beauty-booking/config";
import { getLeadById } from "@beauty-booking/db/queries/leads";
import { logEvent } from "@beauty-booking/db/queries/event-logs";
import { logger } from "@beauty-booking/shared";
import { nextStep } from "@beauty-booking/booking-agent";
import { routeEvent } from "@beauty-booking/orchestrator";
import type { IntakeOutput } from "@beauty-booking/intake-agent";

const CLIENTS_DIR = join(process.cwd(), "..", "..", "clients");

const RequestBodySchema = z.object({
  customerMessage: z.string().min(1).max(2000),
  customerHistory: z.string().max(10000).default(""),
  conversationRound: z.number().int().positive().default(1),
  // The caller provides the previously classified intent
  intakeResult: z.object({
    intent: z.enum([
      "new_booking", "price_inquiry", "service_info",
      "existing_booking_change", "complaint", "unclear",
    ]),
    confidence: z.number().min(0).max(1),
    needs_human_review: z.boolean(),
    next_step: z.string(),
    summary: z.string(),
    detected_service: z.string().nullable(),
    language: z.enum(["de", "en", "tr"]),
  }),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const startTime = Date.now();

  // 1. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { customerMessage, customerHistory, conversationRound, intakeResult } = parsed.data;

  // 2. Load lead
  let lead;
  try {
    lead = await getLeadById(leadId);
  } catch (err) {
    logger.error("DB error fetching lead for next-step", { leadId, error: String(err) });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }

  if (!lead) {
    return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
  }

  // 3. Reject if lead hasn't been classified yet
  if (!lead.intent) {
    return NextResponse.json(
      { success: false, error: "Lead has not been classified yet. Call /classify first." },
      { status: 422 }
    );
  }

  // 4. Load salon config
  let salonConfig;
  try {
    const slug = process.env["DEFAULT_CLIENT_SLUG"] ?? "demo-salon";
    salonConfig = getCachedSalonConfig(CLIENTS_DIR, slug);
  } catch (err) {
    logger.error("Failed to load salon config", { leadId, error: String(err) });
    return NextResponse.json({ success: false, error: "Salon config not found" }, { status: 500 });
  }

  // 5. Check orchestrator — verify booking agent is enabled
  const routingDecision = routeEvent(
    { type: "lead_classified", clientId: lead.clientId, leadId, intent: intakeResult.intent },
    salonConfig.client
  );

  if (routingDecision.targetAgent !== "booking-agent") {
    await logEvent({
      clientId: lead.clientId,
      leadId,
      eventType: "orchestrator_decision",
      agentName: "orchestrator",
      inputSummary: `lead=${leadId} intent=${intakeResult.intent}`,
      outputSummary: `target=${routingDecision.targetAgent} reason=${routingDecision.reason}`,
      status: "escalated",
      durationMs: Date.now() - startTime,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      routed_to: routingDecision.targetAgent,
      reason: routingDecision.reason,
      priority: routingDecision.priority,
    });
  }

  // 6. Run Booking Agent
  const bookingResult = await nextStep({
    intakeResult: intakeResult as IntakeOutput,
    customerMessage,
    customerHistory,
    conversationRound,
    clientId: lead.clientId,
    leadId,
    salonConfig,
  });

  const durationMs = Date.now() - startTime;

  // 7. Log event
  await logEvent({
    clientId: lead.clientId,
    leadId,
    eventType: "agent_call",
    agentName: "booking-agent",
    inputSummary: `intent=${intakeResult.intent} round=${conversationRound}`,
    outputSummary: bookingResult.success
      ? `stage=${bookingResult.data?.booking_stage} action=${bookingResult.data?.action}`
      : `error=${bookingResult.error}`,
    status: bookingResult.success ? "success" : "failure",
    durationMs,
    tokenCount: bookingResult.tokenUsage.total,
    errorMessage: bookingResult.error ?? undefined,
    payload: {
      output: bookingResult.data,
      retryCount: bookingResult.retryCount,
    },
  }).catch(() => {});

  if (!bookingResult.success) {
    logger.error("Booking agent failed", { leadId, error: bookingResult.error });
    return NextResponse.json(
      { success: false, error: "Booking agent failed", details: bookingResult.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    leadId,
    nextStep: bookingResult.data,
    meta: {
      durationMs,
      tokens: bookingResult.tokenUsage,
      retries: bookingResult.retryCount,
    },
  });
}
