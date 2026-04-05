import { describe, it, expect } from "vitest";
import { evaluateAlerts, DEFAULT_THRESHOLDS } from "../utils/alerter.js";

describe("evaluateAlerts", () => {
  it("returns no alerts when all metrics are below thresholds", () => {
    const result = evaluateAlerts({ failedJobsLast24h: 0, pendingEscalations: 0 });
    expect(result.hasAlerts).toBe(false);
    expect(result.alerts).toHaveLength(0);
  });

  it("alerts when failed jobs meet threshold (>=)", () => {
    const result = evaluateAlerts(
      { failedJobsLast24h: 5, pendingEscalations: 0 },
      { failedJobsMax: 5, escalationQueueMax: 10 }
    );
    expect(result.hasAlerts).toBe(true);
    expect(result.alerts[0]!.code).toBe("FAILED_JOBS_THRESHOLD");
    expect(result.alerts[0]!.level).toBe("warning");
    expect(result.alerts[0]!.value).toBe(5);
  });

  it("alerts when escalation queue meets threshold (>=)", () => {
    const result = evaluateAlerts(
      { failedJobsLast24h: 0, pendingEscalations: 10 },
      { failedJobsMax: 5, escalationQueueMax: 10 }
    );
    expect(result.hasAlerts).toBe(true);
    expect(result.alerts[0]!.code).toBe("ESCALATION_QUEUE_THRESHOLD");
    expect(result.alerts[0]!.value).toBe(10);
  });

  it("returns both alerts when both thresholds exceeded", () => {
    const result = evaluateAlerts(
      { failedJobsLast24h: 10, pendingEscalations: 15 },
      { failedJobsMax: 5, escalationQueueMax: 10 }
    );
    expect(result.hasAlerts).toBe(true);
    expect(result.alerts).toHaveLength(2);
    const codes = result.alerts.map((a) => a.code);
    expect(codes).toContain("FAILED_JOBS_THRESHOLD");
    expect(codes).toContain("ESCALATION_QUEUE_THRESHOLD");
  });

  it("no alert when 1 below threshold (boundary)", () => {
    const result = evaluateAlerts(
      { failedJobsLast24h: 4, pendingEscalations: 9 },
      { failedJobsMax: 5, escalationQueueMax: 10 }
    );
    expect(result.hasAlerts).toBe(false);
  });

  it("uses DEFAULT_THRESHOLDS when none provided", () => {
    // Below default thresholds — no alerts
    const below = evaluateAlerts({ failedJobsLast24h: 4, pendingEscalations: 9 });
    expect(below.hasAlerts).toBe(false);

    // At default thresholds — alerts
    const at = evaluateAlerts({
      failedJobsLast24h: DEFAULT_THRESHOLDS.failedJobsMax,
      pendingEscalations: 0,
    });
    expect(at.hasAlerts).toBe(true);
  });
});
