import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { getCachedSalonConfig } from "@beauty-booking/config";
import { getLeadById, updateLeadStatus } from "@beauty-booking/db/queries/leads";
import { logEvent } from "@beauty-booking/db/queries/event-logs";
import { logger } from "@beauty-booking/shared";
import { classify } from "../../../../../../../../packages/agents/intake-agent/classifier.js";
import { routeEvent } from "../../../../../../../../packages/agents/orchestrator/router.js";

const CLIENTS_DIR = join(process.cwd(), "..", "..", "clients");

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const startTime = Date.now();

  // 1. Load lead from DB
  let lead;
  try {
    lead = await getLeadById(leadId);
  } catch (err) {
    logger.error("DB error fetching lead", { leadId, error: String(err) });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }

  if (!lead) {
    return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
  }

  // 2. Load salon config
  let salonConfig;
  try {
    // Resolve slug from DB — in production, clients table has the slug
    // For now we use DEFAULT_CLIENT_SLUG env fallback
    const slug = process.env["DEFAULT_CLIENT_SLUG"] ?? "demo-salon";
    salonConfig = getCachedSalonConfig(CLIENTS_DIR, slug);
  } catch (err) {
    logger.error("Failed to load salon config", { leadId, error: String(err) });
    return NextResponse.json({ success: false, error: "Salon config not found" }, { status: 500 });
  }

  // 3. Check orchestrator — verify intake is enabled
  const routingDecision = routeEvent(
    { type: "new_lead", clientId: lead.clientId, leadId },
    salonConfig.client
  );

  if (routingDecision.targetAgent !== "intake-agent") {
    // Feature flag says human, log and return
    await logEvent({
      clientId: lead.clientId,
      leadId,
      eventType: "orchestrator_decision",
      agentName: "orchestrator",
      inputSummary: `lead=${leadId}`,
      outputSummary: `target=human reason=${routingDecision.reason}`,
      status: "escalated",
      durationMs: Date.now() - startTime,
    }).catch(() => {}); // Never fail the request because of logging

    return NextResponse.json({
      success: true,
      routed_to: "human",
      reason: routingDecision.reason,
    });
  }

  // 4. Run Intake Agent
  const classifyResult = await classify({
    customerMessage: lead.rawMessage ?? "",
    channel: lead.source,
    clientId: lead.clientId,
    leadId,
    salonConfig,
  });

  const durationMs = Date.now() - startTime;

  // 5. Log event (best-effort)
  await logEvent({
    clientId: lead.clientId,
    leadId,
    eventType: "agent_call",
    agentName: "intake-agent",
    inputSummary: `channel=${lead.source} msg=${(lead.rawMessage ?? "").slice(0, 100)}`,
    outputSummary: classifyResult.success
      ? `intent=${classifyResult.data?.intent} confidence=${classifyResult.data?.confidence}`
      : `error=${classifyResult.error}`,
    status: classifyResult.success ? "success" : "failure",
    durationMs,
    tokenCount: classifyResult.tokenUsage.total,
    errorMessage: classifyResult.error ?? undefined,
    payload: {
      output: classifyResult.data,
      retryCount: classifyResult.retryCount,
    },
  }).catch(() => {});

  if (!classifyResult.success) {
    logger.error("Intake agent failed", { leadId, error: classifyResult.error });
    return NextResponse.json(
      { success: false, error: "Classification failed", details: classifyResult.error },
      { status: 500 }
    );
  }

  const output = classifyResult.data!;

  // 6. Update lead record with intent
  await updateLeadStatus(leadId, "qualified", {
    intent: output.intent,
    intentConfidence: Math.round(output.confidence * 100),
  }).catch((err) => {
    logger.warn("Failed to update lead status", { leadId, error: String(err) });
  });

  return NextResponse.json({
    success: true,
    leadId,
    classification: output,
    routing: routingDecision,
    meta: {
      durationMs,
      tokens: classifyResult.tokenUsage,
      retries: classifyResult.retryCount,
    },
  });
}
