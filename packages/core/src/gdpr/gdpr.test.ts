import { describe, it, expect, vi } from "vitest";
import { exportLeadData } from "./data-export.js";
import { deleteLeadData, ANONYMIZED_NAME, ANONYMIZED_EMAIL } from "./data-deletion.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LEAD = {
  id: "lead-001",
  clientId: "client-001",
  customerName: "Maria Müller",
  customerEmail: "maria@example.at",
  customerPhone: "+43 1 234 5678",
  rawMessage: "Ich möchte einen Termin für Gel Manikür buchen.",
  intent: "new_booking",
  status: "booked",
  source: "web_form",
  language: "de",
  gdprConsentAt: new Date("2026-01-01"),
  gdprConsentMethod: "web_form_checkbox",
  createdAt: new Date("2026-01-01"),
};

const BOOKING = {
  id: "booking-001",
  customerName: "Maria Müller",
  customerContact: "maria@example.at",
  appointmentAt: new Date("2026-02-01T14:00:00Z"),
  status: "completed",
  notes: "Gel Manikür",
};

const MESSAGE = {
  id: "msg-001",
  channel: "web_form",
  direction: "inbound",
  senderType: "customer",
  body: "Ich möchte einen Termin buchen.",
  sentAt: new Date("2026-01-01"),
};

const CONSENT = {
  id: "consent-001",
  consentType: "data_processing",
  granted: true,
  method: "web_form",
  grantedAt: new Date("2026-01-01"),
  revokedAt: null,
};

// ── Export Tests ──────────────────────────────────────────────────────────────

