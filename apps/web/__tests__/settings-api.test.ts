import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as GET_SERVICES } from "../app/api/admin/services/route";
import { PATCH as PATCH_SERVICE } from "../app/api/admin/services/[id]/route";
import { GET as GET_CONFIG, PATCH as PATCH_CONFIG } from "../app/api/admin/config/route";

vi.mock("@/lib/admin-auth", () => ({ isAdminApiAuthenticated: vi.fn() }));
vi.mock("@/lib/load-client-config", () => ({ loadClientConfig: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logRequest: vi.fn(), logError: vi.fn() }));
vi.mock("@beauty-booking/db", () => ({
  getDb: vi.fn(),
  services: {},
  clients: {},
}));

import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { loadClientConfig } from "@/lib/load-client-config";
import { getDb } from "@beauty-booking/db";

function makeChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isAdminApiAuthenticated).mockReturnValue(true);
  vi.mocked(loadClientConfig).mockReturnValue({} as ReturnType<typeof loadClientConfig>);
});

describe("GET /api/admin/services", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);
    const res = await GET_SERVICES(new Request("http://localhost/api/admin/services") as any);
    expect(res.status).toBe(401);
  });

  it("returns service list", async () => {
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValue(makeChain([
        { id: "s-1", serviceName: "Gel Manikür", priceEur: 4500, active: true },
      ])),
    } as any);
    const res = await GET_SERVICES(new Request("http://localhost/api/admin/services") as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.services).toHaveLength(1);
    expect(body.services[0].serviceName).toBe("Gel Manikür");
  });
});

describe("PATCH /api/admin/services/[id]", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);
    const res = await PATCH_SERVICE(
      new Request("http://localhost/api/admin/services/s-1", {
        method: "PATCH",
        body: JSON.stringify({ priceEur: 5000 }),
        headers: { "Content-Type": "application/json" },
      }) as any,
      { params: Promise.resolve({ id: "s-1" }) } as any
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid priceEur", async () => {
    const res = await PATCH_SERVICE(
      new Request("http://localhost/api/admin/services/s-1", {
        method: "PATCH",
        body: JSON.stringify({ priceEur: -100 }),
        headers: { "Content-Type": "application/json" },
      }) as any,
      { params: Promise.resolve({ id: "s-1" }) } as any
    );
    expect(res.status).toBe(400);
  });

  it("updates service priceEur and active", async () => {
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValue(makeChain([{ id: "s-1" }])),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "s-1", priceEur: 5000, active: false }]),
          }),
        }),
      }),
    } as any);
    const res = await PATCH_SERVICE(
      new Request("http://localhost/api/admin/services/s-1", {
        method: "PATCH",
        body: JSON.stringify({ priceEur: 5000, active: false }),
        headers: { "Content-Type": "application/json" },
      }) as any,
      { params: Promise.resolve({ id: "s-1" }) } as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.service.priceEur).toBe(5000);
  });
});

describe("GET /api/admin/config", () => {
  it("merges DB configSnapshot with file config", async () => {
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValue(makeChain([
        { configSnapshot: { staff: [{ id: "s1", name: "Anna", title: "Nail", active: true }] } },
      ])),
    } as any);
    const res = await GET_CONFIG(new Request("http://localhost/api/admin/config") as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.config.staff).toHaveLength(1);
    expect(body.config.staff[0].name).toBe("Anna");
  });
});

describe("PATCH /api/admin/config", () => {
  it("returns 400 for invalid closedDates format", async () => {
    const res = await PATCH_CONFIG(
      new Request("http://localhost/api/admin/config", {
        method: "PATCH",
        body: JSON.stringify({ closedDates: ["not-a-date"] }),
        headers: { "Content-Type": "application/json" },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("saves closedDates to configSnapshot", async () => {
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValue(makeChain([{ configSnapshot: {} }])),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    } as any);
    const res = await PATCH_CONFIG(
      new Request("http://localhost/api/admin/config", {
        method: "PATCH",
        body: JSON.stringify({ closedDates: ["2026-04-24"] }),
        headers: { "Content-Type": "application/json" },
      }) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.config.closedDates).toContain("2026-04-24");
  });
});
