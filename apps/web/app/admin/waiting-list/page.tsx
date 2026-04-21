import WaitingListView from "./WaitingListView";

export const dynamic = "force-dynamic";

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

interface WaitingListResponse {
  entries: WaitingListEntry[];
  total: number;
  page: number;
  limit: number;
}

export default async function WaitingListPage() {
  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3030";
  const adminSecret = process.env["ADMIN_SECRET"] ?? "change-me-in-production";

  let data: WaitingListResponse | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/admin/waiting-list`, {
      headers: { "x-admin-secret": adminSecret },
      cache: "no-store",
    });
    if (res.ok) {
      data = (await res.json()) as WaitingListResponse;
    }
  } catch {
    // data stays null — rendered as error below
  }

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Warteliste</span>
          <h2>Warteliste</h2>
        </div>
      </header>
      <WaitingListView initialData={data} />
    </>
  );
}
