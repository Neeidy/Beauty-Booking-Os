import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format");

const operatingDaySchema = z
  .object({
    open: timeSchema,
    close: timeSchema,
  })
  .nullable();

export const clientConfigSchema = z.object({
  clientName: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  timezone: z.string().min(1).default("Europe/Vienna"),
  packageType: z.enum(["starter", "growth", "premium"]),
  languages: z.array(z.enum(["de", "en", "tr"])).min(1),
  defaultLanguage: z.enum(["de", "en", "tr"]),
  channels: z.object({
    website: z.boolean(),
    instagramDm: z.boolean(),
    whatsapp: z.boolean(),
    email: z.boolean(),
  }),
  bookingRules: z.object({
    allowAfterHoursLeadCapture: z.boolean(),
    reminderHoursBefore: z.array(z.number().positive()).min(1),
    rescheduleWindowHours: z.number().positive(),
    maxBookingsPerSlot: z.number().positive().int(),
    minAdvanceBookingHours: z.number().nonnegative(),
    cancellationPolicyHours: z.number().nonnegative(),
    recoveryWaitHours: z.number().positive(),
    maxFollowUpAttempts: z.number().positive().int().max(5),
  }),
  operatingHours: z.object({
    monday: operatingDaySchema,
    tuesday: operatingDaySchema,
    wednesday: operatingDaySchema,
    thursday: operatingDaySchema,
    friday: operatingDaySchema,
    saturday: operatingDaySchema,
    sunday: operatingDaySchema,
  }),
  contact: z.object({
    phone: z.string().min(1),
    email: z.string().email(),
    address: z.string().min(1),
    instagramHandle: z.string().optional(),
    whatsappNumber: z.string().optional(),
    googleMapsUrl: z.string().url().optional(),
  }),
  gdpr: z.object({
    dataControllerName: z.string().min(1),
    dataControllerEmail: z.string().email(),
    privacyPolicyUrl: z.string().min(1),
    dataRetentionDays: z.number().positive().int(),
    consentRequired: z.array(z.string()).min(1),
    marketingConsentOptional: z.boolean(),
  }),
  features: z.object({
    aiIntake: z.boolean(),
    aiBooking: z.boolean(),
    aiFollowUp: z.boolean(),
    instagramDmFlow: z.boolean(),
    recoveryFlow: z.boolean(),
    multiLanguage: z.boolean(),
    advancedReporting: z.boolean(),
  }),
});

export type ClientConfig = z.infer<typeof clientConfigSchema>;
