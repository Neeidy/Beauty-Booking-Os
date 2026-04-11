import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  // Services chain: select().from(services).where().limit()
  const mockServiceLimit = vi.fn().mockResolvedValue([]);
  const mockServiceWhere = vi.fn().mockReturnValue({ limit: mockServiceLimit });

  // Bookings chain: select().from(bookings).where()  ← directly awaitable
  const mockBookingWhere = vi.fn().mockResolvedValue([]);

  // Route by table: services has "serviceName", bookings do not
  const mockFrom = vi.fn().mockImplementation((table: Record<string, unknown>) => {
    if ("serviceName" in table) {
      return { where: mockServiceWhere };
    }
    return { where: mockBookingWhere };
  });

  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  return {
    mockServiceLimit,
    mockServiceWhere,
    mockBookingWhere,
    mockFrom,
    mockSelect,
    mockDb: { select: mockSelect },
  };
});

vi.mock("@beauty-booking/db", () => ({
  getDb: () => mocks.mockDb,
  bookings: {
    id: {}, clientId: {}, serviceId: {},
    appointmentAt: {}, durationMinutes: {}, status: {},
  },
  services: {
    id: {}, serviceName: {}, durationMinutes: {},
  },
}));

vi.mock("@/lib/load-client-config", () => ({
  loadClientConfig: () => ({
    bookingRules: { minAdvanceBookingHours: 2 },
  }),
}));

// ── Import handler AFTER mocks ────────────────────────────────────────────────

import { GET } from "../app/api/booking/slots/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_DATE = "2026-05-12"; // Tuesday — weekday (open 09:00–18:00), 31 days from fake now
const TEST_SERVICE_ID = "00000000-0000-0000-0000-000000000042";

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3030/api/booking/slots");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function defaultService(overrides: Partial<{ durationMinutes: number; serviceName: string }> = {}) {
  return {
    id: TEST_SERVICE_ID,
    serviceName: overrides.serviceName ?? "Gel Manikür",
    durationMinutes: overrides.durationMinutes ?? 60,
  };
}

function makeBooking(overrides: Partial<{
  appointmentAt: Date;
  durationMinutes: number;
  status: string;
}> = {}) {
  return {
    appointmentAt: overrides.appointmentAt ?? new Date(`${TEST_DATE}T07:00:00.000Z`),
    durationMinutes: overrides.durationMinutes ?? 60,
    status: overrides.status ?? "confirmed",
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/booking/slots", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T12:00:00Z")); // 31 days before TEST_DATE
    mocks.mockServiceLimit.mockResolvedValue([defaultService()]);
    mocks.mockBookingWhere.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1 — missing date → 400", async () => {
    const res = await GET(makeRequest({ serviceId: TEST_SERVICE_ID }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/date/i);
  });

  it("2 — missing serviceId → 400", async () => {
    const res = await GET(makeRequest({ date: TEST_DATE }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/serviceId/i);
  });

  it("3 — empty day, future date: all slots available", async () => {
    mocks.mockBookingWhere.mockResolvedValue([]); // no existing bookings
    mocks.mockServiceLimit.mockResolvedValue([defaultService({ durationMinutes: 60 })]);

    const res = await GET(makeRequest({ date: TEST_DATE, serviceId: TEST_SERVICE_ID }));
    expect(res.status).toBe(200);

    const body = await res.json() as { slots: { available: boolean }[] };
    expect(body.slots.length).toBeGreaterThan(0);
    expect(body.slots.every((s) => s.available === true)).toBe(true);
  });

  it("4 — confirmed booking blocks overlapping slot (09:00 Vienna)", async () => {
    // 2026-05-12T07:00:00Z = 09:00 Vienna (UTC+2 in May)
    mocks.mockBookingWhere.mockResolvedValue([
      makeBooking({ appointmentAt: new Date("2026-05-12T07:00:00.000Z"), status: "confirmed" }),
    ]);

    const res = await GET(makeRequest({ date: TEST_DATE, serviceId: TEST_SERVICE_ID }));
    expect(res.status).toBe(200);

    const body = await res.json() as { slots: { time: string; available: boolean }[] };
    expect(body.slots.find((s) => s.time === "09:00")?.available).toBe(false);
    expect(body.slots.find((s) => s.time === "10:00")?.available).toBe(true);
  });

  it("5 — cancelled booking does NOT block slot", async () => {
    mocks.mockBookingWhere.mockResolvedValue([
      makeBooking({ appointmentAt: new Date("2026-05-12T07:00:00.000Z"), status: "cancelled" }),
    ]);

    const res = await GET(makeRequest({ date: TEST_DATE, serviceId: TEST_SERVICE_ID }));
    expect(res.status).toBe(200);

    const body = await res.json() as { slots: { time: string; available: boolean }[] };
    expect(body.slots.find((s) => s.time === "09:00")?.available).toBe(true);
  });

  it("6 — no_show booking does NOT block slot (underscore: no_show)", async () => {
    mocks.mockBookingWhere.mockResolvedValue([
      makeBooking({ appointmentAt: new Date("2026-05-12T07:00:00.000Z"), status: "no_show" }),
    ]);

    const res = await GET(makeRequest({ date: TEST_DATE, serviceId: TEST_SERVICE_ID }));
    expect(res.status).toBe(200);

    const body = await res.json() as { slots: { time: string; available: boolean }[] };
    expect(body.slots.find((s) => s.time === "09:00")?.available).toBe(true);
  });

  it("7 — 120min service: 17:00 slot not generated (17:00+2h=19:00 exceeds 18:00 close)", async () => {
    mocks.mockServiceLimit.mockResolvedValue([defaultService({ durationMinutes: 120 })]);
    mocks.mockBookingWhere.mockResolvedValue([]);

    const res = await GET(makeRequest({ date: TEST_DATE, serviceId: TEST_SERVICE_ID }));
    expect(res.status).toBe(200);

    const body = await res.json() as { slots: { time: string; available: boolean }[] };
    // 17:00 + 120min = 19:00 > 18:00 → slot not generated
    expect(body.slots.find((s) => s.time === "17:00")).toBeUndefined();
    // But 16:00 + 120min = 18:00 ≤ 18:00 → slot generated and available
    expect(body.slots.find((s) => s.time === "16:00")?.available).toBe(true);
  });

  it("8 — response shape: date, serviceId, serviceName, serviceDurationMinutes, slots[]", async () => {
    mocks.mockServiceLimit.mockResolvedValue([defaultService({ serviceName: "Gel Manikür", durationMinutes: 60 })]);
    mocks.mockBookingWhere.mockResolvedValue([]);

    const res = await GET(makeRequest({ date: TEST_DATE, serviceId: TEST_SERVICE_ID }));
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body["date"]).toBe(TEST_DATE);
    expect(body["serviceId"]).toBe(TEST_SERVICE_ID);
    expect(body["serviceName"]).toBe("Gel Manikür");
    expect(body["serviceDurationMinutes"]).toBe(60);
    expect(Array.isArray(body["slots"])).toBe(true);

    const firstSlot = (body["slots"] as Record<string, unknown>[])[0];
    expect(firstSlot).toBeDefined();
    expect(typeof firstSlot!["time"]).toBe("string");
    expect(typeof firstSlot!["datetime"]).toBe("string");
    expect(typeof firstSlot!["available"]).toBe("boolean");
  });
});
