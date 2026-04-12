import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type ClientConfig = {
  clientName: string;
  slug: string;
  timezone: string;
  packageType: "starter" | "growth" | "premium";
  languages: string[];
  defaultLanguage: string;
  channels: {
    website: boolean;
    instagramDm: boolean;
    whatsapp: boolean;
    email: boolean;
  };
  bookingRules: {
    allowAfterHoursLeadCapture: boolean;
    reminderHoursBefore: number[];
    rescheduleWindowHours: number;
    maxBookingsPerSlot: number;
    minAdvanceBookingHours: number;
    cancellationPolicyHours: number;
    recoveryWaitHours: number;
    maxFollowUpAttempts: number;
  };
  operatingHours: {
    [day: string]: { open: string; close: string } | null;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
    // Optional — only present in Growth/Premium packages:
    instagramHandle?: string;
    whatsappNumber?: string;
    googleMapsUrl?: string;
  };
  gdpr: {
    dataControllerName: string;
    dataControllerEmail: string;
    privacyPolicyUrl: string;
    dataRetentionDays: number;
    consentRequired: string[];
    marketingConsentOptional: boolean;
  };
  features: {
    aiIntake: boolean;
    aiBooking: boolean;
    aiFollowUp: boolean;
    instagramDmFlow: boolean;
    recoveryFlow: boolean;
    multiLanguage: boolean;
    advancedReporting: boolean;
  };
  googleBusiness?: {
    profileUrl?: string;
    bookingButtonText?: Record<string, string>;
    reviewUrl?: string;
  };
  rebookingWeeks?: number; // Default 4, runtime'da clamp(2, 12) uygulanır
};

/**
 * Reads clients/{slug}/client.config.json synchronously and returns a typed ClientConfig.
 * Path is resolved relative to the monorepo root (two levels above apps/web/), mirroring loadBranding().
 * Runs at build time / in server components — not in the browser.
 */
export function loadClientConfig(slug?: string): ClientConfig {
  const resolvedSlug =
    slug ??
    process.env["NEXT_PUBLIC_DEFAULT_CLIENT_SLUG"] ??
    "demo-salon";

  // Mirrors loadBranding() path convention: cwd = apps/web/, so ../../ = monorepo root
  const configPath = resolve(
    process.cwd(),
    "..",
    "..",
    "clients",
    resolvedSlug,
    "client.config.json"
  );

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as ClientConfig;

    // Minimal sanity checks — guards against missing critical fields
    // that would crash components downstream.
    if (!parsed.clientName || typeof parsed.clientName !== "string") {
      throw new Error(`Invalid client.config.json at ${configPath}: missing clientName`);
    }
    if (!parsed.contact?.phone || !parsed.contact?.email) {
      throw new Error(`Invalid client.config.json at ${configPath}: missing contact info`);
    }

    return parsed;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(
        `Failed to load client config for slug "${resolvedSlug}": ${err.message}`
      );
    }
    throw err;
  }
}
