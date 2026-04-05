import { type NextRequest, NextResponse } from "next/server";
import { getDb, clients, leads, bookings, messages, gdprConsents, eventLogs } from "@beauty-booking/db";
import { eq, and, lt, isNull } from "drizzle-orm";
import { runDataRetention } from "@beauty-booking/core";
import { logger } from "@beauty-booking/shared";

function verifyAuth(request: NextRequest): boolean {
  const secret = process.env["WEBHOOK_SECRET"];
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/jobs/retention
 *
 * Triggers GDPR data retention — anonymizes leads older than the salon's
 * configured dataRetentionDays. Requires bearer auth.
 *
 * Query params:
 *   dry_run=true — scan only, no writes
 */
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dry_run") === "true";
  const db = getDb();

  const results = await runDataRetention(
    {
      getClients: async () => {
        return db
          .select({
            id: clients.id,
            slug: clients.slug,
            dataRetentionDays: clients.dataRetentionDays,
          })
          .from(clients)
          .where(eq(clients.status, "active"));
      },

      getExpiredLeads: async (clientId, olderThanDate) => {
        return db
          .select({ id: leads.id })
          .from(leads)
          .where(
            and(
              eq(leads.clientId, clientId),
              lt(leads.createdAt, olderThanDate),
              // Only anonymize leads that haven't already been anonymized
              isNull(leads.customerName).mapWith(() => false) // non-null = not yet anonymized
            )
          );
      },

      anonymizeLead: async (leadId) => {
        await db
          .update(leads)
          .set({
            customerName: "ANONYMIZED",
            customerEmail: "anonymized@deleted.local",
            customerPhone: "0000000000",
            rawMessage: "ANONYMIZED",
            updatedAt: new Date(),
          })
          .where(eq(leads.id, leadId));
      },

      anonymizeBookingsForLead: async (leadId) => {
        const result = await db
          .update(bookings)
          .set({
            customerName: "ANONYMIZED",
            customerContact: "anonymized@deleted.local",
            notes: null,
            updatedAt: new Date(),
          })
          .where(eq(bookings.leadId, leadId));
        return (result as unknown as { rowCount: number }).rowCount ?? 0;
      },

      anonymizeMessagesForLead: async (leadId) => {
        const result = await db
          .update(messages)
          .set({ body: "ANONYMIZED" })
          .where(eq(messages.leadId, leadId));
        return (result as unknown as { rowCount: number }).rowCount ?? 0;
      },

      revokeConsentsForLead: async (leadId) => {
        const result = await db
          .update(gdprConsents)
          .set({ revokedAt: new Date() })
          .where(and(eq(gdprConsents.leadId, leadId), isNull(gdprConsents.revokedAt)));
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
    },
    dryRun
  );

  const totalScanned = results.reduce((s, r) => s + r.leadsScanned, 0);
  const totalAnonymized = results.reduce((s, r) => s + r.leadsAnonymized, 0);

  logger.info("Data retention run complete", { dryRun, totalScanned, totalAnonymized });

  return NextResponse.json({
    dryRun,
    clientsProcessed: results.length,
    totalLeadsScanned: totalScanned,
    totalLeadsAnonymized: totalAnonymized,
    details: results,
  });
}
