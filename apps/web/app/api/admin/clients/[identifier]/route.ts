import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, bookings, services, leads } from "@beauty-booking/db";
import { eq, desc, inArray, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Timezone helper ───────────────────────────────────────────────────────────

/** Formats a Date as "HH:mm" in Europe/Vienna. */
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

// ── Zod schemas ───────────────────────────────────────────────────────────────

const ClientBookingSchema = z.object({
  id: z.string(),
  appointmentAt: z.string(),
  appointmentTime: z.string(),
  status: z.string(),
  serviceName: z.string().nullable(),
  durationMinutes: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

const ClientProfileResponseSchema = z.object({
  identifier: z.string(),
  customer: z
    .object({
      name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      language: z.string().nullable(),
      firstSeenAt: z.string(),
    })
    .nullable(),
  summary: z.object({
    totalBookings: z.number(),
    completedBookings: z.number(),
    cancelledBookings: z.number(),
    noshowCount: z.number(),
    showRate: z.number(),
  }),
  bookings: z.array(ClientBookingSchema),
});

const EMPTY_SUMMARY = {
  totalBookings: 0,
  completedBookings: 0,
  cancelledBookings: 0,
  noshowCount: 0,
  showRate: 0,
};

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { identifier } = await params;
  const decoded = decodeURIComponent(identifier);
  const isUuid = UUID_REGEX.test(decoded);

  try {
    const db = getDb();

    // Step 1: Find the customer's first lead record
    const customerRows = isUuid
      ? await db.select().from(leads).where(eq(leads.id, decoded)).limit(1)
      : await db
          .select()
          .from(leads)
          .where(eq(leads.customerPhone, decoded))
          .orderBy(asc(leads.createdAt))
          .limit(1);

    if (customerRows.length === 0) {
      const emptyPayload = {
        identifier: decoded,
        customer: null,
        summary: EMPTY_SUMMARY,
        bookings: [],
      };
      const parsed = ClientProfileResponseSchema.safeParse(emptyPayload);
      if (!parsed.success) {
        console.error("client-profile-api: Zod validation failed on empty response", parsed.error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }
      return NextResponse.json(parsed.data);
    }

    const customer = customerRows[0]!;

    // Step 2: Collect all lead IDs for this customer
    let allLeadIds: string[];
    let firstSeenAt: string;

    if (isUuid) {
      allLeadIds = [customer.id];
      firstSeenAt =
        customer.createdAt instanceof Date
          ? customer.createdAt.toISOString()
          : String(customer.createdAt);
    } else {
      // Phone-based: find ALL leads with the same phone to aggregate history
      const phoneLeads = customer.customerPhone
        ? await db
            .select({ id: leads.id, createdAt: leads.createdAt })
            .from(leads)
            .where(eq(leads.customerPhone, customer.customerPhone))
            .orderBy(asc(leads.createdAt))
        : [{ id: customer.id, createdAt: customer.createdAt }];

      allLeadIds = phoneLeads.map((l) => l.id);
      // earliest createdAt across all matched leads
      const earliest = phoneLeads[0]?.createdAt;
      firstSeenAt =
        earliest instanceof Date ? earliest.toISOString() : String(earliest ?? customer.createdAt);
    }

    // Step 3: Fetch all bookings for those lead IDs (with service name via LEFT JOIN)
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
    } catch (joinErr) {
      console.error("client-profile-api: services join failed, falling back to no-join", joinErr);
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

    // Step 4: Compute summary
    const totalBookings = bookingRows.length;
    const completedBookings = bookingRows.filter((b) => b.status === "completed").length;
    const cancelledBookings = bookingRows.filter((b) => b.status === "cancelled").length;
    const noshowCount = bookingRows.filter((b) => b.status === "no_show").length;
    const showRate = totalBookings === 0 ? 0 : completedBookings / totalBookings;

    // Step 5: Build response
    const clientBookings = bookingRows.map((row) => ({
      id: row.id,
      appointmentAt:
        row.appointmentAt instanceof Date
          ? row.appointmentAt.toISOString()
          : String(row.appointmentAt),
      appointmentTime: toViennaTime(
        row.appointmentAt instanceof Date
          ? row.appointmentAt
          : new Date(String(row.appointmentAt)),
      ),
      status: row.status,
      serviceName: row.serviceName ?? null,
      durationMinutes: row.durationMinutes,
      notes: row.notes ?? null,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    }));

    const payload = {
      identifier: decoded,
      customer: {
        name: customer.customerName ?? null,
        email: customer.customerEmail ?? null,
        phone: customer.customerPhone ?? null,
        language: customer.language ?? null,
        firstSeenAt,
      },
      summary: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        noshowCount,
        showRate,
      },
      bookings: clientBookings,
    };

    const parsed = ClientProfileResponseSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("client-profile-api: Zod validation failed", parsed.error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("client-profile-api error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
