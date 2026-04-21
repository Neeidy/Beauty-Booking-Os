export const dynamic = "force-dynamic";

import Link from "next/link";
import ClientProfileView from "./ClientProfileView";
import { getDb, bookings, services, leads } from "@beauty-booking/db";
import { eq, desc, inArray, asc } from "drizzle-orm";

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

interface ClientProfileData {
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toViennaTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

const EMPTY_SUMMARY = {
  totalBookings: 0,
  completedBookings: 0,
  cancelledBookings: 0,
  noshowCount: 0,
  showRate: 0,
};

async function fetchClientProfile(identifier: string): Promise<ClientProfileData> {
  const decoded = decodeURIComponent(identifier);
  const isUuid = UUID_REGEX.test(decoded);
  const db = getDb();

  const customerRows = isUuid
    ? await db.select().from(leads).where(eq(leads.id, decoded)).limit(1)
    : await db
        .select()
        .from(leads)
        .where(eq(leads.customerPhone, decoded))
        .orderBy(asc(leads.createdAt))
        .limit(1);

  if (customerRows.length === 0) {
    return { identifier: decoded, customer: null, summary: EMPTY_SUMMARY, bookings: [] };
  }

  const customer = customerRows[0]!;

  let allLeadIds: string[];
  let firstSeenAt: string;

  if (isUuid) {
    allLeadIds = [customer.id];
    firstSeenAt =
      customer.createdAt instanceof Date
        ? customer.createdAt.toISOString()
        : String(customer.createdAt);
  } else {
    const phoneLeads = customer.customerPhone
      ? await db
          .select({ id: leads.id, createdAt: leads.createdAt })
          .from(leads)
          .where(eq(leads.customerPhone, customer.customerPhone))
          .orderBy(asc(leads.createdAt))
      : [{ id: customer.id, createdAt: customer.createdAt }];

    allLeadIds = phoneLeads.map((l) => l.id);
    const earliest = phoneLeads[0]?.createdAt;
    firstSeenAt =
      earliest instanceof Date ? earliest.toISOString() : String(earliest ?? customer.createdAt);
  }

  type BookingRow = {
    id: string;
    appointmentAt: Date | string;
    durationMinutes: number;
    status: string;
    notes: string | null;
    createdAt: Date | string;
    serviceName: string | null;
  };

  let bookingRows: BookingRow[] = [];
  try {
    bookingRows = await db
      .select({
        id: bookings.id,
        appointmentAt: bookings.appointmentAt,
        durationMinutes: bookings.durationMinutes,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        serviceName: services.serviceName,
      })
      .from(bookings)
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(inArray(bookings.leadId, allLeadIds))
      .orderBy(desc(bookings.appointmentAt));
  } catch {
    const fallbackRows = await db
      .select({
        id: bookings.id,
        appointmentAt: bookings.appointmentAt,
        durationMinutes: bookings.durationMinutes,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .where(inArray(bookings.leadId, allLeadIds))
      .orderBy(desc(bookings.appointmentAt));
    bookingRows = fallbackRows.map((r) => ({ ...r, serviceName: null }));
  }

  const totalBookings = bookingRows.length;
  const completedBookings = bookingRows.filter((b) => b.status === "completed").length;
  const cancelledBookings = bookingRows.filter((b) => b.status === "cancelled").length;
  const noshowCount = bookingRows.filter((b) => b.status === "no_show").length;
  const showRate = totalBookings === 0 ? 0 : completedBookings / totalBookings;

  const clientBookings: ClientBooking[] = bookingRows.map((row) => ({
    id: row.id,
    appointmentAt:
      row.appointmentAt instanceof Date
        ? row.appointmentAt.toISOString()
        : String(row.appointmentAt),
    appointmentTime: toViennaTime(
      row.appointmentAt instanceof Date ? row.appointmentAt : new Date(String(row.appointmentAt)),
    ),
    status: row.status,
    serviceName: row.serviceName ?? null,
    durationMinutes: row.durationMinutes,
    notes: row.notes ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }));

  return {
    identifier: decoded,
    customer: {
      name: customer.customerName ?? null,
      email: customer.customerEmail ?? null,
      phone: customer.customerPhone ?? null,
      language: customer.language ?? null,
      firstSeenAt,
    },
    summary: { totalBookings, completedBookings, cancelledBookings, noshowCount, showRate },
    bookings: clientBookings,
  };
}

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ identifier: string }>;
}) {
  const { identifier } = await params;

  let data: ClientProfileData | null = null;
  try {
    data = await fetchClientProfile(identifier);
  } catch {
    // data stays null — rendered as error below
  }

  return (
    <div>
      <header className="adm-header">
        <div className="adm-header-title">
          <span className="breadcrumb">
            <Link href="/admin/clients" style={{ color: "inherit" }}>← Kunden</Link>
            {data?.customer?.name ? ` / ${data.customer.name}` : ""}
          </span>
          <h2>{data?.customer?.name ?? "Kundenprofil"}</h2>
        </div>
        <div className="adm-header-actions">
          <Link href="/admin/clients" className="btn btn-ghost btn-sm">← Zurück</Link>
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
            Profil konnte nicht geladen werden.{" "}
            <Link href="/admin/leads" style={{ color: "var(--color-accent)", fontWeight: 600 }}>← Zurück</Link>
          </div>
        ) : data.customer === null ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
            Kunde nicht gefunden.{" "}
            <Link href="/admin/leads" style={{ color: "var(--color-accent)" }}>← Zurück</Link>
          </div>
        ) : (
          <ClientProfileView data={data} />
        )}
      </div>
    </div>
  );
}
