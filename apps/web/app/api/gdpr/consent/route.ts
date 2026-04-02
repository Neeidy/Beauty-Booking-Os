import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGdprConsents } from "@beauty-booking/db/queries/gdpr-consents";
import { logger } from "@beauty-booking/shared";

const ConsentItemSchema = z.object({
  consentType: z.enum(["data_processing", "marketing", "reminder_messages"]),
  granted: z.boolean(),
  method: z.enum(["web_form_checkbox", "whatsapp_reply", "verbal"]),
  consentText: z.string().max(1000).optional(),
});

const RequestBodySchema = z.object({
  clientId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  consents: z.array(ConsentItemSchema).min(1).max(10),
});

export async function POST(request: NextRequest) {
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

  const { clientId, leadId, consents } = parsed.data;
  const ipAddress =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    null;

  try {
    const created = await createGdprConsents(
      consents.map((c) => ({
        clientId,
        leadId: leadId ?? null,
        consentType: c.consentType,
        granted: c.granted,
        method: c.method,
        ipAddress,
        consentText: c.consentText ?? null,
      }))
    );

    return NextResponse.json(
      { success: true, created: created.length },
      { status: 201 }
    );
  } catch (err) {
    logger.error("Failed to create GDPR consents", { error: String(err), clientId });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
