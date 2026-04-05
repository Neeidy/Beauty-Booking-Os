import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeCancellationRecovery, type CancellationRecoveryDeps } from "./cancellation-recovery.js";
import {
  _setAnthropicClient,
  _resetAnthropicClient,
} from "@beauty-booking/shared";
import type { SalonConfig } from "@beauty-booking/config";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SALON_CONFIG: SalonConfig = {
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
      personality: "Freundliche Expertin",
      avoid: ["too robotic"],
      allowEmojis: false,
      formalityLevel: "Sie-Form",
    },
    colors: { primary: "#2D2926", secondary: "#C9A96E", accent: "#E8DDD0", background: "#FAFAF8" },
    ctaTemplates: {
      de: { bookNow: "Jetzt buchen", contactUs: "Kontakt", learnMore: "Mehr" },
      en: { bookNow: "Book Now", contactUs: "Contact", learnMore: "Learn More" },
      tr: { bookNow: "Randevu Al", contactUs: "İletişim", learnMore: "Daha Fazla" },
    },
    messageTemplates: {
      bookingConfirmation: { de: "Bestätigt.", en: "Confirmed.", tr: "Onaylandı." },
      reminder24h: { de: "Morgen.", en: "Tomorrow.", tr: "Yarın." },
      reminder3h: { de: "Heute.", en: "Today.", tr: "Bugün." },
    },
  },
  prompts: {},
};

const PAST_48H = new Date(Date.now() - 50 * 60 * 60 * 1000); // 50h ago — past the 48h wait
const RECENT_10H = new Date(Date.now() - 10 * 60 * 60 * 1000); // 10h ago — within wait period

const BASE_BOOKING = {
  id: "booking-001",
  clientId: "00000000-0000-0000-0000-000000000001",
  leadId: "lead-001",
  customerName: "Maria Müller",
  customerContact: "maria@example.at",
  status: "cancelled",
  cancelledAt: PAST_48H,
  updatedAt: PAST_48H,
  appointmentAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  notes: "Gel Manikür",
};

function makeDeps(overrides: Partial<CancellationRecoveryDeps> = {}): CancellationRecoveryDeps {
  return {
    getBooking: vi.fn().mockResolvedValue(BASE_BOOKING),
    hasReminderConsent: vi.fn().mockResolvedValue(true),
    countRecoveryAttempts: vi.fn().mockResolvedValue(0),
    markLeadInactive: vi.fn().mockResolvedValue(undefined),
    insertMessage: vi.fn().mockResolvedValue(undefined),
    scheduleFollowUp: vi.fn().mockResolvedValue(undefined),
    logEvent: vi.fn().mockResolvedValue(undefined),
    sendEmail: vi.fn().mockResolvedValue(undefined),
    salonConfig: SALON_CONFIG,
    ...overrides,
  };
}

