/**
 * GDPR Right to Data Portability — Data Export
 *
 * Collects all personal data stored for a lead and returns it as a
 * structured JSON object. Logs the export event.
 */

export interface LeadRecord {
  id: string;
  clientId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  rawMessage: string | null;
  intent: string | null;
  status: string;
  source: string;
  language: string | null;
  gdprConsentAt: Date | null;
  gdprConsentMethod: string | null;
  createdAt: Date;
}

export interface BookingRecord {
  id: string;
  customerName: string;
  customerContact: string;
  appointmentAt: Date;
  status: string;
  notes: string | null;
}

export interface MessageRecord {
  id: string;
  channel: string;
  direction: string;
  senderType: string;
  body: string;
  sentAt: Date;
}

export interface ConsentRecord {
  id: string;
  consentType: string;
  granted: boolean;
  method: string;
  grantedAt: Date;
  revokedAt: Date | null;
}

export interface GdprExportResult {
  exportedAt: string;
  leadId: string;
  personalData: {
    lead: LeadRecord;
    bookings: BookingRecord[];
    messages: MessageRecord[];
    consents: ConsentRecord[];
  };
  dataCategories: string[];
}

export interface DataExportDeps {
  getLead: (leadId: string) => Promise<LeadRecord | undefined>;
  getBookingsForLead: (leadId: string) => Promise<BookingRecord[]>;
  getMessagesForLead: (leadId: string) => Promise<MessageRecord[]>;
  getConsentsForLead: (leadId: string) => Promise<ConsentRecord[]>;
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

export async function exportLeadData(
  leadId: string,
  deps: DataExportDeps
): Promise<GdprExportResult | null> {
  const lead = await deps.getLead(leadId);
  if (!lead) return null;

  const [bookings, messages, consents] = await Promise.all([
    deps.getBookingsForLead(leadId),
    deps.getMessagesForLead(leadId),
    deps.getConsentsForLead(leadId),
  ]);

  // Determine which categories of personal data are present
  const dataCategories: string[] = ["contact_info", "booking_history"];
  if (messages.length > 0) dataCategories.push("communication_history");
  if (consents.length > 0) dataCategories.push("consent_records");

  await deps.logEvent({
    clientId: lead.clientId,
    leadId,
    eventType: "gdpr_export",
    agentName: "system",
    outputSummary: `Exported ${bookings.length} bookings, ${messages.length} messages, ${consents.length} consents`,
    status: "success",
    tokenCount: 0,
  });

  return {
    exportedAt: new Date().toISOString(),
    leadId,
    personalData: { lead, bookings, messages, consents },
    dataCategories,
  };
}
