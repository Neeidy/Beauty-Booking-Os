import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  // --- Leads INSERT chain: insert → values → returning ---
  const mockLeadsInsertReturning = vi.fn().mockResolvedValue([]);
  const mockLeadsInsertValues = vi.fn().mockReturnValue({ returning: mockLeadsInsertReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockLeadsInsertValues });

  // --- Leads SELECT short chain (duplicate check): where → limit (awaitable) ---
  const mockLeadsLimit = vi.fn().mockResolvedValue([]);

  // --- Leads SELECT long chain (admin list): where → orderBy → limit → offset (awaitable) ---
  const mockLeadsOffset = vi.fn().mockResolvedValue([]);
  const mockLeadsAdminLimit = vi.fn().mockReturnValue({ offset: mockLeadsOffset });
  const mockLeadsOrderBy = vi.fn().mockReturnValue({ limit: mockLeadsAdminLimit });

  // leads where — returns BOTH limit (for short chain) AND orderBy (for long chain)
  const mockLeadsWhere = vi.fn().mockReturnValue({
    limit: mockLeadsLimit,
    orderBy: mockLeadsOrderBy,
  });

  // --- Services SELECT chain: where → limit (awaitable) ---
  const mockSvcLimit = vi.fn().mockResolvedValue([]);
  const mockSvcWhere = vi.fn().mockReturnValue({ limit: mockSvcLimit });

  // --- Dispatch by table: services has "serviceName", leads do not ---
  const mockFrom = vi.fn().mockImplementation((table: Record<string, unknown>) => {
    if ("serviceName" in table) {
      return { where: mockSvcWhere };
    }
    return { where: mockLeadsWhere };
  });

  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  const mockIsAuth = vi.fn().mockReturnValue(true);

  return {
    mockLeadsInsertReturning,
    mockLeadsInsertValues,
    mockInsert,
    mockLeadsLimit,
    mockLeadsOffset,
    mockLeadsAdminLimit,
    mockLeadsOrderBy,
    mockLeadsWhere,
    mockSvcLimit,
    mockSvcWhere,
    mockFrom,
    mockSelect,
    mockIsAuth,
    mockDb: { select: mockSelect, insert: mockInsert },
  };
});

vi.mock("@beauty-booking/db", () => ({
  getDb: () => mocks.mockDb,
  leads: {
    id: {}, clientId: {}, customerName: {}, customerEmail: {},
    customerPhone: {}, rawMessage: {}, status: {}, source: {},
    gdprConsentAt: {}, gdprConsentMethod: {}, metadata: {}, createdAt: {},
    updatedAt: {},
  },
  services: {
    id: {}, serviceName: {}, durationMinutes: {},
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  isAdminApiAuthenticated: mocks.mockIsAuth,
}));

// ── Import handlers AFTER mocks ───────────────────────────────────────────────

import { POST } from "../app/api/waiting-list/route";
import { GET } from "../app/api/admin/waiting-list/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const FUTURE_DATE = "2026-05-12"; // 31 days after fake now
const SERVICE_ID = "00000000-0000-0000-0000-000000000042";

function makePostRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost:3030/api/waiting-list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeAdminRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3030/api/admin/waiting-list");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    customerName: "Anna Müller",
    customerEmail: "anna@example.at",
    serviceId: SERVICE_ID,
    requestedDate: FUTURE_DATE,
    gdprConsent: true,
    ...overrides,
  };
}

