import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as GET_PUBLIC } from "../app/api/public/staff/route";
import { GET as GET_ADMIN } from "../app/api/admin/staff/route";

// Mock pattern — follows booking-slots-api.test.ts convention
vi.mock("@/lib/admin-auth", () => ({
  isAdminApiAuthenticated: vi.fn(),
}));

vi.mock("@/lib/load-staff-config", () => ({
  getActiveStaff: vi.fn(),
  getAllStaff: vi.fn(),
}));

import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getActiveStaff, getAllStaff } from "@/lib/load-staff-config";

const MOCK_ACTIVE_STAFF = [
  { id: "staff_1", name: "Anna", title: "Nageldesignerin", active: true },
  { id: "staff_2", name: "Sofia", title: "Kosmetikerin", active: true },
];

const MOCK_ALL_STAFF = [
  { id: "staff_1", name: "Anna", title: "Nageldesignerin", active: true },
  { id: "staff_2", name: "Sofia", title: "Kosmetikerin", active: true },
  { id: "staff_3", name: "Lena", title: "Wimpernstudio", active: false },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isAdminApiAuthenticated).mockReturnValue(true);
  vi.mocked(getActiveStaff).mockReturnValue(MOCK_ACTIVE_STAFF);
  vi.mocked(getAllStaff).mockReturnValue(MOCK_ALL_STAFF);
});

describe("GET /api/public/staff", () => {
  it("returns id/name/title only — active field must not be exposed", async () => {
    const response = await GET_PUBLIC();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.staff).toHaveLength(2);
    expect(body.staff[0]).toHaveProperty("id", "staff_1");
    expect(body.staff[0]).toHaveProperty("name", "Anna");
    expect(body.staff[0]).toHaveProperty("title", "Nageldesignerin");
    expect(body.staff[0]).not.toHaveProperty("active"); // security: internal field filtered
  });

  it("returns { staff: [] } with HTTP 200 when no staff configured — form must not crash", async () => {
    vi.mocked(getActiveStaff).mockReturnValue([]);

    const response = await GET_PUBLIC();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.staff).toEqual([]);
  });
});

describe("GET /api/admin/staff", () => {
  it("returns 401 without admin auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);
    const request = new Request("http://localhost/api/admin/staff");

    const response = await GET_ADMIN(request as any);

    expect(response.status).toBe(401);
  });

  it("returns full staff data including inactive members with valid auth", async () => {
    const request = new Request("http://localhost/api/admin/staff");

    const response = await GET_ADMIN(request as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.staff).toHaveLength(3); // all staff including inactive
    expect(body.staff[0]).toHaveProperty("active", true);
    expect(body.staff[2]).toHaveProperty("active", false); // inactive member visible to admin
  });
});
