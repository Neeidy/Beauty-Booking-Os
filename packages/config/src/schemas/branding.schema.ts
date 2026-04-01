import { z } from "zod";

const languageTemplatesSchema = z.object({
  de: z.string().min(1),
  en: z.string().min(1),
  tr: z.string().min(1),
});

export const brandingConfigSchema = z.object({
  brandTone: z.object({
    style: z.string().min(1),
    personality: z.string().min(1),
    avoid: z.array(z.string()),
    allowEmojis: z.boolean(),
    formalityLevel: z.string().min(1),
  }),
  colors: z.object({
    primary: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid hex color"),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  ctaTemplates: z.object({
    de: z.object({
      bookNow: z.string().min(1),
      contactUs: z.string().min(1),
      learnMore: z.string().min(1),
    }),
    en: z.object({
      bookNow: z.string().min(1),
      contactUs: z.string().min(1),
      learnMore: z.string().min(1),
    }),
    tr: z.object({
      bookNow: z.string().min(1),
      contactUs: z.string().min(1),
      learnMore: z.string().min(1),
    }),
  }),
  messageTemplates: z.object({
    bookingConfirmation: languageTemplatesSchema,
    reminder24h: languageTemplatesSchema,
    reminder3h: languageTemplatesSchema,
  }),
});

export type BrandingConfig = z.infer<typeof brandingConfigSchema>;
