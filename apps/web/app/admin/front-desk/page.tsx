export const dynamic = "force-dynamic";

import FrontDeskBoard from "./FrontDeskBoard";
import type { FrontDeskLead } from "./LeadCard";

type Lane = "new" | "contacted" | "qualified" | "booked" | "lost";

interface FrontDeskColumns {
  new: FrontDeskLead[];
  contacted: FrontDeskLead[];
  qualified: FrontDeskLead[];
  booked: FrontDeskLead[];
  lost: FrontDeskLead[];
}

interface LeadsApiResponse {
  leads: FrontDeskLead[];
  total: number;
}

function statusToLane(status: string): Lane {
  if (status === "contacted") return "contacted";
  if (status === "qualified" || status === "booking_started") return "qualified";
  if (status === "booked") return "booked";
  if (status === "lost" || status === "spam") return "lost";
  return "new";
}

export default async function FrontDeskPage() {
  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3030";
  const adminSecret = process.env["ADMIN_SECRET"] ?? "change-me-in-production";

  const empty: FrontDeskColumns = {
    new: [], contacted: [], qualified: [], booked: [], lost: [],
  };

  const columns: FrontDeskColumns = { ...empty };

  try {
    const res = await fetch(
      `${baseUrl}/api/admin/leads?limit=100`,
      {
        headers: { "x-admin-secret": adminSecret },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = (await res.json()) as LeadsApiResponse;
      for (const lead of data.leads) {
        const lane = statusToLane(lead.status);
        columns[lane].push(lead);
      }
    }
  } catch {
    // renders with empty columns
  }

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Lead Management</span>
          <h2>Front Desk</h2>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-ghost btn-sm">Exportieren</button>
          <button className="btn btn-primary btn-sm">+ Neuer Lead</button>
        </div>
      </header>

      <FrontDeskBoard initialColumns={columns} />
    </>
  );
}
