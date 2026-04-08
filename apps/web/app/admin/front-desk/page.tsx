import AdminHeader from "../../../components/admin/AdminHeader";
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
      <AdminHeader title={`Front Desk — ${formattedDate}`} />
      <main className="p-6" style={{ minHeight: "calc(100vh - 65px)" }}>
        {data === null ? (
          <div
            className="rounded-sm border p-6 text-sm text-center"
            style={{ borderColor: "var(--color-accent)", color: "#dc2626" }}
          >
            Daten konnten nicht geladen werden
          </div>
        ) : (
          <FrontDeskBoard initialData={data} />
        )}
      </main>
    </>
  );
}
