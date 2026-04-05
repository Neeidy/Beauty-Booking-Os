import { type NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "../../../../../lib/admin-auth.js";
import { getDb, leads, bookings, messages, gdprConsents, eventLogs } from "@beauty-booking/db";
import { eq, and, isNull } from "drizzle-orm";
import {
  deleteLeadData,
  ANONYMIZED_NAME,
  ANONYMIZED_EMAIL,
  ANONYMIZED_PHONE,
  ANONYMIZED_MESSAGE,
} from "@beauty-booking/core";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = params;
  const db = getDb();

  const result = await deleteLeadData(leadId, {
    getLead: async (id) => {
      const [lead] = await db
        .select({ id: leads.id, clientId: leads.clientId })
        .from(leads)
        .where(eq(leads.id, id))
        .limit(1);
      return lead ?? undefined;
    },

    anonymizeLead: async (id) => {
      await db
        .update(leads)
        .set({
          customerName: ANONYMIZED_NAME,
          customerEmail: ANONYMIZED_EMAIL,
          customerPhone: ANONYMIZED_PHONE,
          rawMessage: ANONYMIZED_MESSAGE,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, id));
    },

    anonymizeBookingsForLead: async (id) => {
      const result = await db
        .update(bookings)
        .set({
          customerName: ANONYMIZED_NAME,
          customerContact: ANONYMIZED_EMAIL,
          notes: null,
          updatedAt: new Date(),
        })
        .where(eq(bookings.leadId, id));
      return (result as unknown as { rowCount: number }).rowCount ?? 0;
    },

    anonymizeMessagesForLead: async (id) => {
      const result = await db
        .update(messages)
        .set({ body: ANONYMIZED_MESSAGE })
        .where(eq(messages.leadId, id));
      return (result as unknown as { rowCount: number }).rowCount ?? 0;
    },

    revokeConsentsForLead: async (id) => {
      const result = await db
        .update(gdprConsents)
        .set({ revokedAt: new Date() })
        .where(and(eq(gdprConsents.leadId, id), isNull(gdprConsents.revokedAt)));
      return (result as unknown as { rowCount: number }).rowCount ?? 0;
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
