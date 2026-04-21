export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb, leads, bookings } from "@beauty-booking/db";
import { eq, desc } from "drizzle-orm";

const CLIENT_ID = process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

const AVATAR_VARIANTS = ["", " v2", " v3", " v4"];

const SOURCE_BADGE: Record<string, string> = {
  web_form:     "🌐 Web",
  google:       "📱 Google",
  google_business: "📱 Google",
  phone:        "☎ Telefon",
  instagram_dm: "📸 Instagram",
};

interface CustomerRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  totalBookings: number;
  lastVisit: string | null;
  nextAppointment: string | null;
  isVip: boolean;
}

async function getCustomers(): Promise<CustomerRow[]> {
  const db = getDb();

  // Fetch all leads deduplicated by phone
  const rows = await db
    .select({
      id: leads.id,
      customerName: leads.customerName,
      customerPhone: leads.customerPhone,
      customerEmail: leads.customerEmail,
      source: leads.source,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(eq(leads.clientId, CLIENT_ID))
    .orderBy(desc(leads.createdAt));

  const seen = new Set<string>();
  const unique: typeof rows = [];
  for (const row of rows) {
    const key = row.customerPhone ?? row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  // Fetch booking counts and last/next visits
  const bookingRows = await db
    .select({
      customerName: bookings.customerName,
      customerContact: bookings.customerContact,
      appointmentAt: bookings.appointmentAt,
      status: bookings.status,
    })
    .from(bookings)
    .where(eq(bookings.clientId, CLIENT_ID));

  const now = new Date().toISOString();

  const customers: CustomerRow[] = unique.map((row, idx) => {
    const contactKey = row.customerPhone ?? row.customerEmail ?? row.id;
    const related = bookingRows.filter(
      (b) => b.customerContact === contactKey || b.customerName === row.customerName
    );
    const completed = related.filter((b) => b.status === "completed");
    const upcoming = related.filter(
      (b) => (b.status === "confirmed" || b.status === "pending") &&
        (b.appointmentAt instanceof Date
          ? b.appointmentAt.toISOString()
          : String(b.appointmentAt)) > now
    );

    const lastVisitDate = completed.length > 0
      ? completed
          .map((b) => (b.appointmentAt instanceof Date ? b.appointmentAt.toISOString() : String(b.appointmentAt)))
          .sort()
          .reverse()[0] ?? null
      : null;

    const nextAppt = upcoming.length > 0
      ? upcoming
          .map((b) => (b.appointmentAt instanceof Date ? b.appointmentAt.toISOString() : String(b.appointmentAt)))
          .sort()[0] ?? null
      : null;

    return {
      id: row.id,
      name: row.customerName ?? null,
      phone: row.customerPhone ?? null,
      email: row.customerEmail ?? null,
      source: row.source ?? null,
      totalBookings: related.length,
      lastVisit: lastVisitDate,
      nextAppointment: nextAppt,
      isVip: related.length >= 10,
    };
  });

  return customers;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("de-AT", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Europe/Vienna",
  }).format(new Date(iso));
}

export default async function ClientsPage() {
  let customers: CustomerRow[] = [];
  try {
    customers = await getCustomers();
  } catch {
    // renders empty state below
  }

  return (
    <>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">CRM</span>
          <h2>
            Kunden{" "}
            <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "14px", marginLeft: "8px" }}>
              · {customers.length} aktiv
            </span>
          </h2>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-ghost btn-sm">Exportieren</button>
          <button className="btn btn-primary btn-sm">+ Neuer Kunde</button>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-search">
          <input type="search" placeholder="Name, E-Mail oder Telefon..." readOnly />
        </div>
        <button className="adm-filter-chip active">Alle</button>
        <button className="adm-filter-chip">⭐ VIP ({customers.filter((c) => c.isVip).length})</button>
        <button className="adm-filter-chip">Aktiv (90 T)</button>
        <button className="adm-filter-chip">Inaktiv (&gt;180 T)</button>
        <button className="adm-filter-chip">Neu (30 T)</button>
      </div>

      <div className="adm-body">
        {customers.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">👤</div>
            <h4>Noch keine Kunden</h4>
            <p>Wenn Leads eingehen, erscheinen sie hier.</p>
          </div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Kunde</th>
                <th>Termine</th>
                <th>Letzter Besuch</th>
                <th>Nächster Termin</th>
                <th>Quelle</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => {
                const identifier = c.phone
                  ? encodeURIComponent(c.phone)
                  : c.id;
                const initials = (c.name ?? "?")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const avatarVariant = AVATAR_VARIANTS[idx % AVATAR_VARIANTS.length] ?? "";
                const sourceBadge = SOURCE_BADGE[c.source ?? ""] ?? null;

                return (
                  <tr key={c.id} onClick={() => {}} style={{ cursor: "pointer" }}>
                    <td>
                      <div className="client-name-cell">
                        <div className={`client-avatar${avatarVariant}`}>{initials}</div>
                        <div className="client-name-wrap">
                          <span className="client-name">
                            {c.name ?? "—"}
                            {c.isVip && <span className="client-vip">VIP</span>}
                          </span>
                          <span className="client-email">{c.email ?? c.phone ?? "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="client-stat">{c.totalBookings}</td>
                    <td>{formatDate(c.lastVisit)}</td>
                    <td>{formatDate(c.nextAppointment)}</td>
                    <td>
                      {sourceBadge && <span className="src-badge">{sourceBadge}</span>}
                    </td>
                    <td>
                      <Link
                        href={`/admin/clients/${identifier}`}
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
