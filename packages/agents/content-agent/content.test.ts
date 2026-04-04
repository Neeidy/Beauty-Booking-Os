import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateMessage, ContentOutputSchema } from "./writer.js";
import { buildContentPrompt } from "./prompt.js";
import {
  _setAnthropicClient,
  _resetAnthropicClient,
} from "@beauty-booking/shared";
import type { SalonConfig } from "@beauty-booking/config";

// ── Test fixtures ──────────────────────────────────────────────────────────────

const SIE_CONFIG: SalonConfig = {
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
      aiIntake: true, aiBooking: true, aiFollowUp: true,
      instagramDmFlow: false, recoveryFlow: true, multiLanguage: true, advancedReporting: false,
    },
  },
  services: { categories: [] },
  branding: {
    brandTone: {
      style: "premium, warm, direct",
      personality: "Wie eine erfahrene Freundin, die auch Profi ist",
      avoid: ["too robotic", "slang", "excessive emojis"],
      allowEmojis: false,
      formalityLevel: "Sie-Form",
    },
    colors: { primary: "#2D2926", secondary: "#C9A96E", accent: "#E8DDD0", background: "#FAFAF8" },
    ctaTemplates: {
      de: { bookNow: "Jetzt buchen", contactUs: "Kontakt", learnMore: "Mehr erfahren" },
      en: { bookNow: "Book Now", contactUs: "Contact", learnMore: "Learn More" },
      tr: { bookNow: "Randevu Al", contactUs: "İletişim", learnMore: "Daha Fazla" },
    },
    messageTemplates: {
      bookingConfirmation: {
        de: "Ihr Termin ist bestätigt.", en: "Your appointment is confirmed.", tr: "Randevunuz onaylandı.",
      },
      reminder24h: {
        de: "Erinnerung: morgen.", en: "Reminder: tomorrow.", tr: "Hatırlatma: yarın.",
      },
      reminder3h: {
        de: "Heute um {time}.", en: "Today at {time}.", tr: "Bugün saat {time}.",
      },
    },
  },
  prompts: {},
};

// Du-Form config (for brand guard tests)
const DU_CONFIG: SalonConfig = {
  ...SIE_CONFIG,
  client: {
    ...SIE_CONFIG.client,
    clientName: "Elegant Nails Vienna",
    slug: "elegant-nails-vienna",
  },
  branding: {
    ...SIE_CONFIG.branding,
    brandTone: {
      style: "modern, friendly, professional",
      personality: "Junge, trendige Nagel-Expertin",
      avoid: ["too formal", "medical terms"],
      allowEmojis: true,
      formalityLevel: "Du-Form",
    },
  },
};

function mockClient(responseJson: object) {
  const message = {
    id: "msg_test",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: JSON.stringify(responseJson) }],
    model: "claude-sonnet-4-0",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 300, output_tokens: 80 },
  };
  return {
    messages: { create: vi.fn().mockResolvedValue(message) },
  } as unknown as Parameters<typeof _setAnthropicClient>[0];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("buildContentPrompt", () => {
  it("includes salon name and purpose", () => {
    const prompt = buildContentPrompt(SIE_CONFIG, {
      purpose: "booking_confirmation",
      language: "de",
      context: { customerName: "Maria" },
    });
    expect(prompt).toContain("Vienna Glow Studio");
    expect(prompt).toContain("booking_confirmation");
  });

  it("enforces Sie-Form in prompt instructions", () => {
    const prompt = buildContentPrompt(SIE_CONFIG, {
      purpose: "reminder",
      language: "de",
      context: {},
    });
    expect(prompt).toContain("Sie");
    expect(prompt).toContain("Sie-Form");
  });

  it("enforces Du-Form in prompt instructions", () => {
    const prompt = buildContentPrompt(DU_CONFIG, {
      purpose: "dm_reply",
      language: "de",
      context: {},
    });
    expect(prompt).toContain("Du-Form");
    expect(prompt).toContain("du");
  });

  it("includes emoji rule: no emojis when allowEmojis is false", () => {
    const prompt = buildContentPrompt(SIE_CONFIG, {
      purpose: "reminder",
      language: "de",
      context: {},
    });
    expect(prompt).toContain("Do NOT use emojis");
  });
});

