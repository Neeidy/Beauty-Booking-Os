import { eq, desc, and } from "drizzle-orm";
import { getDb, leads, type NewLead, type Lead } from "../index.js";

export async function createLead(data: NewLead): Promise<Lead> {
  const db = getDb();
  const [lead] = await db.insert(leads).values(data).returning();
  if (!lead) throw new Error("Failed to create lead");
  return lead;
}

export async function getLeadById(id: string): Promise<Lead | undefined> {
  const db = getDb();
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  return lead;
}

export async function updateLeadStatus(
  id: string,
  status: Lead["status"],
  extras: Partial<Pick<Lead, "intent" | "intentConfidence" | "assignedTo">> = {}
): Promise<Lead> {
  const db = getDb();
  const [updated] = await db
    .update(leads)
    .set({ status, ...extras, updatedAt: new Date() })
    .where(eq(leads.id, id))
    .returning();
  if (!updated) throw new Error(`Lead ${id} not found`);
  return updated;
}

export async function listLeadsByClient(
  clientId: string,
  limit = 50,
  offset = 0
): Promise<Lead[]> {
  const db = getDb();
  return db
    .select()
    .from(leads)
    .where(eq(leads.clientId, clientId))
    .orderBy(desc(leads.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function markLeadEscalated(
  id: string,
  assignedTo: string
): Promise<Lead> {
  return updateLeadStatus(id, "qualified", { assignedTo });
}
