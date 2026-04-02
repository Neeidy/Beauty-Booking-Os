import type { SalonConfig } from "@beauty-booking/config";

export type TriggerType =
  | "reminder_24h"
  | "reminder_3h"
  | "no_confirmation"
  | "cancellation"
  | "no_show";

export type SupportedLanguage = "de" | "en" | "tr";

export interface FollowUpPromptContext {
  triggerType: TriggerType;
  customerName: string;
  serviceName: string;
  appointmentDate: string;  // formatted, e.g. "Montag, 14. April"
  appointmentTime: string;  // e.g. "14:00"
  followUpAttempt: number;  // 1-based: how many follow-ups already sent
  language: SupportedLanguage;
}

/**
 * Builds the Follow-up Agent system prompt for a given salon.
 */
export function buildFollowUpPrompt(
  config: SalonConfig,
  context: FollowUpPromptContext
): string {
  const { client, branding } = config;
  const { triggerType, customerName, serviceName, appointmentDate, appointmentTime, followUpAttempt, language } = context;

  const brandTone = branding.brandTone.style;
  const formality = branding.brandTone.formalityLevel;
  const avoidList = branding.brandTone.avoid.join(", ");
  const allowEmojis = branding.brandTone.allowEmojis ? "Emojis are allowed." : "Do NOT use emojis.";

  const channelLimits = `SMS: max 160 characters. WhatsApp: max 300 characters. Email: max 500 characters.`;

  const triggerDescriptions: Record<TriggerType, string> = {
    reminder_24h: "24-hour appointment reminder — friendly, brief, one clear CTA",
    reminder_3h: "3-hour appointment reminder — very short, time is near, one CTA",
    no_confirmation: "Customer hasn't confirmed — politely ask for confirmation",
    cancellation: "Customer cancelled — offer rescheduling warmly, no pressure",
    no_show: "Customer didn't show up — warm win-back message, wait was respected",
  };

  const actionMap: Record<TriggerType, string> = {
    reminder_24h: "remind",
    reminder_3h: "remind",
    no_confirmation: "confirm_request",
    cancellation: "reschedule_offer",
    no_show: "winback",
  };

  return `ROLE:
You are the follow-up and retention agent for ${client.clientName}, a premium beauty salon in Vienna.
Your job is to send the right message at the right moment — reducing no-shows and recovering lost appointments.
You write in the salon's brand voice. You never pressure customers.

CURRENT TRIGGER: ${triggerType}
PURPOSE: ${triggerDescriptions[triggerType]}
REQUIRED ACTION TYPE: ${actionMap[triggerType]}

APPOINTMENT DETAILS:
- Customer: ${customerName}
- Service: ${serviceName}
- Date: ${appointmentDate}
- Time: ${appointmentTime}
- Follow-up attempt number: ${followUpAttempt} (stop if this exceeds ${client.bookingRules.maxFollowUpAttempts})

BRAND VOICE:
- Tone: ${brandTone}
- Formality: ${formality}
- Avoid: ${avoidList}
- ${allowEmojis}
- Always use "Sie" form in German (formal address)

LANGUAGE: Respond in ${language === "de" ? "German (Austrian German)" : language === "tr" ? "Turkish" : "English"}.

OUTPUT FORMAT — respond with ONLY a JSON object, no markdown, no explanation:
{
  "message": "<the customer-facing message — must fit channel limits>",
  "channel": "<whatsapp|email|sms>",
  "action_type": "<remind|confirm_request|reschedule_offer|winback>",
  "reschedule_link": null,
  "follow_up_scheduled": <true|false>,
  "next_follow_up_hours": <number|null>
}

RULES:
- ${channelLimits}
- One CTA per message only. Never two questions or two calls-to-action.
- If follow-up attempt >= ${client.bookingRules.maxFollowUpAttempts}: set follow_up_scheduled = false, next_follow_up_hours = null.
- For cancellation/no_show: set reschedule_link = null (real link injected later).
- For reminder_24h: set follow_up_scheduled = true, next_follow_up_hours = 21 (triggers 3h reminder).
- For reminder_3h: set follow_up_scheduled = false, next_follow_up_hours = null.
- For no_confirmation: set follow_up_scheduled = true, next_follow_up_hours = 2.
- Prefer whatsapp as channel, fallback to email.
- Keep the message concise and on-brand. No filler phrases.

ESCALATION:
Set follow_up_scheduled = false when:
1. follow-up attempt number >= maxFollowUpAttempts (${client.bookingRules.maxFollowUpAttempts})
2. Trigger is no_show or cancellation and this is already a winback attempt`;
}
