import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateFollowUp } from "./scheduler.js";
import { buildFollowUpPrompt } from "./prompt.js";
import {
  _setAnthropicClient,
  _resetAnthropicClient,
} from "@beauty-booking/shared";
import type { SalonConfig } from "@beauty-booking/config";

// ── Test fixtures ──────────────────────────────────────────────────────────────

const DEMO_CONFIG: SalonConfig = {
  client: {
    clientName: "Vienna Glow Studio",
    slug: "demo-salon",
    timezone: "Europe/Vienna",
    packageType: "growth",
    languages: ["de", "en", "tr"],
    defaultLanguage: "de",
    channels: { website: true, instagramDm: false, whatsapp: true, email: true },
    bookingRules: {
      allowAfterHoursLeadCapture: true,
      reminderHoursBefore: [24, 3],
      rescheduleWindowHours: 12,
      maxBookingsPerSlot: 1,
      minAdvanceBookingHours: 2,
      cancellationPolicyHours: 24,
      recoveryWaitHours: 48,
      maxFollowUpAttempts: 2,
    },
    operatingHours: {
      monday: { open: "09:00", close: "19:00" },
      tuesday: { open: "09:00", close: "19:00" },
      wednesday: { open: "09:00", close: "19:00" },
      thursday: { open: "09:00", close: "21:00" },
      friday: { open: "09:00", close: "19:00" },
      saturday: { open: "10:00", close: "17:00" },
      sunday: null,
    },
    contact: {
      phone: "+43 1 234 5678",
      email: "hello@viennaglowstudio.at",
      address: "Mariahilfer Straße 45, 1060 Wien",
    },
    gdpr: {
      dataControllerName: "Vienna Glow Studio GmbH",
      dataControllerEmail: "datenschutz@viennaglowstudio.at",
      privacyPolicyUrl: "/datenschutz",
      dataRetentionDays: 730,
      consentRequired: ["data_processing"],
      marketingConsentOptional: true,
    },
    features: {
      aiIntake: true,
      aiBooking: true,
      aiFollowUp: true,
      instagramDmFlow: false,
      recoveryFlow: true,
      multiLanguage: true,
      advancedReporting: false,
    },
  },
  services: {
    categories: [
      {
        name: "Nails",
        slug: "nails",
        services: [
          {
            id: "svc_gel_manicure",
            name: "Gel Manikür",
            nameEn: "Gel Manicure",
            duration: 60,
            priceEur: 4500,
            description: "Langanhaltende Gel-Maniküre",
            popular: true,
          },
        ],
      },
    ],
  },
  branding: {
    brandTone: {
      style: "premium, warm, direct",
      personality: "Friendly expert",
      avoid: ["too robotic", "slang"],
      allowEmojis: false,
      formalityLevel: "Sie-Form",
    },
    colors: {
      primary: "#2D2926",
      secondary: "#C9A96E",
      accent: "#E8DDD0",
      background: "#FAFAF8",
    },
    ctaTemplates: {
      de: { bookNow: "Termin buchen", contactUs: "Kontakt", learnMore: "Mehr" },
      en: { bookNow: "Book Now", contactUs: "Contact", learnMore: "Learn More" },
      tr: { bookNow: "Randevu Al", contactUs: "İletişim", learnMore: "Daha Fazla" },
    },
    messageTemplates: {
      bookingConfirmation: {
        de: "Vielen Dank, {customerName}! Ihr Termin für {serviceName} ist bestätigt.",
        en: "Thank you, {customerName}! Your appointment for {serviceName} is confirmed.",
        tr: "Teşekkürler, {customerName}! {serviceName} randevunuz onaylandı.",
      },
      reminder24h: {
        de: "Hallo {customerName}, wir möchten Sie an Ihren morgigen Termin erinnern: {serviceName} um {time}. Bis morgen!",
        en: "Hi {customerName}, reminder about your appointment tomorrow: {serviceName} at {time}. See you!",
        tr: "Merhaba {customerName}, yarınki randevunuzu hatırlatmak isteriz: {serviceName}, saat {time}.",
      },
      reminder3h: {
        de: "Ihr Termin bei Vienna Glow Studio ist heute um {time}. Wir freuen uns auf Sie!",
        en: "Your appointment at Vienna Glow Studio is today at {time}. See you soon!",
        tr: "Vienna Glow Studio randevunuz bugün saat {time}. Görüşmek üzere!",
      },
    },
  },
  prompts: {},
};

