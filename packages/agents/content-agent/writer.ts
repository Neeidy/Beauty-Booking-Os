import { z } from "zod";
import { callAgent, type AgentCallResult } from "@beauty-booking/shared";
import type { SalonConfig } from "@beauty-booking/config";
import { buildContentPrompt, type MessagePurpose, type SupportedLanguage } from "./prompt.js";

// ── Output schema ─────────────────────────────────────────────────────────────

export const ContentOutputSchema = z.object({
  message: z.string().min(1),
  tone_check: z.enum(["on_brand", "needs_review"]),
  language: z.enum(["de", "en", "tr"]),
  character_count: z.number().int().nonnegative(),
});

export type ContentOutput = z.infer<typeof ContentOutputSchema>;

// ── Input ─────────────────────────────────────────────────────────────────────

export interface GenerateMessageOptions {
  purpose: MessagePurpose;
  language: SupportedLanguage;
  context: Record<string, string>;
  clientConfig: SalonConfig;
  maxLength?: number;
}

// ── Post-processing brand guard ───────────────────────────────────────────────

/**
 * Runs client-side brand rule checks after AI output.
 * Returns "needs_review" if violations are found.
 */
function runBrandGuard(
  output: ContentOutput,
  config: SalonConfig
): ContentOutput {
  const { brandTone } = config.branding;
  let needsReview = output.tone_check === "needs_review";

  // Emoji check — use Extended_Pictographic to avoid matching digits/symbols
  if (!brandTone.allowEmojis && /\p{Extended_Pictographic}/u.test(output.message)) {
    needsReview = true;
  }

  // Avoid-list check
  for (const word of brandTone.avoid) {
    if (output.message.toLowerCase().includes(word.toLowerCase())) {
      needsReview = true;
      break;
    }
  }

  // Formality check for German
  if (output.language === "de") {
    if (brandTone.formalityLevel === "Sie-Form" && /\bdu\b|\bdir\b|\bdich\b|\bdein/i.test(output.message)) {
      needsReview = true;
    }
    if (brandTone.formalityLevel === "Du-Form" && /\bSie\b|\bIhnen\b|\bIhr\b/.test(output.message)) {
      needsReview = true;
    }
  }

  // Ensure character_count matches actual length
  const actualCount = output.message.length;

  return {
    ...output,
    tone_check: needsReview ? "needs_review" : "on_brand",
    character_count: actualCount,
  };
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Generates a customer-facing message in the salon's brand voice.
 * Always returns a result — never throws. Check result.success.
 */
export async function generateMessage(
  options: GenerateMessageOptions
): Promise<AgentCallResult<ContentOutput>> {
  const { purpose, language, context, clientConfig, maxLength } = options;

  const systemPrompt = buildContentPrompt(clientConfig, { purpose, language, context, ...(maxLength !== undefined ? { maxLength } : {}) });
  const userMessage = `Write a ${purpose} message in ${language} for ${clientConfig.client.clientName}.`;

  const result = await callAgent<ContentOutput>({
    systemPrompt,
    userMessage,
    outputSchema: ContentOutputSchema,
    clientId: clientConfig.client.slug,
    agentName: "content-agent",
    maxTokens: 512,
  });

  if (!result.success || !result.data) {
    return result;
  }

  // Apply client-side brand guard as a second pass
  const guarded = runBrandGuard(result.data, clientConfig);

  return { ...result, data: guarded };
}
