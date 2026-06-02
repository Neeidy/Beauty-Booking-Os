export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb, leads, bookings, services } from "@beauty-booking/db";
import { eq, desc } from "drizzle-orm";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

const CLIENT_ID = process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

const AVATAR_VARIANTS = ["", " v2", " v3", " v4"];

interface CustomerRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  totalBookings: number;
  totalRevenueCents: number;
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

  // Fetch booking counts, revenue and last/next visits
  const bookingRows = await db
    .select({
      customerName: bookings.customerName,
      customerContact: bookings.customerContact,
      appointmentAt: bookings.appointmentAt,
      status: bookings.status,
      priceEur: services.priceEur,
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
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

    const totalRevenueCents = related.reduce(
      (sum, b) => sum + parseFloat(String(b.priceEur ?? "0")),
      0
    );

    return {
      id: row.id,
      name: row.customerName ?? null,
      phone: row.customerPhone ?? null,
      email: row.customerEmail ?? null,
      source: row.source ?? null,
      totalBookings: related.length,
      totalRevenueCents,
      lastVisit: lastVisitDate,
      nextAppointment: nextAppt,
      isVip: related.length >= 10,
    };
  });

  return customers;
}

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Europe/Vienna",
  }).format(new Date(iso));
}

export default async function ClientsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.admin.clients;
  const sourceLabels = dict.admin.sourceLabels as Record<string, string>;

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
          <span className="breadcrumb">{t.breadcrumb}</span>
          <h2>
            {t.title}{" "}
            <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "14px", marginLeft: "8px" }}>
              {t.activeSuffix.replace("{count}", String(customers.length))}
            </span>
          </h2>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-ghost btn-sm">{t.export}</button>
          <button className="btn btn-primary btn-sm">{t.newCustomer}</button>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-search">
          <input type="search" placeholder={t.searchPlaceholder} readOnly />
        </div>
        <button className="adm-filter-chip active">{t.filterAll}</button>
        <button className="adm-filter-chip">{t.filterVip.replace("{count}", String(customers.filter((c) => c.isVip).length))}</button>
        <button className="adm-filter-chip">{t.filterActive90}</button>
        <button className="adm-filter-chip">{t.filterInactive180}</button>
        <button className="adm-filter-chip">{t.filterNew30}</button>
      </div>

      <div className="adm-body">
        {customers.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">👤</div>
            <h4>{t.emptyTitle}</h4>
            <p>{t.emptyText}</p>
          </div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>{t.thCustomer}</th>
                <th>{t.thAppointments}</th>
                <th>{t.thRevenue}</th>
                <th>{t.thLastVisit}</th>
                <th>{t.thNextAppointment}</th>
                <th>{t.thSource}</th>
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
                const sourceBadge = sourceLabels[c.source ?? ""] ?? null;

                return (
                  <tr key={c.id}>
                    <td>
                      <div className="client-name-cell">
                        <div className={`client-avatar${avatarVariant}`}>{initials}</div>
                        <div className="client-name-wrap">
                          <span className="client-name">
                            {c.name ?? "—"}
                            {c.isVip && <span className="client-vip">{t.vip}</span>}
                          </span>
                          <span className="client-email">{c.email ?? c.phone ?? "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="client-stat">{c.totalBookings}</td>
                    <td className="client-stat">
                      € {(c.totalRevenueCents / 100).toLocaleString(locale === "de" ? "de-AT" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>{formatDate(c.lastVisit, locale)}</td>
                    <td>{formatDate(c.nextAppointment, locale)}</td>
                    <td>
                      {sourceBadge && <span className="src-badge">{sourceBadge}</span>}
                    </td>
                    <td>
                      <Link
                        href={`/admin/clients/${identifier}`}
                        className="btn btn-ghost btn-sm"
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
