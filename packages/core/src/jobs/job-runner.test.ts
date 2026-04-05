import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runDueJobs, type JobRunnerDeps } from "./job-runner.js";
import { handleReminder, type ReminderHandlerDeps } from "./reminder-handler.js";
import { handleRecovery, type RecoveryHandlerDeps } from "./recovery-handler.js";
import {
  _setAnthropicClient,
  _resetAnthropicClient,
} from "@beauty-booking/shared";
import type { AutomationJob, Booking } from "@beauty-booking/db";
import type { SalonConfig } from "@beauty-booking/config";

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
      tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null, sunday: null,
    },
    contact: { phone: "+43 1 234 5678", email: "hello@viennaglowstudio.at", address: "Wien" },
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
  services: {
    categories: [{
      name: "Nails", slug: "nails",
      services: [{
        id: "svc_gel_manicure", name: "Gel Manikür", nameEn: "Gel Manicure",
        duration: 60, priceEur: 4500, description: "Gel", popular: true,
      }],
    }],
  },
  branding: {
    brandTone: { style: "premium", personality: "Expert", avoid: [], allowEmojis: false, formalityLevel: "Sie-Form" },
    colors: { primary: "#2D2926", secondary: "#C9A96E", accent: "#E8DDD0", background: "#FAFAF8" },
    ctaTemplates: {
      de: { bookNow: "Buchen", contactUs: "Kontakt", learnMore: "Mehr" },
      en: { bookNow: "Book", contactUs: "Contact", learnMore: "More" },
      tr: { bookNow: "Randevu", contactUs: "İletişim", learnMore: "Daha" },
    },
    messageTemplates: {
      bookingConfirmation: { de: "Bestätigt {customerName}", en: "Confirmed {customerName}", tr: "Onay {customerName}" },
      reminder24h: { de: "Morgen: {serviceName} um {time}", en: "Tomorrow: {serviceName} at {time}", tr: "Yarın: {time}" },
      reminder3h: { de: "Heute um {time}", en: "Today at {time}", tr: "Bugün {time}" },
    },
  },
  prompts: {},
};

