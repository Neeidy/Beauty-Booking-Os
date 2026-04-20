import type { Metadata } from "next";
import Sidebar from "../../components/admin/Sidebar";
import { getDb, leads } from "@beauty-booking/db";
import { eq, and, count } from "drizzle-orm";

export const metadata: Metadata = {
  title: `Admin — ${process.env["NEXT_PUBLIC_SALON_NAME"] ?? "Beauty Studio"}`,
  robots: { index: false, follow: false },
};

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";

async function getEscalationCount(): Promise<number> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ total: count() })
      .from(leads)
      .where(and(
        eq(leads.clientId, CLIENT_ID),
        eq(leads.assignedTo, "human_review"),
        eq(leads.status, "new"),
      ));
    return row?.total ?? 0;
  } catch {
    return 0;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const escalationCount = await getEscalationCount();

  return (
    <div className="admin-layout">
      <Sidebar escalationCount={escalationCount} />
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
