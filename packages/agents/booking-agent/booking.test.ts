import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextStep, BookingOutputSchema } from "./flow.js";
import { buildBookingPrompt } from "./prompt.js";
import {
  _setAnthropicClient,
  _resetAnthropicClient,
} from "@beauty-booking/shared";
import type { SalonConfig } from "@beauty-booking/config";
import type { IntakeOutput } from "../intake-agent/index.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

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
            popular: true,
          },
          {
            id: "svc_hydrafacial",
            name: "HydraFacial Classic",
            nameEn: "HydraFacial Classic",
            duration: 45,
            priceEur: 8900,
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
    colors: { primary: "#2D2926", secondary: "#C9A96E", accent: "#E8DDD0", background: "#FAFAF8" },
    ctaTemplates: {
      de: { bookNow: "Termin buchen", contactUs: "Kontakt", learnMore: "Mehr" },
      en: { bookNow: "Book Now", contactUs: "Contact", learnMore: "Learn More" },
      tr: { bookNow: "Randevu Al", contactUs: "İletişim", learnMore: "Daha Fazla" },
    },
    messageTemplates: {
      bookingConfirmation: { de: "Bestätigt", en: "Confirmed", tr: "Onaylandı" },
      reminder24h: { de: "Morgen", en: "Tomorrow", tr: "Yarın" },
      reminder3h: { de: "Heute", en: "Today", tr: "Bugün" },
    },
  },
  prompts: {},
};

const NEW_BOOKING_INTAKE: IntakeOutput = {
  intent: "new_booking",
  confidence: 0.95,
  needs_human_review: false,
  next_step: "Route to booking agent",
  summary: "Customer wants gel manicure",
  detected_service: "svc_gel_manicure",
  language: "de",
};

const PRICE_INTAKE: IntakeOutput = {
  intent: "price_inquiry",
  confidence: 0.9,
  needs_human_review: false,
  next_step: "Provide pricing info",
  summary: "Customer asking about price",
  detected_service: "svc_hydrafacial",
  language: "de",
};

const BASE_INPUT = {
  customerMessage: "Ich möchte einen Termin buchen.",
  customerHistory: "",
  conversationRound: 1,
  clientId: "00000000-0000-0000-0000-000000000001",
  leadId: "11111111-1111-1111-1111-111111111111",
  salonConfig: DEMO_CONFIG,
};

function mockWith(responseJson: object) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: JSON.stringify(responseJson) }],
        model: "claude-sonnet-4-0",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 200, output_tokens: 80 },
      }),
    },
  } as unknown as Parameters<typeof _setAnthropicClient>[0];
}

// ── buildBookingPrompt ────────────────────────────────────────────────────────

describe("buildBookingPrompt", () => {
  it("includes salon name", () => {
    const prompt = buildBookingPrompt(DEMO_CONFIG);
    expect(prompt).toContain("Vienna Glow Studio");
  });

  it("includes service IDs with prices", () => {
    const prompt = buildBookingPrompt(DEMO_CONFIG);
    expect(prompt).toContain("svc_gel_manicure");
    expect(prompt).toContain("€45.00");
  });

  it("includes booking rules", () => {
    const prompt = buildBookingPrompt(DEMO_CONFIG);
    expect(prompt).toContain("2 hours"); // minAdvanceBookingHours
    expect(prompt).toContain("24 hours notice"); // cancellationPolicyHours
  });
});

// ── BookingOutputSchema ───────────────────────────────────────────────────────

