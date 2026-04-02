import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { classify } from "./classifier.js";
import { buildIntakePrompt } from "./prompt.js";
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
      consentRequired: ["data_processing", "reminder_messages"],
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
          {
            id: "svc_hydrafacial",
            name: "HydraFacial Classic",
            nameEn: "HydraFacial Classic",
            duration: 45,
            priceEur: 8900,
            description: "Tiefenreinigung",
            popular: true,
          },
        ],
      },
    ],
  },
  branding: {
    brandTone: {
      style: "premium, warm",
      personality: "Friendly expert",
      avoid: ["robotic"],
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
        de: "Bestätigt: {customerName}",
        en: "Confirmed: {customerName}",
        tr: "Onaylandı: {customerName}",
      },
      reminder24h: {
        de: "Morgen: {customerName}",
        en: "Tomorrow: {customerName}",
        tr: "Yarın: {customerName}",
      },
      reminder3h: {
        de: "Heute: {time}",
        en: "Today: {time}",
        tr: "Bugün: {time}",
      },
    },
  },
  prompts: {},
};

const BASE_INPUT = {
  channel: "web_form" as const,
  clientId: "00000000-0000-0000-0000-000000000001",
  leadId: "11111111-1111-1111-1111-111111111111",
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
    usage: { input_tokens: 200, output_tokens: 80 },
  };
  return {
    messages: {
      create: vi.fn().mockResolvedValue(message),
    },
  } as unknown as Parameters<typeof _setAnthropicClient>[0];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("buildIntakePrompt", () => {
  it("includes salon name", () => {
    const prompt = buildIntakePrompt(DEMO_CONFIG);
    expect(prompt).toContain("Vienna Glow Studio");
  });

  it("includes all service IDs", () => {
    const prompt = buildIntakePrompt(DEMO_CONFIG);
    expect(prompt).toContain("svc_gel_manicure");
    expect(prompt).toContain("svc_hydrafacial");
  });

  it("includes supported languages", () => {
    const prompt = buildIntakePrompt(DEMO_CONFIG);
    expect(prompt).toContain("de, en, tr");
  });

  it("contains all 6 intent types", () => {
    const prompt = buildIntakePrompt(DEMO_CONFIG);
    expect(prompt).toContain("new_booking");
    expect(prompt).toContain("price_inquiry");
    expect(prompt).toContain("complaint");
    expect(prompt).toContain("unclear");
  });
});

describe("classify", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("German booking message → intent: new_booking, language: de", async () => {
    _setAnthropicClient(mockClientWith({
      intent: "new_booking",
      confidence: 0.95,
      needs_human_review: false,
      next_step: "Route to booking agent",
      summary: "Customer wants to book a Gel Manikür appointment",
      detected_service: "svc_gel_manicure",
      language: "de",
    }));

    const result = await classify({
      ...BASE_INPUT,
      customerMessage: "Ich möchte einen Termin für Gel Manikür buchen.",
    });

    expect(result.success).toBe(true);
    expect(result.data?.intent).toBe("new_booking");
    expect(result.data?.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.data?.language).toBe("de");
    expect(result.data?.detected_service).toBe("svc_gel_manicure");
    expect(result.data?.needs_human_review).toBe(false);
  });

  it("price inquiry → intent: price_inquiry", async () => {
    _setAnthropicClient(mockClientWith({
      intent: "price_inquiry",
      confidence: 0.92,
      needs_human_review: false,
      next_step: "Provide HydraFacial pricing information",
      summary: "Customer asking about HydraFacial price",
      detected_service: "svc_hydrafacial",
      language: "de",
    }));

    const result = await classify({
      ...BASE_INPUT,
      customerMessage: "Was kostet HydraFacial?",
    });

    expect(result.success).toBe(true);
    expect(result.data?.intent).toBe("price_inquiry");
    expect(result.data?.detected_service).toBe("svc_hydrafacial");
  });

  it("gibberish message → intent: unclear, needs_human_review: true", async () => {
    _setAnthropicClient(mockClientWith({
      intent: "unclear",
      confidence: 0.1,
      needs_human_review: true,
      next_step: "Escalate to human operator",
      summary: "Unintelligible message received",
      detected_service: null,
      language: "de",
    }));

    const result = await classify({
      ...BASE_INPUT,
      customerMessage: "asdfghjk zxcvbnm 12345",
    });

    expect(result.success).toBe(true);
    expect(result.data?.intent).toBe("unclear");
    expect(result.data?.needs_human_review).toBe(true);
  });

  it("Turkish message → language: tr", async () => {
    _setAnthropicClient(mockClientWith({
      intent: "new_booking",
      confidence: 0.88,
      needs_human_review: false,
      next_step: "Route to booking agent",
      summary: "Müşteri randevu almak istiyor",
      detected_service: "svc_gel_manicure",
      language: "tr",
    }));

    const result = await classify({
      ...BASE_INPUT,
      customerMessage: "Merhaba, gel manikür için randevu almak istiyorum.",
    });

    expect(result.success).toBe(true);
    expect(result.data?.language).toBe("tr");
  });

  it("aggressive message → needs_human_review: true regardless of intent", async () => {
    _setAnthropicClient(mockClientWith({
      intent: "complaint",
      confidence: 0.85,
      needs_human_review: true,
      next_step: "Immediately escalate to human operator",
      summary: "Customer expressing strong frustration",
      detected_service: null,
      language: "de",
    }));

    const result = await classify({
      ...BASE_INPUT,
      customerMessage: "Das ist eine Katastrophe! Ich bin so wütend auf euch!",
    });

    expect(result.success).toBe(true);
    expect(result.data?.needs_human_review).toBe(true);
  });

  it("returns failure result when Claude API errors — does not throw", async () => {
    _setAnthropicClient({
      messages: {
        create: vi.fn().mockRejectedValue(new Error("Network error")),
      },
    } as unknown as Parameters<typeof _setAnthropicClient>[0]);

    const result = await classify({
      ...BASE_INPUT,
      customerMessage: "Test message",
    });

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/Network error/);
  });
});
