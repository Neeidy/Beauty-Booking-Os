import { z } from "zod";
import { callAgent, type AgentCallResult } from "@beauty-booking/shared";
import type { SalonConfig } from "@beauty-booking/config";
import { generateMessage } from "@beauty-booking/content-agent";
import {
  buildFollowUpPrompt,
  type TriggerType,
  type SupportedLanguage,
  type FollowUpPromptContext,
} from "./prompt.js";

// ── Output schema ─────────────────────────────────────────────────────────────

export const FollowUpOutputSchema = z.object({
  message: z.string().min(1).max(500),
  channel: z.enum(["whatsapp", "email", "sms"]),
  action_type: z.enum(["remind", "confirm_request", "reschedule_offer", "winback"]),
  reschedule_link: z.string().nullable(),
  follow_up_scheduled: z.boolean(),
  next_follow_up_hours: z.number().nullable(),
});

export type FollowUpOutput = z.infer<typeof FollowUpOutputSchema>;

// ── Input ─────────────────────────────────────────────────────────────────────

export interface GenerateFollowUpInput {
  triggerType: TriggerType;
  customerName: string;
  customerContact: string;    // email or phone — used to pick channel
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  followUpAttempt: number;    // 1-based
  language: SupportedLanguage;
  clientId: string;
  bookingId: string;
  salonConfig: SalonConfig;
}

// ── Template-first resolution ─────────────────────────────────────────────────

/**
 * Attempts to build a message from branding.json templates.
 * Returns null if no template matches (caller should fall back to AI).
 */
function resolveTemplate(
  input: GenerateFollowUpInput
): FollowUpOutput | null {
  const { triggerType, language, salonConfig, customerName, serviceName, appointmentTime, followUpAttempt } = input;
  const { branding, client } = salonConfig;
  const templates = branding.messageTemplates;
  const maxAttempts = client.bookingRules.maxFollowUpAttempts;

  let rawTemplate: string | null = null;

  if (triggerType === "reminder_24h") {
    rawTemplate = templates.reminder24h[language] ?? templates.reminder24h.de ?? null;
  } else if (triggerType === "reminder_3h") {
    rawTemplate = templates.reminder3h[language] ?? templates.reminder3h.de ?? null;
  }

  if (!rawTemplate) return null;

  // Fill placeholders
  const message = rawTemplate
    .replace(/{customerName}/g, customerName)
    .replace(/{serviceName}/g, serviceName)
    .replace(/{time}/g, appointmentTime)
    .replace(/{salonName}/g, client.clientName);

  const isLastAttempt = followUpAttempt >= maxAttempts;

  return {
    message,
    channel: "whatsapp",
    action_type: "remind",
    reschedule_link: null,
    follow_up_scheduled: triggerType === "reminder_24h" && !isLastAttempt,
    next_follow_up_hours: triggerType === "reminder_24h" && !isLastAttempt ? 21 : null,
  };
}

// ── Max attempts guard ────────────────────────────────────────────────────────

function buildStopResult(): FollowUpOutput {
  return {
    message: "",
    channel: "whatsapp",
    action_type: "remind",
    reschedule_link: null,
    follow_up_scheduled: false,
    next_follow_up_hours: null,
  };
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Generates a follow-up message for a booking event.
 *
 * Strategy:
 * 1. If max follow-up attempts reached → return stop result (no AI call)
 * 2. If branding template exists for this trigger → use template (no AI call)
 * 3. Otherwise → call AI agent to generate message
 *
 * Always returns a result — never throws. Check result.success.
 */
export async function generateFollowUp(
  input: GenerateFollowUpInput
): Promise<AgentCallResult<FollowUpOutput>> {
  const { salonConfig, triggerType, followUpAttempt, clientId } = input;
  const maxAttempts = salonConfig.client.bookingRules.maxFollowUpAttempts;

  // 1. Max attempts check — return immediately without any AI call
  if (followUpAttempt > maxAttempts) {
    return {
      success: true,
      data: buildStopResult(),
      error: null,
      tokenUsage: { input: 0, output: 0, total: 0 },
      durationMs: 0,
      retryCount: 0,
    };
  }

  // 2. Template-first: try to resolve from branding config
  const templateResult = resolveTemplate(input);
  if (templateResult) {
    return {
      success: true,
      data: templateResult,
      error: null,
      tokenUsage: { input: 0, output: 0, total: 0 },
      durationMs: 0,
      retryCount: 0,
    };
  }

  // 3. Content Agent for winback/recovery triggers — uses brand voice writer
  const CONTENT_AGENT_TRIGGERS: TriggerType[] = ["cancellation", "no_show", "no_confirmation"];

  if (CONTENT_AGENT_TRIGGERS.includes(triggerType)) {
    const purposeMap: Record<string, "winback" | "dm_reply"> = {
      cancellation: "winback",
      no_show: "winback",
      no_confirmation: "dm_reply",
    };
    const purpose = purposeMap[triggerType] ?? "winback";

    const contentResult = await generateMessage({
      purpose,
      language: input.language,
      context: {
        customerName: input.customerName,
        serviceName: input.serviceName,
        date: input.appointmentDate,
        time: input.appointmentTime,
      },
      clientConfig: salonConfig,
      maxLength: 300,
    });

    if (!contentResult.success || !contentResult.data) {
      return {
        success: false,
        data: null,
        error: contentResult.error ?? "Content Agent failed",
        tokenUsage: contentResult.tokenUsage,
        durationMs: contentResult.durationMs,
        retryCount: contentResult.retryCount,
      };
    }

    const actionTypeMap: Record<string, FollowUpOutput["action_type"]> = {
      cancellation: "reschedule_offer",
      no_show: "winback",
      no_confirmation: "confirm_request",
    };

    const isLastAttempt = followUpAttempt >= salonConfig.client.bookingRules.maxFollowUpAttempts;

    return {
      success: true,
      data: {
        message: contentResult.data.message,
        channel: "whatsapp",
        action_type: actionTypeMap[triggerType] ?? "winback",
        reschedule_link: null,
        follow_up_scheduled: !isLastAttempt,
        next_follow_up_hours: isLastAttempt ? null : 48,
      },
      error: null,
      tokenUsage: contentResult.tokenUsage,
      durationMs: contentResult.durationMs,
      retryCount: contentResult.retryCount,
    };
  }

  // 4. Fallback for any other trigger type — call Follow-up Agent directly
  const context: FollowUpPromptContext = {
    triggerType,
    customerName: input.customerName,
    serviceName: input.serviceName,
    appointmentDate: input.appointmentDate,
    appointmentTime: input.appointmentTime,
    followUpAttempt,
    language: input.language,
  };

  const systemPrompt = buildFollowUpPrompt(salonConfig, context);
  const userMessage = `Generate a ${triggerType} message for ${input.customerName} (attempt ${followUpAttempt}).`;

  return callAgent<FollowUpOutput>({
    systemPrompt,
    userMessage,
    outputSchema: FollowUpOutputSchema,
    clientId,
    agentName: "followup-agent",
    maxTokens: 512,
  });
}
