import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as POST_ADMIN_REVIEW } from "../app/api/admin/bookings/[id]/reviews/route";
import { POST as POST_JOBS_REVIEWS } from "../app/api/jobs/reviews/route";

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
}));

import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { loadClientConfig } from "@/lib/load-client-config";
import { getDb } from "@beauty-booking/db";

const MOCK_REVIEW_URL = "https://g.page/vienna-glow-studio/review";

// Drizzle query chain mock helper — select → where → limit zincirini simüle eder
function makeDbMock(selectResult: unknown[], insertOk = true) {
  const chainMock = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(selectResult),
  };
  return {
    select: vi.fn().mockReturnValue(chainMock),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(insertOk ? [{ id: "new-job" }] : undefined),
    }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isAdminApiAuthenticated).mockReturnValue(true);
  vi.mocked(loadClientConfig).mockReturnValue({
    googleBusiness: { reviewUrl: MOCK_REVIEW_URL },
  } as any);
});

describe("POST /api/admin/bookings/[id]/reviews", () => {
  it("returns reviewUrl for completed booking", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeDbMock([{ id: "b-1", status: "completed" }]) as any
    );

    const request = new Request(
      "http://localhost/api/admin/bookings/b-1/reviews",
      { method: "POST" }
    );
    const response = await POST_ADMIN_REVIEW(request as any, {
      params: Promise.resolve({ id: "b-1" }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.reviewUrl).toBe(MOCK_REVIEW_URL);
    expect(body.bookingId).toBe("b-1");
  });

  it("returns 400 for non-completed booking", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeDbMock([{ id: "b-2", status: "confirmed" }]) as any
    );

    const request = new Request(
      "http://localhost/api/admin/bookings/b-2/reviews",
      { method: "POST" }
    );
    const response = await POST_ADMIN_REVIEW(request as any, {
      params: Promise.resolve({ id: "b-2" }),
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("not completed");
  });

  it("returns 401 without admin auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);

    const request = new Request(
      "http://localhost/api/admin/bookings/b-1/reviews",
      { method: "POST" }
    );
    const response = await POST_ADMIN_REVIEW(request as any, {
      params: Promise.resolve({ id: "b-1" }),
    } as any);

    expect(response.status).toBe(401);
  });

  it("returns 400 when reviewUrl not configured", async () => {
    vi.mocked(loadClientConfig).mockReturnValue({
      googleBusiness: { profileUrl: "https://example.com" },
      // reviewUrl yok
    } as any);
    vi.mocked(getDb).mockReturnValue(
      makeDbMock([{ id: "b-1", status: "completed" }]) as any
    );

    const request = new Request(
      "http://localhost/api/admin/bookings/b-1/reviews",
      { method: "POST" }
    );
    const response = await POST_ADMIN_REVIEW(request as any, {
      params: Promise.resolve({ id: "b-1" }),
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("No review URL");
  });
});
