import { z } from "zod";

export const agentMessageSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  source_agent: z.enum([
    "orchestrator",
    "intake-agent",
    "booking-agent",
    "followup-agent",
    "content-agent",
    "system",
  ]),
  target_agent: z.enum([
    "orchestrator",
    "intake-agent",
    "booking-agent",
    "followup-agent",
    "content-agent",
    "human",
  ]),
  client_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  event_type: z.string().min(1),
  payload: z.record(z.unknown()),
  metadata: z.object({
    confidence: z.number().min(0).max(1).optional(),
    requires_human: z.boolean().optional(),
    language: z.enum(["de", "en", "tr"]).optional(),
  }),
});

export type AgentMessage = z.infer<typeof agentMessageSchema>;

export const intakeOutputSchema = z.object({
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

export type IntakeOutput = z.infer<typeof intakeOutputSchema>;

export const bookingOutputSchema = z.object({
  booking_stage: z.enum([
    "collecting_info",
    "confirming_service",
    "proposing_time",
    "ready_to_book",
    "needs_human",
  ]),
  required_fields: z.array(z.string()),
  customer_message: z.string().min(1),
  action: z.enum([
    "ask_question",
    "propose_service",
    "create_booking",
    "escalate",
  ]),
  suggested_service_id: z.string().nullable(),
});

export type BookingOutput = z.infer<typeof bookingOutputSchema>;

export const followupOutputSchema = z.object({
  message: z.string().min(1),
  channel: z.enum(["whatsapp", "email", "sms"]),
  action_type: z.enum([
    "remind",
    "confirm_request",
    "reschedule_offer",
    "winback",
  ]),
  reschedule_link: z.string().url().nullable(),
  follow_up_scheduled: z.boolean(),
  next_follow_up_hours: z.number().positive().nullable(),
});

export type FollowupOutput = z.infer<typeof followupOutputSchema>;

export const contentOutputSchema = z.object({
  message: z.string().min(1),
  tone_check: z.enum(["on_brand", "needs_review"]),
  language: z.enum(["de", "en", "tr"]),
  character_count: z.number().nonnegative().int(),
});

export type ContentOutput = z.infer<typeof contentOutputSchema>;
