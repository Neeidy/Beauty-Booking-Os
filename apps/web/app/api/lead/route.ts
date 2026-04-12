import { type NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { ZodError } from "zod";
import { getCachedSalonConfig } from "@beauty-booking/config";
import { createLead } from "@beauty-booking/db/queries/leads";
import { logEvent } from "@beauty-booking/db/queries/event-logs";
import { createGdprConsents } from "@beauty-booking/db/queries/gdpr-consents";
import { createLeadInputSchema } from "@beauty-booking/shared";
import { logger } from "@beauty-booking/shared";
import { logRequest, logError } from "@/lib/logger";

const CLIENTS_DIR = join(process.cwd(), "..", "..", "clients");

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    logRequest(request.method, "/api/lead", 400, Date.now() - startTime);
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // 1. Validate input
  const parseResult = createLeadInputSchema.safeParse(rawBody);
  if (!parseResult.success) {
    logRequest(request.method, "/api/lead", 422, Date.now() - startTime);
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parseResult.error.flatten(),
      },
      { status: 422 }
    );
  }

  const input = parseResult.data;

  // 2. Verify client config exists and is valid
  let salonConfig;
  try {
    salonConfig = getCachedSalonConfig(CLIENTS_DIR, input.clientSlug);
  } catch (err) {
    logger.warn("Unknown client slug on lead create", {
      slug: input.clientSlug,
    });
    logRequest(request.method, "/api/lead", 404, Date.now() - startTime);
    return NextResponse.json(
      { success: false, error: "Unknown client" },
      { status: 404 }
    );
  }

  // 3. GDPR: data_processing consent is mandatory
  const dataProcessingConsent = input.gdprConsents.find(
    (c) => c.consentType === "data_processing" && c.granted
  );
  if (!dataProcessingConsent) {
    logRequest(request.method, "/api/lead", 422, Date.now() - startTime);
    return NextResponse.json(
      {
        success: false,
        error: "data_processing consent is required to create a lead",
      },
      { status: 422 }
    );
  }

  // 4. We need at least one contact method
  if (!input.customerEmail && !input.customerPhone) {
    logRequest(request.method, "/api/lead", 422, Date.now() - startTime);
    return NextResponse.json(
      {
        success: false,
        error: "At least one of customerEmail or customerPhone is required",
      },
      { status: 422 }
    );
  }

  // 5. Resolve clientId from DB — for now we use slug as placeholder
  //    (full client seeding is Sprint 3; here we create lead with client lookup)
  //    In production, this will do: SELECT id FROM clients WHERE slug = ?
  //    For Sprint 1, we store slug in metadata and clientId must be pre-seeded.
  const clientId = request.headers.get("x-client-id");
  if (!clientId) {
    logRequest(request.method, "/api/lead", 400, Date.now() - startTime);
    return NextResponse.json(
      {
        success: false,
        error:
          "x-client-id header is required (UUID of the client record in DB)",
      },
      { status: 400 }
    );
  }

  // 6. Create lead
  let lead;
  try {
    lead = await createLead({
      clientId,
      source: input.source,
      customerName: input.customerName ?? null,
      customerEmail: input.customerEmail ?? null,
      customerPhone: input.customerPhone ?? null,
      rawMessage: input.rawMessage ?? null,
      language: input.language,
      gdprConsentAt: new Date(),
      gdprConsentMethod: dataProcessingConsent.method,
      metadata: input.metadata ?? null,
      status: "new",
    });
  } catch (err) {
    logger.error("Failed to create lead in DB", { error: String(err), clientId });
    logError("/api/lead", err);
    logRequest(request.method, "/api/lead", 500, Date.now() - startTime, String(err));
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }

  // 7. Write GDPR consent records to gdpr_consents table (best-effort)
  const gdprItems = input.gdprConsents.map((c) => ({
    clientId,
    leadId: lead.id,
    consentType: c.consentType,
    granted: c.granted,
    method: c.method,
    ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null,
  }));
  await createGdprConsents(gdprItems).catch((err) => {
    logger.warn("Failed to write GDPR consents", { error: String(err), leadId: lead.id });
  });

  // 8. Log the event
  const durationMs = Date.now() - startTime;
  try {
    await logEvent({
      clientId,
      leadId: lead.id,
      eventType: "lead_created",
      agentName: "system",
      inputSummary: `source=${input.source} lang=${input.language}`,
      outputSummary: `lead_id=${lead.id} status=new`,
      status: "success",
      durationMs,
      payload: { source: input.source, language: input.language },
    });
  } catch (err) {
    // Log failure should not fail the request
    logger.warn("Failed to write event log", { error: String(err), leadId: lead.id });
  }

  logger.info("Lead created", { leadId: lead.id, clientSlug: input.clientSlug, source: input.source });

  logRequest(request.method, "/api/lead", 201, Date.now() - startTime);
  return NextResponse.json(
    {
      success: true,
      leadId: lead.id,
      message: "Lead created successfully",
      redirectTo: "/booking/thank-you",
    },
    { status: 201 }
  );
}
