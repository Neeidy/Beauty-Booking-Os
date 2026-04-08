import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks — must come before any imports that use these modules ──────

const mocks = vi.hoisted(() => {
  // ── Lead query chain #1 — find customer: .where().limit() or .where().orderBy().limit()
  const mockLeadLimit = vi.fn().mockResolvedValue([]);
  const mockLeadOrderByThenLimit = vi.fn().mockReturnValue({ limit: mockLeadLimit });
  const mockLeadWhere1 = vi.fn().mockReturnValue({
    limit: mockLeadLimit,
    orderBy: mockLeadOrderByThenLimit,
  });

  // ── Lead query chain #2 — get all phone leads: .where().orderBy() (no limit, awaited directly)
  const mockLeadOrderByDirect = vi.fn().mockResolvedValue([]);
  const mockLeadWhere2 = vi.fn().mockReturnValue({ orderBy: mockLeadOrderByDirect });

  // ── Booking query chain: .leftJoin().where().orderBy()
  const mockBookingOrderBy = vi.fn().mockResolvedValue([]);
  const mockBookingWhere = vi.fn().mockReturnValue({ orderBy: mockBookingOrderBy });
  const mockBookingLeftJoin = vi.fn().mockReturnValue({ where: mockBookingWhere });

  // ── from() dispatcher:
  //   - bookings table (has `leadId`) → booking chain
  //   - leads table (no `leadId`) → lead chain #1 on odd calls, #2 on even calls
  let leadsCallCount = 0;

  const mockFrom = vi.fn().mockImplementation((table: Record<string, unknown>) => {
    if ("leadId" in table) {
      // bookings table
      return { leftJoin: mockBookingLeftJoin };
    }
    // leads table — alternate chains so both lead queries are handled correctly
    leadsCallCount++;
    return leadsCallCount % 2 === 1
      ? { where: mockLeadWhere1 }   // 1st lead query: find customer
      : { where: mockLeadWhere2 };  // 2nd lead query: get all phone leads
  });

  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  const mockIsAuth = vi.fn().mockReturnValue(true);

  return {
    mockSelect,
    mockFrom,
    mockLeadWhere1,
    mockLeadLimit,
    mockLeadOrderByThenLimit,
    mockLeadWhere2,
    mockLeadOrderByDirect,
    mockBookingLeftJoin,
    mockBookingWhere,
    mockBookingOrderBy,
    mockIsAuth,
    mockDb: { select: mockSelect },
    resetLeadsCount: () => { leadsCallCount = 0; },
  };
});

vi.mock("@beauty-booking/db", () => ({
  getDb: () => mocks.mockDb,
  // leads has NO `leadId` field — from() uses this to distinguish from bookings
  leads: {
    id: {}, clientId: {}, customerName: {}, customerEmail: {},
    customerPhone: {}, language: {}, createdAt: {},
  },
  // bookings HAS `leadId` — from() routes to booking chain
  bookings: {
    id: {}, clientId: {}, leadId: {}, serviceId: {},
    appointmentAt: {}, durationMinutes: {},
    status: {}, notes: {}, createdAt: {},
  },
  services: {
    id: {}, serviceName: {},
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  isAdminApiAuthenticated: mocks.mockIsAuth,
}));

// ── Import handler AFTER mocks ────────────────────────────────────────────────

import { GET } from "../app/api/admin/clients/[identifier]/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(identifier: string): NextRequest {
  return new NextRequest(
    `http://localhost:3030/api/admin/clients/${encodeURIComponent(identifier)}`,
  );
}

function makeParams(identifier: string) {
  return { params: Promise.resolve({ identifier }) };
}

