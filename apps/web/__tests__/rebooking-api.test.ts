import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as POST_JOB } from "../app/api/jobs/rebooking/route";
import { GET as GET_ADMIN, POST as POST_ADMIN } from "../app/api/admin/rebooking/route";

vi.mock("@/lib/admin-auth", () => ({
  isAdminApiAuthenticated: vi.fn(),
}));

vi.mock("@/lib/load-client-config", () => ({
  loadClientConfig: vi.fn(),
}));

vi.mock("@beauty-booking/db", () => ({
  getDb: vi.fn(),
  bookings: {},
  automationJobs: {},
  gdprConsents: {},
}));

import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { loadClientConfig } from "@/lib/load-client-config";
import { getDb } from "@beauty-booking/db";

// Drizzle chain mock — V2-9 pattern
// Chain is thenable so `await ...where()` (no .limit) also resolves correctly
function makeSelectChain(result: unknown[]) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
  // Make chain awaitable without needing .limit()
  chain.then = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

// Multi-call mock:
// select call 1 → completedBookings
// select call 2 → gdprConsent check
// select call 3 → duplicate check
function makeJobDbMock(opts: {
  completedBookings?: unknown[];
  hasConsent?: boolean;
  hasDuplicate?: boolean;
}) {
  const {
    completedBookings = [],
    hasConsent = true,
    hasDuplicate = false,
  } = opts;
  let callCount = 0;
  return {
    select: vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSelectChain(completedBookings);
      if (callCount === 2)
        return makeSelectChain(hasConsent ? [{ id: "consent-id" }] : []);
      if (callCount === 3)
        return makeSelectChain(hasDuplicate ? [{ id: "job-id" }] : []);
      return makeSelectChain([]);
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ id: "new-job-id" }]),
    }),
  };
}

const MOCK_BOOKING = {
  id: "b-1",
  leadId: "lead-1",
  customerName: "Anna M.",
  customerContact: "anna@example.com",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isAdminApiAuthenticated).mockReturnValue(true);
  vi.mocked(loadClientConfig).mockReturnValue({ rebookingWeeks: 4 } as any);
  process.env.WEBHOOK_SECRET = "test-secret";
});

function makeJobRequest() {
  return new Request("http://localhost/api/jobs/rebooking", {
    method: "POST",
    headers: { "x-webhook-secret": "test-secret" },
  });
}

describe("POST /api/jobs/rebooking", () => {
  it("returns 401 without WEBHOOK_SECRET header", async () => {
    const req = new Request("http://localhost/api/jobs/rebooking", {
      method: "POST",
    });
    const res = await POST_JOB(req as any);
    expect(res.status).toBe(401);
  });

  it("processes booking with consent — job inserted as scheduled", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeJobDbMock({
        completedBookings: [MOCK_BOOKING],
        hasConsent: true,
        hasDuplicate: false,
      }) as any
    );

    const res = await POST_JOB(makeJobRequest() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.summary.processed).toBe(1);
    expect(body.summary.skippedConsent).toBe(0);
    // scheduledFor gelecekte olmalı
    expect(new Date(body.summary.scheduledFor).getTime()).toBeGreaterThan(
      Date.now()
    );
  });

  it("skips booking without reminder_messages consent", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeJobDbMock({
        completedBookings: [MOCK_BOOKING],
        hasConsent: false,
      }) as any
    );

    const res = await POST_JOB(makeJobRequest() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.processed).toBe(0);
    expect(body.summary.skippedConsent).toBe(1);
  });

  it("skips duplicate — existing rebooking_reminder for same booking", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeJobDbMock({
        completedBookings: [MOCK_BOOKING],
        hasConsent: true,
        hasDuplicate: true,
      }) as any
    );

    const res = await POST_JOB(makeJobRequest() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.processed).toBe(0);
    expect(body.summary.skippedDuplicate).toBe(1);
  });

  it("clamps rebookingWeeks — value 1 → 2, value 15 → 12", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeJobDbMock({ completedBookings: [] }) as any
    );

    vi.mocked(loadClientConfig).mockReturnValue({ rebookingWeeks: 1 } as any);
    const res1 = await POST_JOB(makeJobRequest() as any);
    expect((await res1.json()).summary.rebookingWeeks).toBe(2);

    vi.mocked(loadClientConfig).mockReturnValue({ rebookingWeeks: 15 } as any);
    const res2 = await POST_JOB(makeJobRequest() as any);
    expect((await res2.json()).summary.rebookingWeeks).toBe(12);
  });
});

describe("GET /api/admin/rebooking", () => {
  it("returns 401 without admin auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);
    const res = await GET_ADMIN(
      new Request("http://localhost/api/admin/rebooking") as any
    );
    expect(res.status).toBe(401);
  });

  it("returns scheduled job list with customerName from leftJoin", async () => {
    const mockJob = {
      id: "job-1",
      bookingId: "b-1",
      scheduledAt: new Date(Date.now() + 28 * 86400000).toISOString(),
      executedAt: null,
      status: "scheduled",
      result: { rebookingWeeks: 4 },
      customerName: "Anna M.",
      customerContact: "anna@example.com",
    };
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValue(makeSelectChain([mockJob])),
    } as any);

    const res = await GET_ADMIN(
      new Request("http://localhost/api/admin/rebooking") as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].status).toBe("scheduled");
    expect(body.jobs[0].executedAt).toBeNull();
    expect(body.jobs[0].customerName).toBe("Anna M.");
    expect(body.count).toBe(1);
  });
});

describe("POST /api/admin/rebooking", () => {
  it("returns 401 without admin auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);
    const res = await POST_ADMIN(
      new Request("http://localhost/api/admin/rebooking", {
        method: "POST",
      }) as any
    );
    expect(res.status).toBe(401);
  });
});