function makeJob(overrides: Partial<AutomationJob> = {}): AutomationJob {
  return {
    id: "job-001",
    clientId: "00000000-0000-0000-0000-000000000001",
    bookingId: "booking-001",
    leadId: "lead-001",
    jobType: "reminder_24h",
    scheduledAt: new Date(Date.now() - 1000), // 1 second ago = due
    executedAt: null,
    status: "scheduled",
    attempts: 0,
    maxAttempts: 3,
    result: null,
    error: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    id: "booking-001",
    clientId: "00000000-0000-0000-0000-000000000001",
    leadId: "lead-001",
    serviceId: null,
    customerName: "Maria Müller",
    customerContact: "maria@example.at",
    appointmentAt: future,
    durationMinutes: 60,
    status: "confirmed",
    reminderSentAt: null,
    notes: "Gel Manikür",
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── runDueJobs tests ──────────────────────────────────────────────────────────

describe("runDueJobs", () => {
  it("processes due reminder job → succeeded", async () => {
    const job = makeJob({ jobType: "reminder_24h" });

    const deps: JobRunnerDeps = {
      getDueJobs: vi.fn().mockResolvedValue([job]),
      claimJob: vi.fn().mockResolvedValue(true),
      markCompleted: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
      handleReminder: vi.fn().mockResolvedValue({ skipped: false }),
      handleRecovery: vi.fn().mockResolvedValue({ skipped: false }),
    };

    const result = await runDueJobs({ jobType: "reminder_24h" }, deps);

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(deps.markCompleted).toHaveBeenCalledWith("job-001", expect.objectContaining({ durationMs: expect.any(Number) }));
  });

  it("skips job when claim fails (another worker took it)", async () => {
    const job = makeJob();
    const deps: JobRunnerDeps = {
      getDueJobs: vi.fn().mockResolvedValue([job]),
      claimJob: vi.fn().mockResolvedValue(false), // claim fails
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      handleReminder: vi.fn(),
      handleRecovery: vi.fn(),
    };

    const result = await runDueJobs({}, deps);

    expect(result.skipped).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(deps.handleReminder).not.toHaveBeenCalled();
  });

  it("no due jobs → zero result", async () => {
    const deps: JobRunnerDeps = {
      getDueJobs: vi.fn().mockResolvedValue([]),
      claimJob: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      handleReminder: vi.fn(),
      handleRecovery: vi.fn(),
    };

    const result = await runDueJobs({}, deps);

    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
  });

  it("handler throws → job marked failed, attempts incremented", async () => {
    const job = makeJob({ attempts: 2, maxAttempts: 3 });
    const deps: JobRunnerDeps = {
      getDueJobs: vi.fn().mockResolvedValue([job]),
      claimJob: vi.fn().mockResolvedValue(true),
      markCompleted: vi.fn(),
      markFailed: vi.fn().mockResolvedValue(undefined),
      handleReminder: vi.fn().mockRejectedValue(new Error("DB connection lost")),
      handleRecovery: vi.fn(),
    };

    const result = await runDueJobs({ jobType: "reminder_24h" }, deps);

    expect(result.failed).toBe(1);
    expect(deps.markFailed).toHaveBeenCalledWith("job-001", "Error: DB connection lost", 3, 3);
  });

  it("handler returns skipped → counts as skipped, marks completed", async () => {
    const job = makeJob({ jobType: "reminder_24h" });
    const deps: JobRunnerDeps = {
      getDueJobs: vi.fn().mockResolvedValue([job]),
      claimJob: vi.fn().mockResolvedValue(true),
      markCompleted: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn(),
      handleReminder: vi.fn().mockResolvedValue({ skipped: true }),
      handleRecovery: vi.fn(),
    };

    const result = await runDueJobs({}, deps);

    expect(result.skipped).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(deps.markCompleted).toHaveBeenCalledWith("job-001", expect.objectContaining({ skipped: true }));
  });

  it("recovery job → routed to handleRecovery, not handleReminder", async () => {
    const job = makeJob({ jobType: "recovery" });
    const deps: JobRunnerDeps = {
      getDueJobs: vi.fn().mockResolvedValue([job]),
      claimJob: vi.fn().mockResolvedValue(true),
      markCompleted: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn(),
      handleReminder: vi.fn(),
      handleRecovery: vi.fn().mockResolvedValue({ skipped: false }),
    };

    await runDueJobs({}, deps);

    expect(deps.handleRecovery).toHaveBeenCalledWith(job);
    expect(deps.handleReminder).not.toHaveBeenCalled();
  });
});

// ── handleReminder tests ──────────────────────────────────────────────────────

describe("handleReminder", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  function makeReminderDeps(booking?: Booking): ReminderHandlerDeps {
    return {
      getBooking: vi.fn().mockResolvedValue(booking ?? makeBooking()),
      insertMessage: vi.fn().mockResolvedValue(undefined),
      sendEmail: vi.fn().mockResolvedValue(undefined),
      salonConfig: DEMO_CONFIG,
    };
  }

  it("confirmed booking → sends reminder, returns skipped: false", async () => {
    const job = makeJob({ jobType: "reminder_24h" });
    const deps = makeReminderDeps(makeBooking({ status: "confirmed" }));

    const result = await handleReminder(job, deps);

    expect(result.skipped).toBe(false);
    expect(deps.insertMessage).toHaveBeenCalled();
  });

  it("cancelled booking → skips, does NOT send message", async () => {
    const job = makeJob({ jobType: "reminder_24h" });
    const deps = makeReminderDeps(makeBooking({ status: "cancelled" }));

    const result = await handleReminder(job, deps);

    expect(result.skipped).toBe(true);
    expect(deps.insertMessage).not.toHaveBeenCalled();
  });

  it("no_show booking → skips reminder", async () => {
    const job = makeJob({ jobType: "reminder_3h" });
    const deps = makeReminderDeps(makeBooking({ status: "no_show" }));

    const result = await handleReminder(job, deps);

    expect(result.skipped).toBe(true);
  });

  it("booking not found → skips", async () => {
    const job = makeJob();
    const deps: ReminderHandlerDeps = {
      getBooking: vi.fn().mockResolvedValue(undefined),
      insertMessage: vi.fn(),
      sendEmail: vi.fn(),
      salonConfig: DEMO_CONFIG,
    };

    const result = await handleReminder(job, deps);

    expect(result.skipped).toBe(true);
  });

  it("sends email when customerContact is an email address", async () => {
    const job = makeJob({ jobType: "reminder_24h" });
    const deps = makeReminderDeps(makeBooking({ customerContact: "maria@example.at" }));

    await handleReminder(job, deps);

    expect(deps.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "maria@example.at" })
    );
  });
});