function makeLead(overrides: Partial<{
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  language: string | null;
  createdAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? "00000000-0000-0000-0000-000000000001",
    customerName: overrides.customerName ?? "Test Müşteri",
    customerEmail: overrides.customerEmail ?? null,
    customerPhone: overrides.customerPhone ?? "+43 123 456",
    language: overrides.language ?? "de",
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
    clientId: "00000000-0000-0000-0000-000000000099",
    source: "web_form",
    rawMessage: null,
    intent: null,
    intentConfidence: null,
    status: "new",
    assignedTo: null,
    gdprConsentAt: null,
    gdprConsentMethod: null,
    metadata: null,
    updatedAt: new Date("2026-01-01T10:00:00.000Z"),
  };
}

function makeBooking(overrides: Partial<{
  id: string;
  appointmentAt: Date;
  durationMinutes: number;
  status: string;
  notes: string | null;
  createdAt: Date;
  serviceName: string | null;
}> = {}) {
  return {
    id: overrides.id ?? "b0000000-0000-0000-0000-000000000001",
    appointmentAt: overrides.appointmentAt ?? new Date("2026-04-08T10:00:00.000Z"),
    durationMinutes: overrides.durationMinutes ?? 60,
    status: overrides.status ?? "completed",
    notes: overrides.notes ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-04-01T10:00:00.000Z"),
    serviceName: overrides.serviceName ?? null,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/clients/[identifier]", () => {
  beforeEach(() => {
    mocks.resetLeadsCount();
    mocks.mockLeadLimit.mockResolvedValue([]);
    mocks.mockLeadOrderByThenLimit.mockReturnValue({ limit: mocks.mockLeadLimit });
    mocks.mockLeadWhere1.mockReturnValue({
      limit: mocks.mockLeadLimit,
      orderBy: mocks.mockLeadOrderByThenLimit,
    });
    mocks.mockLeadOrderByDirect.mockResolvedValue([]);
    mocks.mockLeadWhere2.mockReturnValue({ orderBy: mocks.mockLeadOrderByDirect });
    mocks.mockBookingOrderBy.mockResolvedValue([]);
    mocks.mockBookingWhere.mockReturnValue({ orderBy: mocks.mockBookingOrderBy });
    mocks.mockBookingLeftJoin.mockReturnValue({ where: mocks.mockBookingWhere });
    mocks.mockIsAuth.mockReturnValue(true);
  });

  it("1 — unknown UUID: customer===null, all summary fields 0, bookings=[], HTTP 200", async () => {
    const uuid = "00000000-0000-0000-0000-000000000000";
    mocks.mockLeadLimit.mockResolvedValue([]);

    const res = await GET(makeRequest(uuid), makeParams(uuid));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    expect(body["customer"]).toBeNull();
    expect(body["bookings"]).toEqual([]);
    const summary = body["summary"] as Record<string, number>;
    expect(summary["totalBookings"]).toBe(0);
    expect(summary["completedBookings"]).toBe(0);
    expect(summary["cancelledBookings"]).toBe(0);
    expect(summary["noshowCount"]).toBe(0);
    expect(summary["showRate"]).toBe(0);
  });

  it("2 — UUID identifier finds customer: customer.name matches", async () => {
    const uuid = "00000000-0000-0000-0000-000000000001";
    mocks.mockLeadLimit.mockResolvedValue([makeLead({ id: uuid, customerName: "Anna Müller" })]);

    const res = await GET(makeRequest(uuid), makeParams(uuid));
    expect(res.status).toBe(200);
    const body = await res.json() as { customer: { name: string } };
    expect(body.customer.name).toBe("Anna Müller");
  });

  it("3 — phone identifier finds customer: customer.phone matches", async () => {
    const phone = "+43 123 456";
    const lead = makeLead({ customerPhone: phone, customerName: "Bea Huber" });

    // Query 1 (find-by-phone): goes to mockLeadWhere1 → .orderBy().limit() resolves to [lead]
    mocks.mockLeadLimit.mockResolvedValue([lead]);

    // Query 2 (get-all-phone-leads): goes to mockLeadWhere2 → .orderBy() resolves to [{id, createdAt}]
    mocks.mockLeadOrderByDirect.mockResolvedValue([
      { id: lead.id, createdAt: lead.createdAt },
    ]);

    const res = await GET(makeRequest(phone), makeParams(phone));
    expect(res.status).toBe(200);
    const body = await res.json() as { customer: { phone: string; name: string } };
    expect(body.customer.phone).toBe(phone);
    expect(body.customer.name).toBe("Bea Huber");
  });

  it("4 — summary: 3 completed, 1 cancelled, 1 no_show → correct counts", async () => {
    const uuid = "00000000-0000-0000-0000-000000000002";
    mocks.mockLeadLimit.mockResolvedValue([makeLead({ id: uuid })]);
    mocks.mockBookingOrderBy.mockResolvedValue([
      makeBooking({ id: "b1", status: "completed" }),
      makeBooking({ id: "b2", status: "completed" }),
      makeBooking({ id: "b3", status: "completed" }),
      makeBooking({ id: "b4", status: "cancelled" }),
      makeBooking({ id: "b5", status: "no_show" }),
    ]);

    const res = await GET(makeRequest(uuid), makeParams(uuid));
    expect(res.status).toBe(200);
    const body = await res.json() as { summary: Record<string, number> };
    expect(body.summary["totalBookings"]).toBe(5);
    expect(body.summary["completedBookings"]).toBe(3);
    expect(body.summary["cancelledBookings"]).toBe(1);
    expect(body.summary["noshowCount"]).toBe(1);
  });

  it("5 — showRate: 2 completed out of 4 bookings → showRate === 0.5", async () => {
    const uuid = "00000000-0000-0000-0000-000000000003";
    mocks.mockLeadLimit.mockResolvedValue([makeLead({ id: uuid })]);
    mocks.mockBookingOrderBy.mockResolvedValue([
      makeBooking({ id: "b1", status: "completed" }),
      makeBooking({ id: "b2", status: "completed" }),
      makeBooking({ id: "b3", status: "pending" }),
      makeBooking({ id: "b4", status: "cancelled" }),
    ]);

    const res = await GET(makeRequest(uuid), makeParams(uuid));
    expect(res.status).toBe(200);
    const body = await res.json() as { summary: { showRate: number } };
    expect(body.summary.showRate).toBe(0.5);
  });

  it("6 — zero division guard: empty bookings → showRate === 0, no exception", async () => {
    const uuid = "00000000-0000-0000-0000-000000000004";
    mocks.mockLeadLimit.mockResolvedValue([makeLead({ id: uuid })]);
    mocks.mockBookingOrderBy.mockResolvedValue([]);

    const res = await GET(makeRequest(uuid), makeParams(uuid));
    expect(res.status).toBe(200);
    const body = await res.json() as { summary: { showRate: number; totalBookings: number } };
    expect(body.summary.totalBookings).toBe(0);
    expect(body.summary.showRate).toBe(0);
  });

  it("7 — timezone: 2026-04-08T12:30:00.000Z → appointmentTime === '14:30' (Vienna UTC+2)", async () => {
    const uuid = "00000000-0000-0000-0000-000000000005";
    mocks.mockLeadLimit.mockResolvedValue([makeLead({ id: uuid })]);
    mocks.mockBookingOrderBy.mockResolvedValue([
      makeBooking({
        id: "btz",
        appointmentAt: new Date("2026-04-08T12:30:00.000Z"),
        status: "completed",
      }),
    ]);

    const res = await GET(makeRequest(uuid), makeParams(uuid));
    expect(res.status).toBe(200);
    const body = await res.json() as { bookings: { appointmentTime: string }[] };
    expect(body.bookings[0]?.appointmentTime).toBe("14:30");
  });

  it("8 — unauthorized: returns 401", async () => {
    mocks.mockIsAuth.mockReturnValue(false);
    const uuid = "00000000-0000-0000-0000-000000000006";

    const res = await GET(makeRequest(uuid), makeParams(uuid));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });
});
