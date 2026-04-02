import { z } from "zod";
import { callAgent, type AgentCallResult } from "@beauty-booking/shared";
import type { SalonConfig } from "@beauty-booking/config";
import type { IntakeOutput } from "../intake-agent/index.js";
import { buildBookingPrompt } from "./prompt.js";

// ── Output schema ─────────────────────────────────────────────────────────────

export const BookingOutputSchema = z.object({
  booking_stage: z.enum([
    "collecting_info",
    "confirming_service",
    "proposing_time",
    "ready_to_book",
    "needs_human",
  ]),
  required_fields: z.array(z.string()),
  customer_message: z.string().min(1).max(1000),
  action: z.enum([
    "ask_question",
    "propose_service",
    "create_booking",
    "escalate",
  ]),
  suggested_service_id: z.string().nullable(),
});

export type BookingOutput = z.infer<typeof BookingOutputSchema>;

// ── Input ─────────────────────────────────────────────────────────────────────

export interface NextStepInput {
  intakeResult: IntakeOutput;
  customerMessage: string;
  customerHistory: string; // Full conversation so far (formatted text)
  conversationRound: number;
  clientId: string;
  leadId: string;
  salonConfig: SalonConfig;
}

// ── Flow ──────────────────────────────────────────────────────────────────────

/**
 * Determines the next booking step for a customer.
 * Always returns a result — never throws. Check result.success.
 */
export async function nextStep(
  input: NextStepInput
): Promise<AgentCallResult<BookingOutput>> {
  const systemPrompt = buildBookingPrompt(input.salonConfig);

  const userMessage = [
    `CLASSIFIED INTENT: ${input.intakeResult.intent}`,
    input.intakeResult.detected_service
      ? `DETECTED SERVICE: ${input.intakeResult.detected_service}`
      : "DETECTED SERVICE: none",
    `CONVERSATION ROUND: ${input.conversationRound}`,
    `CUSTOMER LANGUAGE: ${input.intakeResult.language}`,
    "",
    "CONVERSATION HISTORY:",
    input.customerHistory || "(no prior messages)",
    "",
    "LATEST CUSTOMER MESSAGE:",
    input.customerMessage,
  ].join("\n");

  return callAgent<BookingOutput>({
    systemPrompt,
    userMessage,
    outputSchema: BookingOutputSchema,
    clientId: input.clientId,
    agentName: "booking-agent",
    maxTokens: 512,
  });
}