// ── handleRecovery tests ──────────────────────────────────────────────────────

describe("handleRecovery", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  function makeRecoveryDeps(booking?: Booking, previousAttempts = 0): RecoveryHandlerDeps {
    return {
      getBooking: vi.fn().mockResolvedValue(booking ?? makeBooking({ status: "cancelled" })),
      countPreviousRecoveryAttempts: vi.fn().mockResolvedValue(previousAttempts),
      insertMessage: vi.fn().mockResolvedValue(undefined),
      sendEmail: vi.fn().mockResolvedValue(undefined),
      salonConfig: DEMO_CONFIG,
    };
  }

  function mockAiWith(msg: object) {
    _setAnthropicClient({
      messages: {
        create: vi.fn().mockResolvedValue({
          id: "msg_test", type: "message", role: "assistant",
          content: [{ type: "text", text: JSON.stringify(msg) }],
          model: "claude-sonnet-4-0", stop_reason: "end_turn", stop_sequence: null,
          usage: { input_tokens: 200, output_tokens: 80 },
        }),
      },
    } as never);
  }

  it("cancelled booking with 48h wait passed → sends winback", async () => {
    mockAiWith({
      message: "Wir würden uns freuen, Sie wieder zu sehen.",
      tone_check: "on_brand",
      language: "de",
      character_count: 44,
    });

    const cancelledAt = new Date(Date.now() - 49 * 60 * 60 * 1000); // 49h ago
    const booking = makeBooking({ status: "cancelled", cancelledAt });
    const job = makeJob({ jobType: "recovery" });
    const deps = makeRecoveryDeps(booking, 0);

    const result = await handleRecovery(job, deps);

    expect(result.skipped).toBe(false);
    expect(deps.insertMessage).toHaveBeenCalled();
  });

  it("48h wait NOT passed → skips", async () => {
    const cancelledAt = new Date(Date.now() - 10 * 60 * 60 * 1000); // only 10h ago
    const booking = makeBooking({ status: "cancelled", cancelledAt });
    const job = makeJob({ jobType: "recovery" });
    const deps = makeRecoveryDeps(booking, 0);

    const result = await handleRecovery(job, deps);

    expect(result.skipped).toBe(true);
    expect(deps.insertMessage).not.toHaveBeenCalled();
  });

  it("max follow-up attempts reached → skips", async () => {
    const cancelledAt = new Date(Date.now() - 49 * 60 * 60 * 1000);
    const booking = makeBooking({ status: "cancelled", cancelledAt });
    const job = makeJob({ jobType: "winback" });
    // maxFollowUpAttempts = 2, previousAttempts = 2 → should skip
    const deps = makeRecoveryDeps(booking, 2);

    const result = await handleRecovery(job, deps);

    expect(result.skipped).toBe(true);
  });

  it("booking in active state → skips recovery", async () => {
    const booking = makeBooking({ status: "confirmed" });
    const job = makeJob({ jobType: "recovery" });
    const deps = makeRecoveryDeps(booking, 0);

    const result = await handleRecovery(job, deps);

    expect(result.skipped).toBe(true);
  });

  it("no_show booking → triggers winback (not cancellation)", async () => {
    mockAiWith({
      message: "Wir haben Sie vermisst.",
      tone_check: "on_brand",
      language: "de",
      character_count: 23,
    });

    const cancelledAt = new Date(Date.now() - 49 * 60 * 60 * 1000);
    const booking = makeBooking({ status: "no_show", cancelledAt });
    const job = makeJob({ jobType: "winback" });
    const deps = makeRecoveryDeps(booking, 0);

    const result = await handleRecovery(job, deps);

    expect(result.skipped).toBe(false);
  });
});
