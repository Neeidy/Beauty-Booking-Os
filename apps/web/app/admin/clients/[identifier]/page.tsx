import Link from "next/link";
import AdminHeader from "../../../../components/admin/AdminHeader";
import ClientProfileView from "./ClientProfileView";

export const dynamic = "force-dynamic";

interface ClientBooking {
  id: string;
  appointmentAt: string;
  appointmentTime: string;
  status: string;
  serviceName: string | null;
  durationMinutes: number;
  notes: string | null;
  createdAt: string;
}

interface ClientProfileResponse {
  identifier: string;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    language: string | null;
    firstSeenAt: string;
  } | null;
  summary: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    noshowCount: number;
    showRate: number;
  };
  bookings: ClientBooking[];
}

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ identifier: string }>;
}) {
  const { identifier } = await params;

  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3030";
  const adminSecret = process.env["ADMIN_SECRET"] ?? "change-me-in-production";

  let data: ClientProfileResponse | null = null;

  try {
    const res = await fetch(
      `${baseUrl}/api/admin/clients/${encodeURIComponent(identifier)}`,
      {
        headers: { "x-admin-secret": adminSecret },
        cache: "no-store",
      },
    );
    if (res.ok) {
      data = (await res.json()) as ClientProfileResponse;
    }
  } catch {
    // data stays null — rendered as error below
  }

  return (
    <>
      <AdminHeader title="Müşteri Profili" />
      <main className="p-6" style={{ minHeight: "calc(100vh - 65px)" }}>
        {data === null ? (
          <div
            className="rounded-sm border p-6 text-sm text-center space-y-3"
            style={{ borderColor: "var(--color-accent)", color: "#dc2626" }}
          >
            <p>Profil yüklenemedi</p>
            <Link
              href="/admin/leads"
              className="text-sm underline"
              style={{ color: "var(--color-secondary)" }}
            >
              ← Müşterilere Dön
            </Link>
          </div>
        ) : data.customer === null ? (
          <div
            className="flex flex-col items-center justify-center py-24 gap-3 text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            <p>Müşteri bulunamadı</p>
            <Link
              href="/admin/leads"
              className="text-sm underline"
              style={{ color: "var(--color-secondary)" }}
            >
              ← Müşterilere Dön
            </Link>
          </div>
        ) : (
          <ClientProfileView data={data} />
        )}
      </main>
    </>
  );
}