describe("BookingOutputSchema", () => {
  it("accepts valid output", () => {
    const result = BookingOutputSchema.safeParse({
      booking_stage: "confirming_service",
      required_fields: ["appointment_time"],
      customer_message: "Gerne! Wann möchten Sie Ihren Termin?",
      action: "propose_service",
      suggested_service_id: "svc_gel_manicure",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null suggested_service_id", () => {
    const result = BookingOutputSchema.safeParse({
      booking_stage: "collecting_info",
      required_fields: ["service", "appointment_time"],
      customer_message: "Welche Behandlung wünschen Sie?",
      action: "ask_question",
      suggested_service_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid booking_stage", () => {
    const result = BookingOutputSchema.safeParse({
      booking_stage: "invalid_stage",
      required_fields: [],
      customer_message: "Test",
      action: "ask_question",
      suggested_service_id: null,
    });
    expect(result.success).toBe(false);
  });
});

// ── nextStep ──────────────────────────────────────────────────────────────────

describe("nextStep", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("new_booking + detected service → confirming_service with suggested_service_id", async () => {
    _setAnthropicClient(mockWith({
      booking_stage: "confirming_service",
      required_fields: ["appointment_time"],
      customer_message: "Perfekt! Für Gel Manikür bei uns — wann passt es Ihnen?",
      action: "propose_service",
      suggested_service_id: "svc_gel_manicure",
    }));

    const result = await nextStep({
      ...BASE_INPUT,
      intakeResult: NEW_BOOKING_INTAKE,
    });

    expect(result.success).toBe(true);
    expect(result.data?.booking_stage).toBe("confirming_service");
    expect(result.data?.suggested_service_id).toBe("svc_gel_manicure");
    expect(result.data?.action).toBe("propose_service");
  });

  it("new_booking + no service info → collecting_info with ask_question", async () => {
    _setAnthropicClient(mockWith({
      booking_stage: "collecting_info",
      required_fields: ["service", "appointment_time", "contact"],
      customer_message: "Gerne helfe ich! Welche Behandlung wünschen Sie?",
      action: "ask_question",
      suggested_service_id: null,
    }));

    const unknownIntake: IntakeOutput = {
      ...NEW_BOOKING_INTAKE,
      detected_service: null,
    };

    const result = await nextStep({
      ...BASE_INPUT,
      intakeResult: unknownIntake,
      customerMessage: "Ich möchte einen Termin buchen.",
    });

    expect(result.success).toBe(true);
    expect(result.data?.booking_stage).toBe("collecting_info");
    expect(result.data?.action).toBe("ask_question");
    expect(result.data?.required_fields).toContain("service");
  });

  it("price_inquiry → response with pricing info, collecting_info stage", async () => {
    _setAnthropicClient(mockWith({
      booking_stage: "collecting_info",
      required_fields: ["appointment_time"],
      customer_message: "Das HydraFacial Classic kostet €89.00 und dauert 45 Minuten. Möchten Sie einen Termin vereinbaren?",
      action: "ask_question",
      suggested_service_id: "svc_hydrafacial",
    }));

    const result = await nextStep({
      ...BASE_INPUT,
      intakeResult: PRICE_INTAKE,
      customerMessage: "Was kostet das HydraFacial?",
    });

    expect(result.success).toBe(true);
    expect(result.data?.customer_message).toBeTruthy();
    expect(result.data?.suggested_service_id).toBe("svc_hydrafacial");
  });

  it("2+ confusion rounds → escalate action", async () => {
    _setAnthropicClient(mockWith({
      booking_stage: "needs_human",
      required_fields: [],
      customer_message: "Ich verbinde Sie gerne mit einem unserer Mitarbeiter.",
      action: "escalate",
      suggested_service_id: null,
    }));

    const confusedIntake: IntakeOutput = {
      ...NEW_BOOKING_INTAKE,
      intent: "unclear",
      confidence: 0.4,
    };

    const result = await nextStep({
      ...BASE_INPUT,
      intakeResult: confusedIntake,
      conversationRound: 3,
      customerHistory: "Customer: ...\nAgent: ...\nCustomer: ...\nAgent: ...",
    });

    expect(result.success).toBe(true);
    expect(result.data?.action).toBe("escalate");
    expect(result.data?.booking_stage).toBe("needs_human");
  });

  it("returns failure gracefully when API errors — does not throw", async () => {
    _setAnthropicClient({
      messages: {
        create: vi.fn().mockRejectedValue(new Error("Timeout")),
      },
    } as unknown as Parameters<typeof _setAnthropicClient>[0]);

    const result = await nextStep({
      ...BASE_INPUT,
      intakeResult: NEW_BOOKING_INTAKE,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Timeout/);
    expect(result.data).toBeNull();
  });
});
