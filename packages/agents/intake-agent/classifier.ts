import { z } from "zod";
import { callAgent, type AgentCallResult } from "@beauty-booking/shared";
import type { SalonConfig } from "@beauty-booking/config";
import { buildIntakePrompt } from "./prompt.js";

// ── Output schema ─────────────────────────────────────────────────────────────

export const IntakeOutputSchema = z.object({
  intent: z.enum([
    "new_booking",
    "price_inquiry",
    "service_info",
    "existing_booking_change",
    "complaint",
    "unclear",
  ]),
  confidence: z.number().min(0).max(1),
  needs_human_review: z.boolean(),
  next_step: z.string().min(1),
  summary: z.string().max(300),
  detected_service: z.string().nullable(),
  language: z.enum(["de", "en", "tr"]),
});

export type IntakeOutput = z.infer<typeof IntakeOutputSchema>;

// ── Input ─────────────────────────────────────────────────────────────────────

export interface ClassifyInput {
  customerMessage: string;
  channel: "web_form" | "instagram_dm" | "whatsapp" | "email" | "phone" | "walk_in";
  clientId: string;
  leadId: string;
  salonConfig: SalonConfig;
}

// ── Classifier ────────────────────────────────────────────────────────────────

/**
 * Classifies a customer message using the Intake Agent.
 * Always returns a result — never throws. Check result.success.
 */
export async function classify(
  input: ClassifyInput
): Promise<AgentCallResult<IntakeOutput>> {
  const systemPrompt = buildIntakePrompt(input.salonConfig);

  const userMessage = `CHANNEL: ${input.channel}
CUSTOMER MESSAGE:
${input.customerMessage}`;

  return callAgent<IntakeOutput>({
    systemPrompt,
    userMessage,
    outputSchema: IntakeOutputSchema,
    clientId: input.clientId,
    agentName: "intake-agent",
    maxTokens: 512,
  });
}
