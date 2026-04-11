// SYNC — no await, no async wrapper. On any error returns []. Never throws.
import * as fs from "fs";
import * as path from "path";

export interface StaffMember {
  id: string;
  name: string;
  title: string;
  active: boolean;
}

interface StaffConfig {
  staff: StaffMember[];
}

// Returns ALL staff members (active and inactive).
// Used by admin route to show full data.
export function getAllStaff(slug?: string): StaffMember[] {
  try {
    const clientSlug =
      slug ??
      process.env.NEXT_PUBLIC_DEFAULT_CLIENT_SLUG ??
      "demo-salon";
    // Mirrors load-client-config.ts path convention: cwd = apps/web/, so ../../ = monorepo root
    const filePath = path.resolve(
      process.cwd(),
      "..",
      "..",
      "clients",
      clientSlug,
      "staff.json"
    );
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as StaffConfig;
    if (!Array.isArray(parsed?.staff)) return [];
    return parsed.staff;
  } catch {
    return [];
  }
}

// Returns only active staff members.
// Used by public route and BookingForm dropdown.
export function getActiveStaff(slug?: string): StaffMember[] {
  return getAllStaff(slug).filter((s) => s.active === true);
}
