import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    status: {}, notes: {},
  },
  services: {
    id: {}, serviceName: {},
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  isAdminApiAuthenticated: mocks.mockIsAuth,
}));

// ── Import handler AFTER mocks ────────────────────────────────────────────────

import { GET } from "../app/api/admin/calendar/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(weekStart?: string): NextRequest {
  const url = weekStart
    ? `http://localhost:3030/api/admin/calendar?weekStart=${weekStart}`
    : "http://localhost:3030/api/admin/calendar";
  return new NextRequest(url);
}

function makeBooking(overrides: Partial<{
  id: string;
  customerName: string;
  customerContact: string;
  appointmentAt: Date;
  durationMinutes: number;
  status: string;
  notes: string | null;
  serviceName: string | null;
}> = {}) {
  return {
    id: overrides.id ?? "00000000-0000-0000-0000-000000000001",
    customerName: overrides.customerName ?? "Test Müşteri",
    customerContact: overrides.customerContact ?? "+43 123 456",
    appointmentAt: overrides.appointmentAt ?? new Date("2026-04-08T10:00:00.000Z"),
    durationMinutes: overrides.durationMinutes ?? 60,
    status: overrides.status ?? "pending",
    notes: overrides.notes ?? null,
    serviceName: overrides.serviceName ?? null,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/calendar", () => {
  beforeEach(() => {
    mocks.mockOrderBy.mockResolvedValue([]);
    mocks.mockIsAuth.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1 — empty week: totalBookings===0, days.length===7, every day has bookings:[]", async () => {
    mocks.mockOrderBy.mockResolvedValue([]);

    const res = await GET(makeRequest("2026-04-06"));
    expect(res.status).toBe(200);

    const body = await res.json() as { totalBookings: number; days: { bookings: unknown[] }[] };
    expect(body.totalBookings).toBe(0);
    expect(body.days.length).toBe(7);
    for (const day of body.days) {
      expect(day.bookings).toEqual([]);
    }
  });

  it("2 — always 7 days: days.length === 7 exactly", async () => {
    mocks.mockOrderBy.mockResolvedValue([]);

    const res = await GET(makeRequest("2026-04-06"));
    const body = await res.json() as { days: unknown[] };

    expect(body.days.length).toBe(7);
  });

  it("3 — booking assigned to correct day: 2026-04-08T10:00Z → days[2] (Wednesday)", async () => {
    mocks.mockOrderBy.mockResolvedValue([
      makeBooking({
        id: "b-wednesday",
        appointmentAt: new Date("2026-04-08T10:00:00.000Z"),
        status: "confirmed",
      }),
    ]);

    const res = await GET(makeRequest("2026-04-06"));
    expect(res.status).toBe(200);

    const body = await res.json() as {
      days: { date: string; bookings: { id: string }[] }[];
    };

    expect(body.days[2]?.date).toBe("2026-04-08");
    expect(body.days[2]?.bookings.length).toBe(1);
    expect(body.days[2]?.bookings[0]?.id).toBe("b-wednesday");
    expect(body.days[0]?.bookings.length).toBe(0);
  });

  it("4 — isToday: fake time 2026-04-08T12:00:00Z (Wednesday) → days[2].isToday===true", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00Z"));

    mocks.mockOrderBy.mockResolvedValue([]);

    const res = await GET(makeRequest()); // no weekStart — computed from current time
    expect(res.status).toBe(200);

    const body = await res.json() as {
      days: { date: string; isToday: boolean }[];
    };

    // Wednesday is index 2 (Mon=0, Tue=1, Wed=2)
    expect(body.days[2]?.date).toBe("2026-04-08");
    expect(body.days[2]?.isToday).toBe(true);
    expect(body.days[0]?.isToday).toBe(false);
    expect(body.days[1]?.isToday).toBe(false);
    expect(body.days[3]?.isToday).toBe(false);
    expect(body.days[4]?.isToday).toBe(false);
    expect(body.days[5]?.isToday).toBe(false);
    expect(body.days[6]?.isToday).toBe(false);

    vi.useRealTimers();
  });

  it("5 — appointmentTime timezone: 2026-04-08T12:30:00.000Z → Vienna UTC+2 → '14:30'", async () => {
    mocks.mockOrderBy.mockResolvedValue([
      makeBooking({
        id: "tz1",
        appointmentAt: new Date("2026-04-08T12:30:00.000Z"),
        status: "pending",
      }),
    ]);

    const res = await GET(makeRequest("2026-04-06"));
    expect(res.status).toBe(200);

    const body = await res.json() as {
      days: { bookings: { appointmentTime: string }[] }[];
    };

    // Wednesday is index 2
    expect(body.days[2]?.bookings[0]?.appointmentTime).toBe("14:30");
  });

  it("6 — weekEnd correct: weekStart='2026-04-06' → weekEnd='2026-04-12' (Sunday)", async () => {
    mocks.mockOrderBy.mockResolvedValue([]);

    const res = await GET(makeRequest("2026-04-06"));
    expect(res.status).toBe(200);

    const body = await res.json() as { weekStart: string; weekEnd: string };
    expect(body.weekStart).toBe("2026-04-06");
    expect(body.weekEnd).toBe("2026-04-12");
  });

  it("7 — unauthorized: returns 401", async () => {
    mocks.mockIsAuth.mockReturnValue(false);

    const res = await GET(makeRequest("2026-04-06"));
    expect(res.status).toBe(401);

    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("8 — invalid weekStart: returns 400", async () => {
    const res = await GET(makeRequest("not-a-date"));
    expect(res.status).toBe(400);

    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid date format");
  });
});
