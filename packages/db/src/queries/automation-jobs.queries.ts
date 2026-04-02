import { getDb, automationJobs, type NewAutomationJob, type AutomationJob } from "../index.js";

export async function createAutomationJob(data: NewAutomationJob): Promise<AutomationJob> {
  const db = getDb();
  const [job] = await db.insert(automationJobs).values(data).returning();
  if (!job) throw new Error("Failed to create automation job");
  return job;
}

export async function createAutomationJobs(
  items: NewAutomationJob[]
): Promise<AutomationJob[]> {
  if (items.length === 0) return [];
  const db = getDb();
  return db.insert(automationJobs).values(items).returning();
}
