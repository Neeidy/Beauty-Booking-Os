import { eq, desc } from "drizzle-orm";
import { getDb, eventLogs, type NewEventLog, type EventLog } from "../index";

export async function logEvent(data: NewEventLog): Promise<EventLog> {
  const db = getDb();
  const [log] = await db.insert(eventLogs).values(data).returning();
  if (!log) throw new Error("Failed to create event log");
  return log;
}

export async function listEventLogsByClient(
  clientId: string,
  limit = 100,
  offset = 0
): Promise<EventLog[]> {
  const db = getDb();
  return db
    .select()
    .from(eventLogs)
    .where(eq(eventLogs.clientId, clientId))
    .orderBy(desc(eventLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listEventLogsByLead(
  leadId: string
): Promise<EventLog[]> {
  const db = getDb();
  return db
    .select()
    .from(eventLogs)
    .where(eq(eventLogs.leadId, leadId))
    .orderBy(desc(eventLogs.createdAt));
}
