import type { Metadata } from "next";
import Sidebar from "../../components/admin/Sidebar";
import { getDb, leads } from "@beauty-booking/db";
import { eq, and, count } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Admin — Vienna Glow Studio",
  robots: { index: false, follow: false },
};

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";

async function getEscalationCount(): Promise<number> {
  try {
    const db = getDb();
    const [{ total }] = await db
      .select({ total: count() })
      .from(leads)
      .where(and(
        eq(leads.clientId, CLIENT_ID),
        eq(leads.assignedTo, "human_review"),
        eq(leads.status, "new"),
      ));
    return total ?? 0;
  } catch {
    return 0;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const escalationCount = await getEscalationCount();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#f4f4f2" }}>
      <Sidebar escalationCount={escalationCount} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {children}
      </div>
    </div>
  );
}
