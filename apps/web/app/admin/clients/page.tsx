export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb, leads } from "@beauty-booking/db";
import { eq, asc } from "drizzle-orm";

const CLIENT_ID = process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

interface CustomerRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  language: string | null;
  firstSeenAt: string;
}

async function getCustomers(): Promise<CustomerRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: leads.id,
      customerName: leads.customerName,
      customerPhone: leads.customerPhone,
      customerEmail: leads.customerEmail,
      language: leads.language,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(eq(leads.clientId, CLIENT_ID))
    .orderBy(asc(leads.createdAt));

  // Deduplicate — keep earliest lead per phone (or per lead id if no phone)
  const seen = new Set<string>();
  const customers: CustomerRow[] = [];
  for (const row of rows) {
    const key = row.customerPhone ?? row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    customers.push({
      id: row.id,
      name: row.customerName ?? null,
      phone: row.customerPhone ?? null,
      email: row.customerEmail ?? null,
      language: row.language ?? null,
      firstSeenAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    });
  }
  return customers;
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
          <h2>Kunden</h2>
        </div>
        <div className="adm-header-actions">
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {customers.length} gesamt
          </span>
        </div>
      </header>
      <main className="adm-body">
        {customers.length === 0 ? (
          <div
            className="rounded-sm border p-6 text-sm text-center"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            Noch keine Kunden vorhanden.
          </div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Kunde</th>
                <th>Telefon</th>
                <th>E-Mail</th>
                <th>Sprache</th>
                <th>Erstkontakt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const identifier = c.phone
                  ? encodeURIComponent(c.phone)
                  : c.id;
                const initials = (c.name ?? "?")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const date = new Intl.DateTimeFormat("de-AT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  timeZone: "Europe/Vienna",
                }).format(new Date(c.firstSeenAt));
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="client-name-cell">
                        <div className="client-avatar">{initials}</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "14px" }}>{c.name ?? "—"}</div>
                          {c.email && (
                            <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{c.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{c.phone ?? "—"}</td>
                    <td>{c.email ?? "—"}</td>
                    <td>{c.language ?? "—"}</td>
                    <td>{date}</td>
                    <td>
                      <Link
                        href={`/admin/clients/${identifier}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Profil →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
