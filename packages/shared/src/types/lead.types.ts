import { z } from "zod";

export const createLeadInputSchema = z.object({
  clientSlug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  source: z.enum([
    "web_form",
    "instagram_dm",
    "whatsapp",
    "email",
    "phone",
    "walk_in",
  ]),
  customerName: z.string().min(1).max(100).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(5).max(30).optional(),
  rawMessage: z.string().max(2000).optional(),
  language: z.enum(["de", "en", "tr"]).default("de"),
  gdprConsents: z
    .array(
      z.object({
        consentType: z.enum([
          "data_processing",
          "reminder_messages",
          "marketing",
        ]),
        granted: z.boolean(),
        method: z.enum(["web_form", "whatsapp_reply", "verbal"]),
        consentText: z.string().max(1000).optional(),
        ipAddress: z.string().ip().optional(),
      })
    )
    .min(1, "At least one GDPR consent entry is required"),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;

export const createLeadResponseSchema = z.object({
  success: z.boolean(),
  leadId: z.string().uuid(),
  message: z.string(),
});

export type CreateLeadResponse = z.infer<typeof createLeadResponseSchema>;