function mockContentAgent(message = "Wir würden uns freuen, Sie wiederzusehen.") {
  const response = {
    id: "msg_test",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: JSON.stringify({
      message,
      tone_check: "on_brand",
      language: "de",
      character_count: message.length,
    }) }],
    model: "claude-sonnet-4-0",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 200, output_tokens: 50 },
  };
  _setAnthropicClient({
    messages: { create: vi.fn().mockResolvedValue(response) },
  } as unknown as Parameters<typeof _setAnthropicClient>[0]);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("executeCancellationRecovery — happy path", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("cancellation → 48h wait passed + GDPR ok → sends winback message", async () => {
    mockContentAgent("Wir würden uns freuen, Sie bald wieder bei uns zu sehen.");
    const deps = makeDeps();

    const result = await executeCancellationRecovery(
      { bookingId: "booking-001", clientId: "client-001", triggerType: "cancellation" },
      deps
    );

    expect(result.outcome).toBe("message_sent");
    expect(result.message).toBeTruthy();
    expect(deps.insertMessage).toHaveBeenCalledOnce();
    expect(deps.sendEmail).toHaveBeenCalledOnce(); // email contact
    expect(deps.logEvent).toHaveBeenCalledOnce();
  });

  it("no_show → 48h wait passed + GDPR ok → sends winback message", async () => {
    mockContentAgent("Wir haben Sie vermisst und freuen uns auf Ihren nächsten Besuch.");
    const deps = makeDeps({
      getBooking: vi.fn().mockResolvedValue({ ...BASE_BOOKING, status: "no_show" }),
    });

    const result = await executeCancellationRecovery(
      { bookingId: "booking-001", clientId: "client-001", triggerType: "no_show" },
      deps
    );

    expect(result.outcome).toBe("message_sent");
    expect(deps.insertMessage).toHaveBeenCalledOnce();
  });

  it("first attempt → schedules follow-up 7 days later", async () => {
    mockContentAgent("Herzliche Einladung zurück.");
    const deps = makeDeps({ countRecoveryAttempts: vi.fn().mockResolvedValue(0) });

    const result = await executeCancellationRecovery(
      { bookingId: "booking-001", clientId: "client-001", triggerType: "cancellation" },
      deps
    );

    expect(result.outcome).toBe("message_sent");
    expect(result.nextFollowUpAt).toBeInstanceOf(Date);
    expect(deps.scheduleFollowUp).toHaveBeenCalledOnce();
    const scheduled = (deps.scheduleFollowUp as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(scheduled.jobType).toBe("winback");
  });
});

describe("executeCancellationRecovery — skip conditions", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("48h wait NOT passed → skips with skipped_wait", async () => {
    const deps = makeDeps({
      getBooking: vi.fn().mockResolvedValue({ ...BASE_BOOKING, cancelledAt: RECENT_10H, updatedAt: RECENT_10H }),
    });

    const result = await executeCancellationRecovery(
      { bookingId: "booking-001", clientId: "client-001", triggerType: "cancellation" },
      deps
    );

    expect(result.outcome).toBe("skipped_wait");
    expect(deps.insertMessage).not.toHaveBeenCalled();
  });

  it("GDPR consent not granted → skips with skipped_no_gdpr", async () => {
    const deps = makeDeps({ hasReminderConsent: vi.fn().mockResolvedValue(false) });

    const result = await executeCancellationRecovery(
      { bookingId: "booking-001", clientId: "client-001", triggerType: "cancellation" },
      deps
    );

    expect(result.outcome).toBe("skipped_no_gdpr");
    expect(deps.insertMessage).not.toHaveBeenCalled();
  });

  it("booking not in recoverable state (confirmed) → skips with skipped_status", async () => {
    const deps = makeDeps({
      getBooking: vi.fn().mockResolvedValue({ ...BASE_BOOKING, status: "confirmed" }),
    });

    const result = await executeCancellationRecovery(
      { bookingId: "booking-001", clientId: "client-001", triggerType: "cancellation" },
      deps
    );

    expect(result.outcome).toBe("skipped_status");
  });
});

describe("executeCancellationRecovery — max attempts", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("2 previous attempts (= maxFollowUpAttempts) → stops + marks lead inactive", async () => {
    const deps = makeDeps({ countRecoveryAttempts: vi.fn().mockResolvedValue(2) });

    const result = await executeCancellationRecovery(
      { bookingId: "booking-001", clientId: "client-001", triggerType: "cancellation" },
      deps
    );

    expect(result.outcome).toBe("stopped_max_attempts");
    expect(deps.markLeadInactive).toHaveBeenCalledWith("lead-001");
    expect(deps.insertMessage).not.toHaveBeenCalled();
  });

  it("last allowed attempt (1 of 2) → sends message, no follow-up scheduled", async () => {
    mockContentAgent("Letzte Einladung.");
    const deps = makeDeps({ countRecoveryAttempts: vi.fn().mockResolvedValue(1) });

    const result = await executeCancellationRecovery(
      { bookingId: "booking-001", clientId: "client-001", triggerType: "cancellation" },
      deps
    );

    expect(result.outcome).toBe("message_sent");
    expect(result.nextFollowUpAt).toBeUndefined();
    expect(deps.scheduleFollowUp).not.toHaveBeenCalled();
  });
});
