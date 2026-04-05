import { describe, it, expect, vi } from "vitest";
import { runDataRetention } from "./data-retention.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CLIENTS = [
  { id: "client-001", slug: "vienna-glow-studio", dataRetentionDays: 730 },
  { id: "client-002", slug: "elegant-nails-vienna", dataRetentionDays: 365 },
];

const EXPIRED_LEADS = [
  { id: "lead-old-001" },
  { id: "lead-old-002" },
];

function makeDeps(expiredLeads = EXPIRED_LEADS) {
  return {
    getClients: vi.fn().mockResolvedValue(CLIENTS),
    getExpiredLeads: vi.fn().mockResolvedValue(expiredLeads),
    anonymizeLead: vi.fn().mockResolvedValue(undefined),
    anonymizeBookingsForLead: vi.fn().mockResolvedValue(1),
    anonymizeMessagesForLead: vi.fn().mockResolvedValue(2),
    revokeConsentsForLead: vi.fn().mockResolvedValue(1),
    logEvent: vi.fn().mockResolvedValue(undefined),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runDataRetention", () => {
  it("returns results for each client", async () => {
    const deps = makeDeps();
    const results = await runDataRetention(deps);

    expect(results).toHaveLength(2);
    expect(results[0]!.clientId).toBe("client-001");
    expect(results[1]!.clientId).toBe("client-002");
  });

  it("anonymizes expired leads and logs events (live run)", async () => {
    const deps = makeDeps();
    const results = await runDataRetention(deps, false);

    // 2 expired leads × 2 clients = 4 total anonymizations
    expect(deps.anonymizeLead).toHaveBeenCalledTimes(4);
    expect(deps.logEvent).toHaveBeenCalledTimes(4);
    expect(results[0]!.leadsAnonymized).toBe(2);
    expect(results[0]!.dryRun).toBe(false);
  });

  it("dry run: scans but does NOT anonymize", async () => {
    const deps = makeDeps();
    const results = await runDataRetention(deps, true);

    expect(deps.anonymizeLead).not.toHaveBeenCalled();
    expect(deps.logEvent).not.toHaveBeenCalled();
    expect(results[0]!.leadsAnonymized).toBe(0);
    expect(results[0]!.leadsScanned).toBe(2);
    expect(results[0]!.dryRun).toBe(true);
  });

  it("passes correct cutoff date based on retentionDays", async () => {
    const deps = makeDeps();
    await runDataRetention(deps);

    // getExpiredLeads called once per client (2 clients)
    expect(deps.getExpiredLeads).toHaveBeenCalledTimes(2);

    const firstCall = deps.getExpiredLeads.mock.calls[0]!;
    expect(firstCall[0]).toBe("client-001");

    const cutoffDate = firstCall[1] as Date;
    const expectedCutoff = new Date();
    expectedCutoff.setDate(expectedCutoff.getDate() - 730);

    // Allow 1 second of clock drift in test
    expect(Math.abs(cutoffDate.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
  });

  it("handles client with no expired leads gracefully", async () => {
    const deps = makeDeps([]); // no expired leads
    const results = await runDataRetention(deps);

    expect(deps.anonymizeLead).not.toHaveBeenCalled();
    expect(results[0]!.leadsAnonymized).toBe(0);
    expect(results[0]!.leadsScanned).toBe(0);
  });

  it("processes all related records in parallel per lead", async () => {
    const callOrder: string[] = [];
    const deps = {
      getClients: vi.fn().mockResolvedValue([CLIENTS[0]!]),
      getExpiredLeads: vi.fn().mockResolvedValue([{ id: "lead-001" }]),
      anonymizeLead: vi.fn().mockImplementation(async () => { callOrder.push("lead"); }),
      anonymizeBookingsForLead: vi.fn().mockImplementation(async () => { callOrder.push("bookings"); return 1; }),
      anonymizeMessagesForLead: vi.fn().mockImplementation(async () => { callOrder.push("messages"); return 1; }),
      revokeConsentsForLead: vi.fn().mockImplementation(async () => { callOrder.push("consents"); return 1; }),
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    await runDataRetention(deps);

    // Lead must be last (FK integrity)
    expect(callOrder[callOrder.length - 1]).toBe("lead");
    // bookings/messages/consents ran before lead
    expect(callOrder.slice(0, -1)).toContain("bookings");
    expect(callOrder.slice(0, -1)).toContain("messages");
    expect(callOrder.slice(0, -1)).toContain("consents");
  });
});