describe("exportLeadData", () => {
  it("returns all personal data including bookings, messages, consents", async () => {
    const deps = {
      getLead: vi.fn().mockResolvedValue(LEAD),
      getBookingsForLead: vi.fn().mockResolvedValue([BOOKING]),
      getMessagesForLead: vi.fn().mockResolvedValue([MESSAGE]),
      getConsentsForLead: vi.fn().mockResolvedValue([CONSENT]),
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    const result = await exportLeadData("lead-001", deps);

    expect(result).not.toBeNull();
    expect(result!.leadId).toBe("lead-001");
    expect(result!.personalData.lead.customerName).toBe("Maria Müller");
    expect(result!.personalData.bookings).toHaveLength(1);
    expect(result!.personalData.messages).toHaveLength(1);
    expect(result!.personalData.consents).toHaveLength(1);
    expect(result!.dataCategories).toContain("contact_info");
    expect(result!.dataCategories).toContain("booking_history");
    expect(result!.exportedAt).toBeTruthy();
  });

  it("logs a gdpr_export event", async () => {
    const logEvent = vi.fn().mockResolvedValue(undefined);
    const deps = {
      getLead: vi.fn().mockResolvedValue(LEAD),
      getBookingsForLead: vi.fn().mockResolvedValue([]),
      getMessagesForLead: vi.fn().mockResolvedValue([]),
      getConsentsForLead: vi.fn().mockResolvedValue([]),
      logEvent,
    };

    await exportLeadData("lead-001", deps);

    expect(logEvent).toHaveBeenCalledOnce();
    expect(logEvent.mock.calls[0][0].eventType).toBe("gdpr_export");
  });

  it("returns null when lead not found", async () => {
    const deps = {
      getLead: vi.fn().mockResolvedValue(undefined),
      getBookingsForLead: vi.fn(),
      getMessagesForLead: vi.fn(),
      getConsentsForLead: vi.fn(),
      logEvent: vi.fn(),
    };

    const result = await exportLeadData("nonexistent", deps);
    expect(result).toBeNull();
  });
});

// ── Deletion Tests ────────────────────────────────────────────────────────────

describe("deleteLeadData", () => {
  it("anonymizes lead and all related records", async () => {
    const anonymizeLead = vi.fn().mockResolvedValue(undefined);
    const anonymizeBookings = vi.fn().mockResolvedValue(1);
    const anonymizeMessages = vi.fn().mockResolvedValue(2);
    const revokeConsents = vi.fn().mockResolvedValue(1);
    const logEvent = vi.fn().mockResolvedValue(undefined);

    const result = await deleteLeadData("lead-001", {
      getLead: vi.fn().mockResolvedValue({ id: "lead-001", clientId: "client-001" }),
      anonymizeLead,
      anonymizeBookingsForLead: anonymizeBookings,
      anonymizeMessagesForLead: anonymizeMessages,
      revokeConsentsForLead: revokeConsents,
      logEvent,
    });

    expect(result!.anonymized).toBe(true);
    expect(result!.recordsAffected).toBe(5); // 1 lead + 1 booking + 2 messages + 1 consent
    expect(anonymizeLead).toHaveBeenCalledWith("lead-001");
    expect(anonymizeBookings).toHaveBeenCalledWith("lead-001");
    expect(anonymizeMessages).toHaveBeenCalledWith("lead-001");
    expect(revokeConsents).toHaveBeenCalledWith("lead-001");
  });

  it("logs a gdpr_deletion event", async () => {
    const logEvent = vi.fn().mockResolvedValue(undefined);

    await deleteLeadData("lead-001", {
      getLead: vi.fn().mockResolvedValue({ id: "lead-001", clientId: "client-001" }),
      anonymizeLead: vi.fn().mockResolvedValue(undefined),
      anonymizeBookingsForLead: vi.fn().mockResolvedValue(0),
      anonymizeMessagesForLead: vi.fn().mockResolvedValue(0),
      revokeConsentsForLead: vi.fn().mockResolvedValue(0),
      logEvent,
    });

    expect(logEvent).toHaveBeenCalledOnce();
    expect(logEvent.mock.calls[0][0].eventType).toBe("gdpr_deletion");
  });

  it("returns null when lead not found", async () => {
    const result = await deleteLeadData("nonexistent", {
      getLead: vi.fn().mockResolvedValue(undefined),
      anonymizeLead: vi.fn(),
      anonymizeBookingsForLead: vi.fn(),
      anonymizeMessagesForLead: vi.fn(),
      revokeConsentsForLead: vi.fn(),
      logEvent: vi.fn(),
    });
    expect(result).toBeNull();
  });

  it("ANONYMIZED constants are defined and correct", () => {
    expect(ANONYMIZED_NAME).toBe("ANONYMIZED");
    expect(ANONYMIZED_EMAIL).toBe("anonymized@deleted.local");
  });
});

// ── Export-then-Delete Cycle ──────────────────────────────────────────────────

describe("GDPR cycle: export → delete → export again shows anonymized data", () => {
  it("after deletion, personal fields are anonymized", async () => {
    let lead = { ...LEAD };

    const exportDeps = {
      getLead: vi.fn().mockImplementation(() => Promise.resolve({ ...lead })),
      getBookingsForLead: vi.fn().mockResolvedValue([BOOKING]),
      getMessagesForLead: vi.fn().mockResolvedValue([MESSAGE]),
      getConsentsForLead: vi.fn().mockResolvedValue([CONSENT]),
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    // Initial export — has real PII
    const before = await exportLeadData("lead-001", exportDeps);
    expect(before!.personalData.lead.customerEmail).toBe("maria@example.at");

    // Simulate deletion — mutate the lead object
    await deleteLeadData("lead-001", {
      getLead: vi.fn().mockResolvedValue({ id: "lead-001", clientId: "client-001" }),
      anonymizeLead: vi.fn().mockImplementation(async () => {
        lead.customerName = ANONYMIZED_NAME;
        lead.customerEmail = "anonymized@deleted.local";
        lead.customerPhone = "0000000000";
        lead.rawMessage = "ANONYMIZED";
      }),
      anonymizeBookingsForLead: vi.fn().mockResolvedValue(1),
      anonymizeMessagesForLead: vi.fn().mockResolvedValue(1),
      revokeConsentsForLead: vi.fn().mockResolvedValue(1),
      logEvent: vi.fn().mockResolvedValue(undefined),
    });

    // Export after deletion — no more PII
    const after = await exportLeadData("lead-001", exportDeps);
    expect(after!.personalData.lead.customerName).toBe(ANONYMIZED_NAME);
    expect(after!.personalData.lead.customerEmail).toBe("anonymized@deleted.local");
  });
});
