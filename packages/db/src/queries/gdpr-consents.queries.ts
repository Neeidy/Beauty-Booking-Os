import { eq } from "drizzle-orm";
import { getDb, gdprConsents, type NewGdprConsent, type GdprConsent } from "../index.js";

export async function createGdprConsent(data: NewGdprConsent): Promise<GdprConsent> {
  const db = getDb();
  const [consent] = await db.insert(gdprConsents).values(data).returning();
  if (!consent) throw new Error("Failed to create GDPR consent");
  return consent;
}

export async function createGdprConsents(
  items: NewGdprConsent[]
): Promise<GdprConsent[]> {
  if (items.length === 0) return [];
  const db = getDb();
  return db.insert(gdprConsents).values(items).returning();
}

export async function getGdprConsentsByLead(leadId: string): Promise<GdprConsent[]> {
  const db = getDb();
  return db
    .select()
    .from(gdprConsents)
    .where(eq(gdprConsents.leadId, leadId));
}

export async function revokeGdprConsent(id: string): Promise<GdprConsent> {
  const db = getDb();
  const [updated] = await db
    .update(gdprConsents)
    .set({ revokedAt: new Date() })
    .where(eq(gdprConsents.id, id))
    .returning();
  if (!updated) throw new Error(`GDPR consent ${id} not found`);
  return updated;
}