const BASE_INPUT = {
  customerName: "Maria Müller",
  customerContact: "maria@example.at",
  serviceName: "Gel Manikür",
  appointmentDate: "Montag, 14. April 2026",
  appointmentTime: "14:00",
  followUpAttempt: 1,
  language: "de" as const,
  clientId: "00000000-0000-0000-0000-000000000001",
  bookingId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  salonConfig: DEMO_CONFIG,
};

function mockClientWith(responseJson: object) {
  const message = {
    id: "msg_test",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: JSON.stringify(responseJson) }],
    model: "claude-sonnet-4-0",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 250, output_tokens: 90 },
  };
  return {
    messages: {
      create: vi.fn().mockResolvedValue(message),
    },
  } as unknown as Parameters<typeof _setAnthropicClient>[0];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("buildFollowUpPrompt", () => {
  it("includes salon name and trigger type", () => {
    const prompt = buildFollowUpPrompt(DEMO_CONFIG, {
      triggerType: "reminder_24h",
      customerName: "Maria",
      serviceName: "Gel Manikür",
      appointmentDate: "Montag, 14. April",
      appointmentTime: "14:00",
      followUpAttempt: 1,
      language: "de",
    });
    expect(prompt).toContain("Vienna Glow Studio");
    expect(prompt).toContain("reminder_24h");
  });

  it("includes maxFollowUpAttempts from config", () => {
    const prompt = buildFollowUpPrompt(DEMO_CONFIG, {
      triggerType: "no_show",
      customerName: "Maria",
      serviceName: "Gel Manikür",
      appointmentDate: "Montag, 14. April",
      appointmentTime: "14:00",
      followUpAttempt: 1,
      language: "de",
    });
    expect(prompt).toContain("2"); // maxFollowUpAttempts = 2
  });
});

describe("generateFollowUp — template-first (no AI call)", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("reminder_24h → uses DE template, no AI call, follow_up_scheduled: true", async () => {
    // Do NOT set mock client — if AI is called, it will throw
    const result = await generateFollowUp({
      ...BASE_INPUT,
      triggerType: "reminder_24h",
    });

    expect(result.success).toBe(true);
    expect(result.data?.message).toContain("Maria Müller");
    expect(result.data?.message).toContain("14:00");
    expect(result.data?.action_type).toBe("remind");
    expect(result.data?.follow_up_scheduled).toBe(true);
    expect(result.data?.next_follow_up_hours).toBe(21);
    // Template: 0 tokens used
    expect(result.tokenUsage.total).toBe(0);
  });

  it("reminder_3h → uses DE template, action_type: remind, follow_up_scheduled: false", async () => {
    const result = await generateFollowUp({
      ...BASE_INPUT,
      triggerType: "reminder_3h",
    });

    expect(result.success).toBe(true);
    expect(result.data?.message).toContain("14:00");
    expect(result.data?.action_type).toBe("remind");
    expect(result.data?.follow_up_scheduled).toBe(false);
    expect(result.data?.next_follow_up_hours).toBeNull();
    expect(result.tokenUsage.total).toBe(0);
  });

  it("reminder_24h → uses EN template when language is en", async () => {
    const result = await generateFollowUp({
      ...BASE_INPUT,
      triggerType: "reminder_24h",
      language: "en",
    });

    expect(result.success).toBe(true);
    expect(result.data?.message).toContain("Maria Müller");
    expect(result.data?.message).toContain("See you");
  });

  it("reminder_24h → uses TR template when language is tr", async () => {
    const result = await generateFollowUp({
      ...BASE_INPUT,
      triggerType: "reminder_24h",
      language: "tr",
    });

    expect(result.success).toBe(true);
    expect(result.data?.message).toContain("Maria Müller");
    expect(result.data?.message).toContain("hatırlatmak");
  });
});

