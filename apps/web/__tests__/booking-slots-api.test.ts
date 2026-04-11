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
  loadClientConfig: vi.fn(),
}));

// ── Import handler AFTER mocks ────────────────────────────────────────────────

import { GET } from "../app/api/booking/slots/route";
import { loadClientConfig } from "@/lib/load-client-config";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNextWeekday(targetDay: number): string {
  // targetDay: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Always returns NEXT occurrence (even if today is the target day, skips to next week).
  const d = new Date();
  const current = d.getUTCDay();
  let diff = targetDay - current;
  if (diff <= 0) diff += 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

const TEST_DATE = "2026-05-12"; // Tuesday — weekday (open 09:00–19:00 via config), 31 days from fake now
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
    vi.mocked(loadClientConfig).mockReturnValue({
      operatingHours: {
        monday:    { open: "0900", close: "1900" },
        tuesday:   { open: "0900", close: "1900" },
        wednesday: { open: "0900", close: "1900" },
        thursday:  { open: "0900", close: "2100" },
        friday:    { open: "0900", close: "1900" },
        saturday:  { open: "1000", close: "1700" },
        sunday:    null,
      },
      bookingRules: {
        minAdvanceBookingHours: 2,
        cancellationPolicyHours: 24,
        maxFollowUpAttempts: 2,
        recoveryWaitHours: 48,
      },
    } as any);
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

    // Use next Monday — always a weekday, never closed regardless of when tests run
    const monday = getNextWeekday(1);
    const res = await GET(makeRequest({ date: monday, serviceId: TEST_SERVICE_ID }));
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

  it("7 — 120min service on Tuesday (19:00 close): 17:00 included (17:00+2h=19:00=close), 18:00 excluded (18:00+2h=20:00>19:00)", async () => {
    mocks.mockServiceLimit.mockResolvedValue([defaultService({ durationMinutes: 120 })]);
    mocks.mockBookingWhere.mockResolvedValue([]);

    const res = await GET(makeRequest({ date: TEST_DATE, serviceId: TEST_SERVICE_ID }));
    expect(res.status).toBe(200);

    const body = await res.json() as { slots: { time: string; available: boolean }[] };
    // 17:00 + 120min = 19:00 = close → exactly fits, slot generated
    expect(body.slots.find((s) => s.time === "17:00")?.available).toBe(true);
    // 18:00 + 120min = 20:00 > 19:00 → exceeds close, slot not generated
    expect(body.slots.find((s) => s.time === "18:00")).toBeUndefined();
  });

  it("8 — response shape: date, serviceId, serviceName, serviceDurationMinutes, isDayClosed, slots[]", async () => {
    mocks.mockServiceLimit.mockResolvedValue([defaultService({ serviceName: "Gel Manikür", durationMinutes: 60 })]);
    mocks.mockBookingWhere.mockResolvedValue([]);

    const res = await GET(makeRequest({ date: TEST_DATE, serviceId: TEST_SERVICE_ID }));
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body["date"]).toBe(TEST_DATE);
    expect(body["serviceId"]).toBe(TEST_SERVICE_ID);
    expect(body["serviceName"]).toBe("Gel Manikür");
    expect(body["serviceDurationMinutes"]).toBe(60);
    expect(body["isDayClosed"]).toBe(false);
    expect(Array.isArray(body["slots"])).toBe(true);

    const firstSlot = (body["slots"] as Record<string, unknown>[])[0];
    expect(firstSlot).toBeDefined();
    expect(typeof firstSlot!["time"]).toBe("string");
    expect(typeof firstSlot!["datetime"]).toBe("string");
    expect(typeof firstSlot!["available"]).toBe("boolean");
  });

  it("9 — Sunday (null config) → isDayClosed: true, slots: []", async () => {
    const sunday = getNextWeekday(0);
    const res = await GET(makeRequest({ date: sunday, serviceId: TEST_SERVICE_ID }));
    const body = await res.json() as { isDayClosed: boolean; slots: unknown[] };
    expect(res.status).toBe(200);
    expect(body.isDayClosed).toBe(true);
    expect(body.slots).toHaveLength(0);
  });

  it("10 — Thursday (21:00 close, 60min service): 20:00 last slot, 20:30 not generated", async () => {
    const thursday = getNextWeekday(4);
    const res = await GET(makeRequest({ date: thursday, serviceId: TEST_SERVICE_ID }));
    const body = await res.json() as { isDayClosed: boolean; slots: { time: string }[] };
    expect(res.status).toBe(200);
    expect(body.isDayClosed).toBe(false);
    const times = body.slots.map((s) => s.time);
    // 20:00 + 60min = 21:00 = close → exactly fits → included
    expect(times).toContain("20:00");
    // 20:30 + 60min = 21:30 > 21:00 → exceeds close → not generated
    expect(times).not.toContain("20:30");
    expect(times).not.toContain("21:00");
  });

  it("11 — Saturday (10:00 open): first slot 10:00, no 09:00 or 09:30", async () => {
    const saturday = getNextWeekday(6);
    const res = await GET(makeRequest({ date: saturday, serviceId: TEST_SERVICE_ID }));
    const body = await res.json() as { isDayClosed: boolean; slots: { time: string }[] };
    expect(res.status).toBe(200);
    expect(body.isDayClosed).toBe(false);
    const times = body.slots.map((s) => s.time);
    expect(times).not.toContain("09:00");
    expect(times).not.toContain("09:30");
    expect(times).toContain("10:00");
  });

  it("12 — config throws → fallback 09:00–18:00, HTTP 200, slots present", async () => {
    vi.mocked(loadClientConfig).mockImplementationOnce(() => {
      throw new Error("config file not found");
    });
    const monday = getNextWeekday(1);
    const res = await GET(makeRequest({ date: monday, serviceId: TEST_SERVICE_ID }));
    const body = await res.json() as { isDayClosed: boolean; slots: { time: string }[] };
    expect(res.status).toBe(200);
    expect(body.isDayClosed).toBe(false);
    expect(body.slots.length).toBeGreaterThan(0);
    const times = body.slots.map((s) => s.time);
    expect(times).toContain("09:00"); // fallback open
    expect(times).not.toContain("18:00"); // 18:00+60=19:00>18:00 → not generated
  });

  it("13 — future Monday, no bookings → all slots available", async () => {
    const monday = getNextWeekday(1);
    const res = await GET(makeRequest({ date: monday, serviceId: TEST_SERVICE_ID }));
    const body = await res.json() as { isDayClosed: boolean; slots: { available: boolean }[] };
    expect(res.status).toBe(200);
    expect(body.isDayClosed).toBe(false);
    expect(body.slots.length).toBeGreaterThan(0);
    expect(body.slots.every((s) => s.available)).toBe(true);
  });
});
