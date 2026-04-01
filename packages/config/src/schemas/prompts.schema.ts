import { z } from "zod";

// Optional per-salon prompt overrides (advanced — most salons use defaults)
export const promptsConfigSchema = z
  .object({
    intakeAgent: z
      .object({
        roleOverride: z.string().optional(),
        additionalInstructions: z.string().optional(),
      })
      .optional(),
    bookingAgent: z
      .object({
        roleOverride: z.string().optional(),
        additionalInstructions: z.string().optional(),
      })
      .optional(),
    followupAgent: z
      .object({
        roleOverride: z.string().optional(),
        additionalInstructions: z.string().optional(),
      })
      .optional(),
    contentAgent: z
      .object({
        roleOverride: z.string().optional(),
        additionalInstructions: z.string().optional(),
      })
      .optional(),
  })
  .default({});

export type PromptsConfig = z.infer<typeof promptsConfigSchema>;
