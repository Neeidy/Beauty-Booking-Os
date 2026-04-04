import type { SalonConfig } from "@beauty-booking/config";

export type MessagePurpose =
  | "booking_confirmation"
  | "reminder"
  | "winback"
  | "dm_reply"
  | "campaign";

export type SupportedLanguage = "de" | "en" | "tr";

export interface ContentPromptContext {
  purpose: MessagePurpose;
  language: SupportedLanguage;
  context: Record<string, string>;
  maxLength?: number;
}

const PURPOSE_DESCRIPTIONS: Record<MessagePurpose, string> = {
  booking_confirmation: "Confirm a new appointment — warm, reassuring, include key details",
  reminder: "Remind customer of upcoming appointment — brief, friendly, one CTA",
  winback: "Re-engage a customer who cancelled or no-showed — warm, no pressure, gentle invitation",
  dm_reply: "Reply to a customer DM or inquiry — helpful, on-brand, clear next step",
  campaign: "Write a promotional message — engaging, on-brand, single clear offer",
};

/**
 * Builds the Content Agent system prompt for a given salon config.
 */
export function buildContentPrompt(
  config: SalonConfig,
  ctx: ContentPromptContext
): string {
  const { client, branding } = config;
  const { brandTone } = branding;

  const formality = brandTone.formalityLevel;
  const avoidList = brandTone.avoid.join(", ");
  const emojiRule = brandTone.allowEmojis
    ? "Emojis are allowed — use sparingly for warmth."
    : "Do NOT use emojis under any circumstances.";

  const maxLen = ctx.maxLength ?? 300;

  const contextLines = Object.entries(ctx.context)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const langLabel =
    ctx.language === "de"
      ? "German (Austrian German, use Austrian conventions)"
      : ctx.language === "tr"
      ? "Turkish"
      : "English";

  return `ROLE:
You are the brand voice writer for ${client.clientName}, a beauty salon in Vienna, Austria.
Your sole job is to write one customer-facing message that is perfectly on-brand.

PURPOSE: ${ctx.purpose}
DESCRIPTION: ${PURPOSE_DESCRIPTIONS[ctx.purpose]}
LANGUAGE: ${langLabel}

BRAND VOICE:
- Style: ${brandTone.style}
- Personality: ${brandTone.personality}
- Formality: ${formality}${formality === "Sie-Form" ? " — ALWAYS use 'Sie' (formal 'you') in German. Never 'du'." : " — ALWAYS use 'du' (informal 'you') in German. Never 'Sie'."}
- Avoid these words/patterns: ${avoidList}
- ${emojiRule}

CONTEXT DATA (use where appropriate):
${contextLines || "(no extra context provided)"}

SALON DETAILS:
- Name: ${client.clientName}
- Phone: ${client.contact.phone}
- Email: ${client.contact.email}

OUTPUT — respond with ONLY a JSON object, no markdown, no explanation:
{
  "message": "<the complete customer-facing message — max ${maxLen} characters>",
  "tone_check": "<on_brand|needs_review>",
  "language": "${ctx.language}",
  "character_count": <number>
}

RULES:
- Message MUST be under ${maxLen} characters.
- character_count MUST match the actual length of message.
- tone_check = "needs_review" if: message contains forbidden words, wrong formality level, or emojis when allowEmojis is false.
- tone_check = "on_brand" if everything looks correct.
- Do NOT invent prices or services not mentioned in context.
- Do NOT add legal disclaimers.
- One clear call-to-action maximum. No double CTAs.
- For ${ctx.language === "de" ? "German: use 'Sehr geehrte/r' or 'Guten Tag' as appropriate for " + formality : ctx.language === "tr" ? "Turkish: use appropriate formal/informal address" : "English: keep it warm and professional"}.

ESCALATION:
Set tone_check = "needs_review" if you are not confident the message matches the brand perfectly.`;
}
