import WaitingListView from "./WaitingListView";
import { getDb, leads } from "@beauty-booking/db";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000000";

interface WaitingListEntry {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  requestedDate: string;
  requestedServiceId: string;
  notified: boolean;
  registeredAt: string;
  createdAt: string;
}

interface WaitingListData {
  entries: WaitingListEntry[];
  total: number;
  page: number;
  limit: number;
}

export default async function WaitingListPage() {
  let data: WaitingListData | null = null;

  try {
    const db = getDb();

    const rows = await db
      .select({
        id: leads.id,
        customerName: leads.customerName,
        customerEmail: leads.customerEmail,
        customerPhone: leads.customerPhone,
        metadata: leads.metadata,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.clientId, CLIENT_ID),
          sql`${leads.metadata}->>'waitingList' = 'true'`,
        ),
      )
      .orderBy(leads.createdAt)
      .limit(20);

    const entries: WaitingListEntry[] = rows.map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone,
        requestedDate: (meta["requestedDate"] as string) ?? "",
        requestedServiceId: (meta["requestedServiceId"] as string) ?? "",
        notified: meta["waitingList_notified"] === true,
        registeredAt:
          (meta["waitingList_registeredAt"] as string) ??
          (row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt)),
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt),
      };
    });

    data = { entries, total: entries.length, page: 1, limit: 20 };
  } catch {
    // data stays null
  }

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Warteliste</span>
          <h2>
            Warteliste{" "}
            {data && (
              <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "14px", marginLeft: "8px" }}>
                · {data.total} wartend
              </span>
            )}
          </h2>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-ghost btn-sm">⟳ Erneut prüfen</button>
          <button className="btn btn-primary btn-sm">+ Manuell hinzufügen</button>
        </div>
      </header>
      <WaitingListView initialData={data} />
    </>
  );
}
