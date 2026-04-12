export const dynamic = "force-dynamic";

import Link from "next/link";
import AdminHeader from "../../../components/admin/AdminHeader";
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
      <AdminHeader title="Müşteriler" />
      <main className="p-6" style={{ minHeight: "calc(100vh - 65px)" }}>
        {customers.length === 0 ? (
          <div
            className="rounded-sm border p-6 text-sm text-center"
            style={{ borderColor: "var(--color-accent)", color: "var(--color-text-muted)" }}
          >
            Henüz müşteri yok
          </div>
        ) : (
          <div className="rounded-sm border overflow-hidden" style={{ borderColor: "var(--color-accent)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--color-primary)", color: "var(--color-background)" }}>
                  <th className="text-left px-4 py-3 font-medium">İsim</th>
                  <th className="text-left px-4 py-3 font-medium">Telefon</th>
                  <th className="text-left px-4 py-3 font-medium">E-posta</th>
                  <th className="text-left px-4 py-3 font-medium">Dil</th>
                  <th className="text-left px-4 py-3 font-medium">İlk Kayıt</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => {
                  const identifier = c.phone
                    ? encodeURIComponent(c.phone)
                    : c.id;
                  const bg = i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)";
                  const date = new Intl.DateTimeFormat("de-AT", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: "Europe/Vienna",
                  }).format(new Date(c.firstSeenAt));
                  return (
                    <tr key={c.id} style={{ backgroundColor: bg, color: "var(--color-text)" }}>
                      <td className="px-4 py-3">{c.name ?? "—"}</td>
                      <td className="px-4 py-3">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3">{c.email ?? "—"}</td>
                      <td className="px-4 py-3">{c.language ?? "—"}</td>
                      <td className="px-4 py-3">{date}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/clients/${identifier}`}
                          className="text-xs underline"
                          style={{ color: "var(--color-secondary)" }}
                        >
                          Profili Gör
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