describe("generateFollowUp — AI fallback (no template)", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("cancellation → calls AI, returns reschedule_offer", async () => {
    _setAnthropicClient(mockClientWith({
      message: "Wir würden uns freuen, Sie bald wieder bei uns begrüßen zu dürfen. Sollen wir einen neuen Termin vereinbaren?",
      channel: "whatsapp",
      action_type: "reschedule_offer",
      reschedule_link: null,
      follow_up_scheduled: true,
      next_follow_up_hours: 48,
    }));

    const result = await generateFollowUp({
      ...BASE_INPUT,
      triggerType: "cancellation",
    });

    expect(result.success).toBe(true);
    expect(result.data?.action_type).toBe("reschedule_offer");
    expect(result.data?.message.length).toBeGreaterThan(0);
    expect(result.tokenUsage.total).toBeGreaterThan(0); // AI was called
  });

  it("no_show → calls AI, returns winback message", async () => {
    _setAnthropicClient(mockClientWith({
      message: "Wir haben Sie heute vermisst. Wir würden uns freuen, Sie bald wieder bei uns willkommen zu heißen.",
      channel: "whatsapp",
      action_type: "winback",
      reschedule_link: null,
      follow_up_scheduled: false,
      next_follow_up_hours: null,
    }));

    const result = await generateFollowUp({
      ...BASE_INPUT,
      triggerType: "no_show",
    });

    expect(result.success).toBe(true);
    expect(result.data?.action_type).toBe("winback");
  });

  it("no_confirmation → calls AI, returns confirm_request", async () => {
    _setAnthropicClient(mockClientWith({
      message: "Bitte bestätigen Sie Ihren Termin für Gel Manikür morgen um 14:00.",
      channel: "whatsapp",
      action_type: "confirm_request",
      reschedule_link: null,
      follow_up_scheduled: true,
      next_follow_up_hours: 2,
    }));

    const result = await generateFollowUp({
      ...BASE_INPUT,
      triggerType: "no_confirmation",
    });

    expect(result.success).toBe(true);
    expect(result.data?.action_type).toBe("confirm_request");
    expect(result.data?.follow_up_scheduled).toBe(true);
  });
});

describe("generateFollowUp — max attempts guard", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("followUpAttempt > maxFollowUpAttempts → follow_up_scheduled: false, no AI call", async () => {
    // maxFollowUpAttempts = 2, attempt = 3 → should stop immediately
    const result = await generateFollowUp({
      ...BASE_INPUT,
      triggerType: "cancellation",
      followUpAttempt: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.follow_up_scheduled).toBe(false);
    expect(result.data?.next_follow_up_hours).toBeNull();
    expect(result.tokenUsage.total).toBe(0); // no AI call
  });

  it("followUpAttempt exactly at maxFollowUpAttempts → still runs (> check, not >=)", async () => {
    // attempt = 2, max = 2 → should still attempt (>2 would stop, =2 is last attempt)
    _setAnthropicClient(mockClientWith({
      message: "Letzte Erinnerung.",
      channel: "whatsapp",
      action_type: "winback",
      reschedule_link: null,
      follow_up_scheduled: false,
      next_follow_up_hours: null,
    }));

    const result = await generateFollowUp({
      ...BASE_INPUT,
      triggerType: "no_show",
      followUpAttempt: 2,
    });

    expect(result.success).toBe(true);
    // AI was called (attempt 2 = last allowed attempt)
    expect(result.tokenUsage.total).toBeGreaterThan(0);
  });

  it("returns failure gracefully when AI errors — does not throw", async () => {
    _setAnthropicClient({
      messages: {
        create: vi.fn().mockRejectedValue(new Error("API timeout")),
      },
    } as unknown as Parameters<typeof _setAnthropicClient>[0]);

    const result = await generateFollowUp({
      ...BASE_INPUT,
      triggerType: "no_show",
    });

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/API timeout/);
  });
});
