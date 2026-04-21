import FrontDeskBoard from "./FrontDeskBoard";

interface FrontDeskBooking {
  id: string;
  customerName: string;
  customerContact: string;
  appointmentAt: string;
  appointmentTime: string;
  durationMinutes: number;
  status: string;
  serviceName: string | null;
  notes: string | null;
  createdAt: string;
}

interface FrontDeskResponse {
  date: string;
  totalBookings: number;
  columns: {
    unconfirmed: FrontDeskBooking[];
    confirmed: FrontDeskBooking[];
    completed: FrontDeskBooking[];
  };
}

function getViennaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
  }).format(new Date());
}

function getViennaFormattedDate(): string {
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Vienna",
  }).format(new Date());
}

export default async function FrontDeskPage() {
  const today = getViennaToday();
  const formattedDate = getViennaFormattedDate();

  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3030";
  const adminSecret = process.env["ADMIN_SECRET"] ?? "change-me-in-production";

  let data: FrontDeskResponse | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/admin/front-desk?date=${today}`, {
      headers: { "x-admin-secret": adminSecret },
      cache: "no-store",
    });
    if (res.ok) {
      data = (await res.json()) as FrontDeskResponse;
    }
  } catch {
    // data stays null — rendered as error below
  }

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">Lead Management</span>
          <h2>Front Desk</h2>
        </div>
        <div className="adm-header-actions">
          <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>{formattedDate}</span>
        </div>
      </header>

      <div className="adm-body">
        {data === null ? (
          <div style={{
            background: "var(--color-error-soft)",
            color: "var(--color-error)",
            border: "1px solid var(--color-error)",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "14px",
          }}>
            Daten konnten nicht geladen werden
          </div>
        ) : (
          <FrontDeskBoard initialData={data} />
        )}
      </div>
    </>
  );
}
