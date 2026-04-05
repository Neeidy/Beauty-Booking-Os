/**
 * Alerter utility.
 *
 * Checks system health thresholds and returns structured alerts.
 * Used by the health check endpoint and can be called from scheduled jobs.
 *
 * Design: pure functions with injectable deps — no side effects, fully testable.
 */

export interface AlertThresholds {
  failedJobsMax: number;         // Alert if failed jobs in 24h exceed this
  escalationQueueMax: number;    // Alert if unhandled escalations exceed this
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  failedJobsMax: 5,
  escalationQueueMax: 10,
};

export interface SystemMetrics {
  failedJobsLast24h: number;
  pendingEscalations: number;
}

export interface AlertResult {
  hasAlerts: boolean;
  alerts: Array<{
    level: "warning" | "critical";
    code: string;
    message: string;
    value: number;
    threshold: number;
  }>;
}

/**
 * Evaluates system metrics against thresholds and returns alerts.
 * Pure function — no I/O.
 */
export function evaluateAlerts(
  metrics: SystemMetrics,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): AlertResult {
  const alerts: AlertResult["alerts"] = [];

  if (metrics.failedJobsLast24h >= thresholds.failedJobsMax) {
    alerts.push({
      level: "warning",
      code: "FAILED_JOBS_THRESHOLD",
      message: `${metrics.failedJobsLast24h} failed jobs in the last 24h (limit: ${thresholds.failedJobsMax})`,
      value: metrics.failedJobsLast24h,
      threshold: thresholds.failedJobsMax,
    });
  }

  if (metrics.pendingEscalations >= thresholds.escalationQueueMax) {
    alerts.push({
      level: "warning",
      code: "ESCALATION_QUEUE_THRESHOLD",
      message: `${metrics.pendingEscalations} leads waiting for human review (limit: ${thresholds.escalationQueueMax})`,
      value: metrics.pendingEscalations,
      threshold: thresholds.escalationQueueMax,
    });
  }

  return {
    hasAlerts: alerts.length > 0,
    alerts,
  };
}
