export const dynamic = "force-dynamic";

import FrontDeskBoard from "./FrontDeskBoard";
import type { FrontDeskLead } from "./LeadCard";
import { getDb, leads } from "@beauty-booking/db";
import { eq, desc } from "drizzle-orm";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000000";

type Lane = "new" | "contacted" | "qualified" | "booked" | "lost";

interface FrontDeskColumns {
  new: FrontDeskLead[];
  contacted: FrontDeskLead[];
  qualified: FrontDeskLead[];
  booked: FrontDeskLead[];
  lost: FrontDeskLead[];
}

function statusToLane(status: string): Lane {
  if (status === "contacted") return "contacted";
  if (status === "qualified" || status === "booking_started") return "qualified";
  if (status === "booked") return "booked";
  if (status === "lost" || status === "spam") return "lost";
  return "new";
}

export default async function FrontDeskPage() {
  const dict = getDictionary(await getLocale());
  const t = dict.admin.frontDesk;

  const empty: FrontDeskColumns = {
    new: [], contacted: [], qualified: [], booked: [], lost: [],
  };

  const columns: FrontDeskColumns = { ...empty };

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(leads)
      .where(eq(leads.clientId, CLIENT_ID))
      .orderBy(desc(leads.createdAt))
      .limit(100);

    for (const row of rows) {
      const lead: FrontDeskLead = {
        ...row,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      };
      const lane = statusToLane(lead.status);
      columns[lane].push(lead);
    }
  } catch {
    // renders with empty columns
  }

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">{t.breadcrumb}</span>
          <h2>{t.title}</h2>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-ghost btn-sm">{t.export}</button>
          <button className="btn btn-primary btn-sm">{t.newLead}</button>
        </div>
      </header>

      <FrontDeskBoard initialColumns={columns} />
    </>
  );
}
