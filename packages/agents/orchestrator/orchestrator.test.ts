import { describe, it, expect } from "vitest";
import { routeEvent } from "./router.js";
import type { InboundEvent } from "./router.js";
import type { ClientConfig } from "@beauty-booking/config";

// ── Test config fixtures ───────────────────────────────────────────────────────

function makeConfig(overrides: Partial<ClientConfig["features"]> = {}): ClientConfig {
  return {
    clientName: "Test Salon",
    slug: "test-salon",
    timezone: "Europe/Vienna",
    packageType: "growth",
    languages: ["de"],
    defaultLanguage: "de",
    channels: { website: true, instagramDm: false, whatsapp: false, email: false },
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
      phone: "+43 1 000 0000",
      email: "test@test.at",
      address: "Testgasse 1, 1010 Wien",
    },
    gdpr: {
      dataControllerName: "Test GmbH",
      dataControllerEmail: "dsgvo@test.at",
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
      multiLanguage: false,
      advancedReporting: false,
      ...overrides,
    },
  };
}

const GROWTH_CONFIG = makeConfig();
const STARTER_CONFIG = makeConfig({
  aiIntake: false,
  aiBooking: false,
  aiFollowUp: false,
  recoveryFlow: false,
});

const BASE_EVENT: InboundEvent = {
  type: "new_lead",
  clientId: "00000000-0000-0000-0000-000000000001",
  leadId: "11111111-1111-1111-1111-111111111111",
};

// ── new_lead ──────────────────────────────────────────────────────────────────

describe("routeEvent — new_lead", () => {
  it("routes new lead to intake-agent when aiIntake enabled", () => {
    const decision = routeEvent({ ...BASE_EVENT, type: "new_lead" }, GROWTH_CONFIG);
    expect(decision.targetAgent).toBe("intake-agent");
    expect(decision.priority).toBe("normal");
  });

  it("routes new lead to human when aiIntake disabled (starter package)", () => {
    const decision = routeEvent({ ...BASE_EVENT, type: "new_lead" }, STARTER_CONFIG);
    expect(decision.targetAgent).toBe("human");
    expect(decision.reason).toMatch(/aiIntake/);
  });
});

// ── lead_classified ───────────────────────────────────────────────────────────

describe("routeEvent — lead_classified", () => {
  it("routes new_booking intent to booking-agent", () => {
    const event: InboundEvent = {
      ...BASE_EVENT,
      type: "lead_classified",
      intent: "new_booking",
    };
    const decision = routeEvent(event, GROWTH_CONFIG);
    expect(decision.targetAgent).toBe("booking-agent");
  });

  it("routes price_inquiry to booking-agent", () => {
    const event: InboundEvent = {
      ...BASE_EVENT,
      type: "lead_classified",
      intent: "price_inquiry",
    };
    expect(routeEvent(event, GROWTH_CONFIG).targetAgent).toBe("booking-agent");
  });

  it("routes complaint to human with high priority", () => {
    const event: InboundEvent = {
      ...BASE_EVENT,
      type: "lead_classified",
      intent: "complaint",
    };
    const decision = routeEvent(event, GROWTH_CONFIG);
    expect(decision.targetAgent).toBe("human");
    expect(decision.priority).toBe("high");
  });

  it("routes unclear intent to human", () => {
    const event: InboundEvent = {
      ...BASE_EVENT,
      type: "lead_classified",
      intent: "unclear",
    };
    expect(routeEvent(event, GROWTH_CONFIG).targetAgent).toBe("human");
  });

  it("routes new_booking to human when aiBooking is disabled", () => {
    const event: InboundEvent = {
      ...BASE_EVENT,
      type: "lead_classified",
      intent: "new_booking",
    };
    const decision = routeEvent(event, STARTER_CONFIG);
    expect(decision.targetAgent).toBe("human");
    expect(decision.reason).toMatch(/aiBooking/);
  });
});

// ── booking_confirmed ─────────────────────────────────────────────────────────

describe("routeEvent — booking_confirmed", () => {
  it("routes to followup-agent to schedule reminders", () => {
    const event: InboundEvent = {
      ...BASE_EVENT,
      type: "booking_confirmed",
      bookingId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    };
    const decision = routeEvent(event, GROWTH_CONFIG);
    expect(decision.targetAgent).toBe("followup-agent");
    expect(decision.context["action"]).toBe("schedule_reminders");
  });

  it("routes to human when aiFollowUp is disabled", () => {
    const event: InboundEvent = {
      ...BASE_EVENT,
      type: "booking_confirmed",
      bookingId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    };
    expect(routeEvent(event, STARTER_CONFIG).targetAgent).toBe("human");
  });
});

// ── cancellation / no_show ────────────────────────────────────────────────────

describe("routeEvent — cancellation and no_show", () => {
  it("cancellation → followup-agent (recovery) when recoveryFlow enabled", () => {
    const event: InboundEvent = {
      ...BASE_EVENT,
      type: "cancellation",
      bookingId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    };
    const decision = routeEvent(event, GROWTH_CONFIG);
    expect(decision.targetAgent).toBe("followup-agent");
    expect(decision.context["action"]).toBe("recovery");
    expect(decision.priority).toBe("normal");
  });

  it("no_show → followup-agent with high priority", () => {
    const event: InboundEvent = {
      ...BASE_EVENT,
      type: "no_show",
      bookingId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    };
    const decision = routeEvent(event, GROWTH_CONFIG);
    expect(decision.targetAgent).toBe("followup-agent");
    expect(decision.priority).toBe("high");
  });

  it("cancellation → human when recoveryFlow disabled", () => {
    const event: InboundEvent = {
      ...BASE_EVENT,
      type: "cancellation",
    };
    expect(routeEvent(event, STARTER_CONFIG).targetAgent).toBe("human");
  });
});

// ── unknown event ─────────────────────────────────────────────────────────────

describe("routeEvent — unknown events", () => {
  it("unknown event type → human as safety fallback", () => {
    const event = {
      ...BASE_EVENT,
      type: "unknown" as const,
    };
    const decision = routeEvent(event, GROWTH_CONFIG);
    expect(decision.targetAgent).toBe("human");
    expect(decision.reason).toMatch(/safety fallback/);
  });
});
