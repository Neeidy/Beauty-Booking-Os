/**
 * GDPR Right to Erasure — Data Anonymization
 *
 * Anonymizes all personal data for a lead. Uses anonymization rather than
 * hard deletion to preserve referential integrity and aggregate statistics.
 *
 * Structural data (dates, statuses, service IDs) is preserved.
 * All PII (names, emails, phones, messages) is replaced with placeholders.
 */

export const ANONYMIZED_NAME    = "ANONYMIZED";
export const ANONYMIZED_EMAIL   = "anonymized@deleted.local";
export const ANONYMIZED_PHONE   = "0000000000";
export const ANONYMIZED_MESSAGE = "ANONYMIZED";

export interface DeletionResult {
  anonymized: boolean;
  recordsAffected: number;
}

export interface DataDeletionDeps {
  getLead: (leadId: string) => Promise<{ id: string; clientId: string } | undefined>;
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

export async function deleteLeadData(
  leadId: string,
  deps: DataDeletionDeps
): Promise<DeletionResult | null> {
  const lead = await deps.getLead(leadId);
  if (!lead) return null;

  // Anonymize in parallel where safe
  const [bookingCount, messageCount, consentCount] = await Promise.all([
    deps.anonymizeBookingsForLead(leadId),
    deps.anonymizeMessagesForLead(leadId),
    deps.revokeConsentsForLead(leadId),
  ]);

  // Lead anonymization last (structural record must exist for FK integrity)
  await deps.anonymizeLead(leadId);

  const recordsAffected = 1 + bookingCount + messageCount + consentCount;

  await deps.logEvent({
    clientId: lead.clientId,
    leadId,
    eventType: "gdpr_deletion",
    agentName: "system",
    outputSummary: `Anonymized lead + ${bookingCount} bookings + ${messageCount} messages + ${consentCount} consents`,
    status: "success",
    tokenCount: 0,
  });

  return { anonymized: true, recordsAffected };
}
