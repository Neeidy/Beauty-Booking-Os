/**
 * GDPR Data Retention — Automated Cleanup
 *
 * Anonymizes personal data for leads older than the client's configured
 * data retention period. Preserves structural data (dates, statuses, IDs)
 * for reporting while removing all PII.
 *
 * Run on a schedule (e.g., daily via pg_cron or a cron job endpoint).
 */

import { ANONYMIZED_NAME, ANONYMIZED_EMAIL, ANONYMIZED_PHONE, ANONYMIZED_MESSAGE } from "./data-deletion.js";

export interface RetentionCheckResult {
  clientId: string;
  retentionDays: number;
  leadsScanned: number;
  leadsAnonymized: number;
  dryRun: boolean;
}

export interface DataRetentionDeps {
  getClients: () => Promise<Array<{ id: string; slug: string; dataRetentionDays: number }>>;
  getExpiredLeads: (clientId: string, olderThanDate: Date) => Promise<Array<{ id: string }>>;
  anonymizeLead: (leadId: string) => Promise<void>;
  anonymizeBookingsForLead: (leadId: string) => Promise<number>;
  anonymizeMessagesForLead: (leadId: string) => Promise<number>;
  revokeConsentsForLead: (leadId: string) => Promise<number>;
  logEvent: (data: {
    clientId: string;
    leadId: string;
    eventType: string;
    agentName: string;
    outputSummary: string;
    status: string;
    tokenCount: number;
  }) => Promise<void>;
}

/**
 * Runs data retention for all clients.
 *
 * @param deps - Injected DB operations
 * @param dryRun - If true, scans and reports but does NOT anonymize
 */
export async function runDataRetention(
  deps: DataRetentionDeps,
  dryRun = false
): Promise<RetentionCheckResult[]> {
  const clients = await deps.getClients();
  const results: RetentionCheckResult[] = [];

  for (const client of clients) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - client.dataRetentionDays);

    const expiredLeads = await deps.getExpiredLeads(client.id, cutoffDate);

    if (!dryRun) {
      for (const lead of expiredLeads) {
        // Parallel: anonymize related records
        await Promise.all([
          deps.anonymizeBookingsForLead(lead.id),
          deps.anonymizeMessagesForLead(lead.id),
          deps.revokeConsentsForLead(lead.id),
        ]);

        // Lead last (maintains FK integrity)
        await deps.anonymizeLead(lead.id);

        await deps.logEvent({
          clientId: client.id,
          leadId: lead.id,
          eventType: "gdpr_retention_anonymization",
          agentName: "system",
          outputSummary: `Auto-anonymized — exceeded ${client.dataRetentionDays}d retention period`,
          status: "success",
          tokenCount: 0,
        });
      }
    }

    results.push({
      clientId: client.id,
      retentionDays: client.dataRetentionDays,
      leadsScanned: expiredLeads.length,
      leadsAnonymized: dryRun ? 0 : expiredLeads.length,
      dryRun,
    });
  }

  return results;
}

export { ANONYMIZED_NAME, ANONYMIZED_EMAIL, ANONYMIZED_PHONE, ANONYMIZED_MESSAGE };
