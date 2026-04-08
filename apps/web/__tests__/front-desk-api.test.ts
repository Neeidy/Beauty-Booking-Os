import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks — must come before any imports that use these modules ──────

const mocks = vi.hoisted(() => {
  const mockOrderBy = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere });
  const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  const mockIsAuth = vi.fn().mockReturnValue(true);

  return {
    mockOrderBy,
    mockWhere,
    mockLeftJoin,
    mockFrom,
    mockSelect,
    mockIsAuth,
    mockDb: { select: mockSelect },
  };
});

vi.mock("@beauty-booking/db", () => ({
  getDb: () => mocks.mockDb,
  bookings: {
    id: {}, clientId: {}, serviceId: {},
    customerName: {}, customerContact: {},
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

// ── Import handler AFTER mocks are set up ────────────────────────────────────

import { GET } from "../app/api/admin/front-desk/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(date?: string): NextRequest {
  const url = date
    ? `http://localhost:3030/api/admin/front-desk?date=${date}`
    : "http://localhost:3030/api/admin/front-desk";
  return new NextRequest(url);
}

function makeBooking(overrides: Partial<{
  id: string;
  customerName: string;
  customerContact: string;
  appointmentAt: Date;
  durationMinutes: number;
  status: string;
  notes: null | string;
  createdAt: Date;
  serviceName: null | string;
}> = {}) {
  return {
    id: overrides.id ?? "00000000-0000-0000-0000-000000000001",
    customerName: overrides.customerName ?? "Test Müşteri",
    customerContact: overrides.customerContact ?? "+43 123 456",
    appointmentAt: overrides.appointmentAt ?? new Date("2026-04-08T10:00:00.000Z"),
    durationMinutes: overrides.durationMinutes ?? 60,
    status: overrides.status ?? "pending",
    notes: overrides.notes ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-04-08T09:00:00.000Z"),
    serviceName: overrides.serviceName ?? null,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/front-desk", () => {
  beforeEach(() => {
    mocks.mockOrderBy.mockResolvedValue([]);
    mocks.mockIsAuth.mockReturnValue(true);
  });

  it("1 — empty day: totalBookings === 0 and all columns are []", async () => {
    mocks.mockOrderBy.mockResolvedValue([]);
    const res = await GET(makeRequest("2026-04-08"));
    const body = await res.json() as Record<string, unknown>;

    expect(body["totalBookings"]).toBe(0);
    expect(body["columns"]).toEqual({
      unconfirmed: [],
      confirmed: [],
      completed: [],
    });
  });

  it("2 — status grouping: pending→unconfirmed, confirmed→confirmed, completed→completed", async () => {
    mocks.mockOrderBy.mockResolvedValue([
      makeBooking({ id: "a", status: "pending" }),
      makeBooking({ id: "b", status: "confirmed" }),
      makeBooking({ id: "c", status: "completed" }),
    ]);

    const res = await GET(makeRequest("2026-04-08"));
    const body = await res.json() as { columns: { unconfirmed: {id:string}[]; confirmed: {id:string}[]; completed: {id:string}[] } };

    expect(body.columns.unconfirmed.map((b) => b.id)).toEqual(["a"]);
    expect(body.columns.confirmed.map((b) => b.id)).toEqual(["b"]);
    expect(body.columns.completed.map((b) => b.id)).toEqual(["c"]);
  });

  it('3 — "reminded" lands in unconfirmed, not confirmed', async () => {
    mocks.mockOrderBy.mockResolvedValue([
      makeBooking({ id: "r1", status: "reminded" }),
    ]);

    const res = await GET(makeRequest("2026-04-08"));
    const body = await res.json() as { columns: { unconfirmed: {id:string}[]; confirmed: {id:string}[] } };

    expect(body.columns.unconfirmed.map((b) => b.id)).toContain("r1");
    expect(body.columns.confirmed.map((b) => b.id)).not.toContain("r1");
  });

  it('4 — "no_show" lands in completed', async () => {
    mocks.mockOrderBy.mockResolvedValue([
      makeBooking({ id: "ns1", status: "no_show" }),
    ]);

    const res = await GET(makeRequest("2026-04-08"));
    const body = await res.json() as { columns: { completed: {id:string}[] } };

    expect(body.columns.completed.map((b) => b.id)).toContain("ns1");
  });

  it("5 — appointmentTime is in Europe/Vienna timezone (UTC+2 in April → 12:30Z = 14:30)", async () => {
    mocks.mockOrderBy.mockResolvedValue([
      makeBooking({
        id: "tz1",
        appointmentAt: new Date("2026-04-08T12:30:00.000Z"),
        status: "pending",
      }),
    ]);

    const res = await GET(makeRequest("2026-04-08"));
    const body = await res.json() as { columns: { unconfirmed: { appointmentTime: string }[] } };

    expect(body.columns.unconfirmed[0]?.appointmentTime).toBe("14:30");
  });

  it("6 — unauthorized request returns 401", async () => {
    mocks.mockIsAuth.mockReturnValue(false);
    const res = await GET(makeRequest("2026-04-08"));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });
});
