import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, leads, services } from "@beauty-booking/db";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env["DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000000";

// ── Timezone helpers (machine-TZ-independent, copied from slots route) ─────────

/** Vienna UTC offset in minutes for a given instant — uses pure Intl, no local-TZ dependency. */
function getViennaOffsetMinutes(date: Date): number {
  const utcFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const viennaFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parseFormatted = (f: Intl.DateTimeFormat, d: Date): number => {
    const parts = f.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    return Date.UTC(
      Number(parts["year"]),
      Number(parts["month"]) - 1,
      Number(parts["day"]),
      Number(parts["hour"] === "24" ? "0" : parts["hour"]),
      Number(parts["minute"]),
      Number(parts["second"]),
    );
  };
  const utcMs = parseFormatted(utcFormatter, date);
  const viennaMs = parseFormatted(viennaFormatter, date);
  return Math.round((viennaMs - utcMs) / 60000);
}

/** Converts a Vienna wall-clock time on a given date to a UTC Date. */
function viennaWallClockToUTC(dateStr: string, hour: number, minute: number): Date {
  const anchor = new Date(`${dateStr}T12:00:00Z`); // noon UTC — DST-safe anchor
  const offsetMinutes = getViennaOffsetMinutes(anchor);
  const [y, m, d] = dateStr.split("-").map(Number);
  const asIfUtcMs = Date.UTC(y!, m! - 1, d!, hour, minute, 0);
  return new Date(asIfUtcMs - offsetMinutes * 60000);
}

// ── Zod schema ─────────────────────────────────────────────────────────────────

const WaitingListRequestSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  serviceId: z.string().uuid(),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientId: z.string().uuid().optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "GDPR consent required" }),
  }),
});

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = WaitingListRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const {
    customerName,
    customerEmail,
    customerPhone,
    serviceId,
    requestedDate,
    clientId: bodyClientId,
  } = result.data;

  const clientId = bodyClientId ?? CLIENT_ID;

  // Reject past dates
  const now = new Date();
  const anchorDateUTC = viennaWallClockToUTC(requestedDate, 0, 0);
  if (anchorDateUTC < now) {
    return NextResponse.json({ error: "Requested date is in the past" }, { status: 400 });
  }

  try {
    const db = getDb();

    // Check for duplicate registration (same email + service + date)
    const existing = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.clientId, clientId),
          eq(leads.customerEmail, customerEmail),
          sql`${leads.metadata}->>'waitingList' = 'true'`,
          sql`${leads.metadata}->>'requestedDate' = ${requestedDate}`,
          sql`${leads.metadata}->>'requestedServiceId' = ${serviceId}`,
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ success: true, alreadyRegistered: true }, { status: 200 });
    }

    // Fetch service name for rawMessage (non-blocking)
    let serviceName: string | null = null;
    try {
      const svc = await db
        .select({ serviceName: services.serviceName })
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);
      if (svc[0]) serviceName = svc[0].serviceName;
    } catch {
      // fallback: use serviceId in rawMessage
    }

    // Insert waiting list entry as a lead
    const newLead = await db
      .insert(leads)
      .values({
        clientId,
        source: "web_form",
        customerName,
        customerEmail,
        customerPhone: customerPhone ?? null,
        rawMessage: `Warteliste: ${serviceName ?? serviceId} am ${requestedDate}`,
        status: "new",
        gdprConsentAt: new Date(),
        gdprConsentMethod: "web_form_checkbox",
        metadata: {
          waitingList: true,
          requestedDate,
          requestedServiceId: serviceId,
          waitingList_notified: false,
          waitingList_registeredAt: new Date().toISOString(),
        },
      })
      .returning({ id: leads.id });

    return NextResponse.json(
      {
        success: true,
        alreadyRegistered: false,
        leadId: newLead[0]?.id,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("waiting-list POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