function makeWaitingEntry(overrides: Partial<{
  notified: boolean;
  requestedDate: string;
  requestedServiceId: string;
}> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    customerName: "Anna Müller",
    customerEmail: "anna@example.at",
    customerPhone: null,
    metadata: {
      waitingList: true,
      requestedDate: overrides.requestedDate ?? "2026-06-01",
      requestedServiceId: overrides.requestedServiceId ?? SERVICE_ID,
      waitingList_notified: overrides.notified ?? false,
      waitingList_registeredAt: "2026-04-10T10:00:00.000Z",
    },
    createdAt: new Date("2026-04-10T10:00:00.000Z"),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/waiting-list", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T12:00:00Z")); // 31 days before FUTURE_DATE
    mocks.mockLeadsLimit.mockResolvedValue([]);
    mocks.mockSvcLimit.mockResolvedValue([]);
    mocks.mockLeadsInsertReturning.mockResolvedValue([{ id: "new-lead-id" }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1 — missing customerName → 400", async () => {
    const res = await POST(makePostRequest(validBody({ customerName: undefined })));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Validation failed");
  });

  it("2 — invalid email → 400", async () => {
    const res = await POST(makePostRequest(validBody({ customerEmail: "notanemail" })));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Validation failed");
  });

  it("3 — missing gdprConsent (false) → 400", async () => {
    const res = await POST(makePostRequest(validBody({ gdprConsent: false })));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Validation failed");
  });

  it("4 — past date → 400", async () => {
    const res = await POST(makePostRequest(validBody({ requestedDate: "2020-01-01" })));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/past/i);
  });

  it("5 — valid entry created → 201 with leadId", async () => {
    mocks.mockLeadsLimit.mockResolvedValue([]); // no duplicate
    mocks.mockSvcLimit.mockResolvedValue([{ serviceName: "Gelnägel" }]);
    mocks.mockLeadsInsertReturning.mockResolvedValue([{ id: "abc-123" }]);

    const res = await POST(makePostRequest(validBody()));
    expect(res.status).toBe(201);

    const body = await res.json() as { success: boolean; alreadyRegistered: boolean; leadId: string };
    expect(body.success).toBe(true);
    expect(body.alreadyRegistered).toBe(false);
    expect(body.leadId).toBe("abc-123");
  });

  it("6 — duplicate entry → 200 alreadyRegistered:true, insert NOT called", async () => {
    mocks.mockLeadsLimit.mockResolvedValue([{ id: "existing-id" }]);
    mocks.mockLeadsInsertValues.mockClear();

    const res = await POST(makePostRequest(validBody()));
    expect(res.status).toBe(200);

    const body = await res.json() as { success: boolean; alreadyRegistered: boolean };
    expect(body.success).toBe(true);
    expect(body.alreadyRegistered).toBe(true);
    expect(mocks.mockLeadsInsertValues).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/waiting-list", () => {
  beforeEach(() => {
    mocks.mockIsAuth.mockReturnValue(true);
    mocks.mockLeadsOffset.mockResolvedValue([]);
  });

  it("7 — unauthorized → 401", async () => {
    mocks.mockIsAuth.mockReturnValue(false);
    const res = await GET(makeAdminRequest());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("8 — returns entries from DB", async () => {
    const entry1 = makeWaitingEntry({ requestedDate: "2026-06-01", notified: false });
    const entry2 = makeWaitingEntry({ requestedDate: "2026-06-02", notified: false });
    mocks.mockLeadsOffset.mockResolvedValue([entry1, entry2]);

    const res = await GET(makeAdminRequest());
    expect(res.status).toBe(200);

    const body = await res.json() as { entries: { requestedDate: string; notified: boolean }[]; total: number };
    expect(body.entries.length).toBe(2);
    expect(body.entries[0]?.requestedDate).toBe("2026-06-01");
    expect(body.entries[0]?.notified).toBe(false);
    expect(body.total).toBe(2);
  });

  it("9 — notified filter: returns only notified entries", async () => {
    const notified1 = makeWaitingEntry({ notified: true });
    const notified2 = makeWaitingEntry({ notified: true });
    // Simulate DB returning only matching entries for ?notified=true
    mocks.mockLeadsOffset.mockResolvedValue([notified1, notified2]);

    const res = await GET(makeAdminRequest({ notified: "true" }));
    expect(res.status).toBe(200);

    const body = await res.json() as { entries: { notified: boolean }[] };
    expect(body.entries.length).toBe(2);
    expect(body.entries.every((e) => e.notified === true)).toBe(true);
  });

  it("10 — response shape: entries, total, page, limit; each entry has required fields", async () => {
    const entry = makeWaitingEntry();
    mocks.mockLeadsOffset.mockResolvedValue([entry]);

    const res = await GET(makeAdminRequest());
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body["entries"])).toBe(true);
    expect(typeof body["total"]).toBe("number");
    expect(typeof body["page"]).toBe("number");
    expect(typeof body["limit"]).toBe("number");

    const first = (body["entries"] as Record<string, unknown>[])[0]!;
    expect(typeof first["id"]).toBe("string");
    expect("customerName" in first).toBe(true);
    expect("customerEmail" in first).toBe(true);
    expect(typeof first["requestedDate"]).toBe("string");
    expect(typeof first["requestedServiceId"]).toBe("string");
    expect(typeof first["notified"]).toBe("boolean");
    expect(typeof first["registeredAt"]).toBe("string");
    expect(typeof first["createdAt"]).toBe("string");
  });
});
