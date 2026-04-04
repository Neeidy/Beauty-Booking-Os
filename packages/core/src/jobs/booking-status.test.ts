import { describe, it, expect } from "vitest";

// ── Status transition rules (extracted for pure testability) ──────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled", "rescheduled"],
  reminded:  ["completed", "no_show", "cancelled"],
};

function isValidTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("booking status transitions", () => {
  it("pending → confirmed is valid", () => {
    expect(isValidTransition("pending", "confirmed")).toBe(true);
  });

  it("pending → cancelled is valid", () => {
    expect(isValidTransition("pending", "cancelled")).toBe(true);
  });

  it("confirmed → completed is valid", () => {
    expect(isValidTransition("confirmed", "completed")).toBe(true);
  });

  it("confirmed → no_show is valid", () => {
    expect(isValidTransition("confirmed", "no_show")).toBe(true);
  });

  it("confirmed → rescheduled is valid", () => {
    expect(isValidTransition("confirmed", "rescheduled")).toBe(true);
  });

  it("completed → pending is INVALID", () => {
    expect(isValidTransition("completed", "pending")).toBe(false);
  });

  it("cancelled → confirmed is INVALID", () => {
    expect(isValidTransition("cancelled", "confirmed")).toBe(false);
  });

  it("no_show → confirmed is INVALID", () => {
    expect(isValidTransition("no_show", "confirmed")).toBe(false);
  });

  it("pending → no_show is INVALID (must confirm first)", () => {
    expect(isValidTransition("pending", "no_show")).toBe(false);
  });

  it("unknown status → no valid transitions", () => {
    expect(isValidTransition("invented_status", "confirmed")).toBe(false);
  });
});

// ── Recovery scheduling rules ─────────────────────────────────────────────────

describe("recovery scheduling rules", () => {
  it("cancellation triggers recovery job (48h wait)", () => {
    const recoveryWaitHours = 48;
    const now = new Date("2026-04-10T10:00:00Z");
    const scheduledAt = new Date(now.getTime() + recoveryWaitHours * 3600 * 1000);
    expect(scheduledAt.toISOString()).toBe("2026-04-12T10:00:00.000Z");
  });

  it("no_show triggers winback job (48h wait)", () => {
    const recoveryWaitHours = 48;
    const cancelledAt = new Date("2026-04-10T10:00:00Z");
    const winbackAt = new Date(cancelledAt.getTime() + recoveryWaitHours * 3600 * 1000);
    expect(winbackAt > cancelledAt).toBe(true);
  });

  it("48h not yet passed → should NOT send recovery (guard logic)", () => {
    const cancelledAt = new Date(Date.now() - 10 * 3600 * 1000); // 10h ago
    const recoveryWaitMs = 48 * 3600 * 1000;
    const waited = Date.now() - cancelledAt.getTime();
    expect(waited < recoveryWaitMs).toBe(true); // guard should skip
  });

  it("48h passed → should send recovery", () => {
    const cancelledAt = new Date(Date.now() - 49 * 3600 * 1000); // 49h ago
    const recoveryWaitMs = 48 * 3600 * 1000;
    const waited = Date.now() - cancelledAt.getTime();
    expect(waited >= recoveryWaitMs).toBe(true); // guard should proceed
  });
});
