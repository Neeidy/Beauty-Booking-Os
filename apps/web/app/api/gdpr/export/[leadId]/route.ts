import { type NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, leads, bookings, messages, gdprConsents, eventLogs } from "@beauty-booking/db";
import { eq } from "drizzle-orm";
import { exportLeadData } from "@beauty-booking/core";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await params;
  const db = getDb();

  const result = await exportLeadData(leadId, {
    getLead: async (id) => {
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, id))
        .limit(1);
      return lead ?? undefined;
    },

    getBookingsForLead: async (id) => {
      return db
        .select({
          id: bookings.id,
          customerName: bookings.customerName,
          customerContact: bookings.customerContact,
          appointmentAt: bookings.appointmentAt,
          status: bookings.status,
          notes: bookings.notes,
        })
        .from(bookings)
        .where(eq(bookings.leadId, id));
    },

    getMessagesForLead: async (id) => {
      return db
        .select({
          id: messages.id,
          channel: messages.channel,
          direction: messages.direction,
          senderType: messages.senderType,
          body: messages.body,
          sentAt: messages.sentAt,
        })
        .from(messages)
        .where(eq(messages.leadId, id));
    },

    getConsentsForLead: async (id) => {
      return db
        .select({
          id: gdprConsents.id,
          consentType: gdprConsents.consentType,
          granted: gdprConsents.granted,
          method: gdprConsents.method,
          grantedAt: gdprConsents.grantedAt,
          revokedAt: gdprConsents.revokedAt,
        })
        .from(gdprConsents)
        .where(eq(gdprConsents.leadId, id));
    },

    logEvent: async (data) => {
      await db.insert(eventLogs).values({
        clientId: data.clientId,
        leadId: data.leadId,
        eventType: data.eventType,
        agentName: data.agentName,
        outputSummary: data.outputSummary,
        status: data.status,
        tokenCount: data.tokenCount,
      });
    },
  });

  if (!result) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