describe("generateMessage — booking_confirmation DE (Sie-Form, no emoji)", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("returns on_brand message with correct structure", async () => {
    _setAnthropicClient(mockClient({
      message: "Sehr geehrte Frau Müller, Ihr Termin für Gel Manikür am Montag, 14. April um 14:00 Uhr ist bestätigt. Wir freuen uns auf Sie.",
      tone_check: "on_brand",
      language: "de",
      character_count: 130,
    }));

    const result = await generateMessage({
      purpose: "booking_confirmation",
      language: "de",
      context: { customerName: "Maria Müller", serviceName: "Gel Manikür", date: "Montag, 14. April", time: "14:00" },
      clientConfig: SIE_CONFIG,
    });

    expect(result.success).toBe(true);
    expect(result.data?.language).toBe("de");
    expect(result.data?.tone_check).toBe("on_brand");
    expect(result.data?.message.length).toBeGreaterThan(0);
    expect(result.data?.character_count).toBe(result.data?.message.length);
  });

  it("brand guard flags emoji in message when allowEmojis: false", async () => {
    _setAnthropicClient(mockClient({
      message: "Ihr Termin ist bestätigt ✨",
      tone_check: "on_brand",   // AI claims on_brand but has emoji
      language: "de",
      character_count: 27,
    }));

    const result = await generateMessage({
      purpose: "booking_confirmation",
      language: "de",
      context: { customerName: "Test" },
      clientConfig: SIE_CONFIG,
    });

    expect(result.success).toBe(true);
    // Brand guard should catch the emoji
    expect(result.data?.tone_check).toBe("needs_review");
  });
});

describe("generateMessage — reminder EN", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("returns short, clear reminder in English", async () => {
    _setAnthropicClient(mockClient({
      message: "Hi Anna, just a reminder: your Gel Manicure is tomorrow at 2 PM. See you then!",
      tone_check: "on_brand",
      language: "en",
      character_count: 81,
    }));

    const result = await generateMessage({
      purpose: "reminder",
      language: "en",
      context: { customerName: "Anna", serviceName: "Gel Manicure", time: "14:00" },
      clientConfig: SIE_CONFIG,
    });

    expect(result.success).toBe(true);
    expect(result.data?.language).toBe("en");
    expect(result.data?.message.length).toBeLessThanOrEqual(300);
  });
});

describe("generateMessage — winback TR", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("returns gentle winback message in Turkish", async () => {
    _setAnthropicClient(mockClient({
      message: "Merhaba Ayşe, sizi yeniden görmekten memnuniyet duyarız. Yeni bir randevu almak ister misiniz?",
      tone_check: "on_brand",
      language: "tr",
      character_count: 96,
    }));

    const result = await generateMessage({
      purpose: "winback",
      language: "tr",
      context: { customerName: "Ayşe" },
      clientConfig: SIE_CONFIG,
    });

    expect(result.success).toBe(true);
    expect(result.data?.language).toBe("tr");
    expect(result.data?.tone_check).toBe("on_brand");
  });
});

describe("generateMessage — dm_reply brand voice", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("returns on-brand dm reply", async () => {
    _setAnthropicClient(mockClient({
      message: "Vielen Dank für Ihre Anfrage! Wir freuen uns, Ihnen einen Termin für Gel Manikür anzubieten. Bitte kontaktieren Sie uns unter +43 1 234 5678.",
      tone_check: "on_brand",
      language: "de",
      character_count: 145,
    }));

    const result = await generateMessage({
      purpose: "dm_reply",
      language: "de",
      context: { inquiryTopic: "Gel Manikür Preise" },
      clientConfig: SIE_CONFIG,
    });

    expect(result.success).toBe(true);
    expect(result.data?.tone_check).toBe("on_brand");
  });

  it("brand guard flags wrong formality (du instead of Sie)", async () => {
    _setAnthropicClient(mockClient({
      message: "Danke für deine Anfrage! Wir helfen dir gerne.",
      tone_check: "on_brand",   // AI claims on_brand but uses du (wrong for Sie-Form config)
      language: "de",
      character_count: 47,
    }));

    const result = await generateMessage({
      purpose: "dm_reply",
      language: "de",
      context: {},
      clientConfig: SIE_CONFIG,
    });

    expect(result.success).toBe(true);
    // Brand guard should catch "deine" / "dir"
    expect(result.data?.tone_check).toBe("needs_review");
  });
});

describe("generateMessage — error handling", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("returns failure gracefully when API errors — does not throw", async () => {
    _setAnthropicClient({
      messages: {
        create: vi.fn().mockRejectedValue(new Error("Rate limit exceeded")),
      },
    } as unknown as Parameters<typeof _setAnthropicClient>[0]);

    const result = await generateMessage({
      purpose: "campaign",
      language: "de",
      context: {},
      clientConfig: SIE_CONFIG,
    });

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/Rate limit exceeded/);
  });
});

describe("ContentOutputSchema validation", () => {
  it("accepts valid output", () => {
    const valid = {
      message: "Guten Tag!",
      tone_check: "on_brand" as const,
      language: "de" as const,
      character_count: 10,
    };
    expect(() => ContentOutputSchema.parse(valid)).not.toThrow();
  });

  it("rejects invalid tone_check value", () => {
    const invalid = {
      message: "Test",
      tone_check: "perfect",
      language: "de",
      character_count: 4,
    };
    expect(() => ContentOutputSchema.parse(invalid)).toThrow();
  });

  it("rejects empty message", () => {
    const invalid = {
      message: "",
      tone_check: "on_brand",
      language: "de",
      character_count: 0,
    };
    expect(() => ContentOutputSchema.parse(invalid)).toThrow();
  });
});
