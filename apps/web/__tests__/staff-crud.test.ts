import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GET,
  POST,
  PATCH,
  DELETE,
} from "../app/api/admin/staff/route";

vi.mock("@/lib/admin-auth", () => ({ isAdminApiAuthenticated: vi.fn() }));
vi.mock("@/lib/load-staff-config", () => ({
  getAllStaff: vi.fn(),
  getActiveStaff: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ logRequest: vi.fn(), logError: vi.fn() }));
vi.mock("@beauty-booking/db", () => ({
  getDb: vi.fn(),
  clients: {},
}));

import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getAllStaff } from "@/lib/load-staff-config";
import { getDb } from "@beauty-booking/db";

const MOCK_STAFF = [
  { id: "s-1", name: "Anna", title: "Nageldesignerin", active: true, serviceIds: [] },
  { id: "s-2", name: "Sofia", title: "Kosmetikerin", active: false, serviceIds: [] },
];

function makeDbMock(snapshot: Record<string, unknown> = { staff: MOCK_STAFF }) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ configSnapshot: snapshot }]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isAdminApiAuthenticated).mockReturnValue(true);
  vi.mocked(getAllStaff).mockReturnValue(MOCK_STAFF as any);
});

describe("GET /api/admin/staff", () => {
  it("returns staff from DB configSnapshot", async () => {
    vi.mocked(getDb).mockReturnValue(makeDbMock() as any);
    const res = await GET(new Request("http://localhost/api/admin/staff") as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.staff).toHaveLength(2);
    expect(body.staff[0].name).toBe("Anna");
  });

  it("falls back to getAllStaff when configSnapshot has no staff", async () => {
    vi.mocked(getDb).mockReturnValue(makeDbMock({}) as any);
    const res = await GET(new Request("http://localhost/api/admin/staff") as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.staff).toHaveLength(2); // from getAllStaff mock
  });
});

describe("POST /api/admin/staff", () => {
  it("adds new staff member with generated id", async () => {
    vi.mocked(getDb).mockReturnValue(makeDbMock() as any);
    const res = await POST(
      new Request("http://localhost/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Lena", title: "Wimpernstudio", serviceIds: [] }),
      }) as any
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.member.name).toBe("Lena");
    expect(body.member.id).toBeTruthy(); // uuid üretildi
  });

  it("returns 400 for missing name", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Kosmetikerin" }),
      }) as any
    );
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/staff", () => {
  it("updates staff member name and title", async () => {
    vi.mocked(getDb).mockReturnValue(makeDbMock() as any);
    const res = await PATCH(
      new Request("http://localhost/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "s-1", name: "Anna M.", title: "Senior Nageldesignerin" }),
      }) as any
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.member.name).toBe("Anna M.");
  });

  it("returns 404 for unknown staff id", async () => {
    vi.mocked(getDb).mockReturnValue(makeDbMock() as any);
    const res = await PATCH(
      new Request("http://localhost/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "unknown-id", active: false }),
      }) as any
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/staff", () => {
  it("removes staff member by id", async () => {
    vi.mocked(getDb).mockReturnValue(makeDbMock() as any);
    const res = await DELETE(
      new Request("http://localhost/api/admin/staff?id=s-1", {
        method: "DELETE",
      }) as any
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 400 when id param missing", async () => {
    const res = await DELETE(
      new Request("http://localhost/api/admin/staff", {
        method: "DELETE",
      }) as any
    );
    expect(res.status).toBe(400);
  });
});
