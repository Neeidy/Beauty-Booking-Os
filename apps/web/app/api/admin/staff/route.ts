export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, clients } from "@beauty-booking/db";
import { eq } from "drizzle-orm";
import { getAllStaff, type StaffMember } from "@/lib/load-staff-config";
import { z } from "zod";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

// Helper: DB'den staff listesini oku, fallback file
async function getStaffFromDb(): Promise<StaffMember[]> {
  try {
    const db = getDb();
    const clientRow = await db
      .select({ configSnapshot: clients.configSnapshot })
      .from(clients)
      .where(eq(clients.id, CLIENT_ID))
      .limit(1);

    const snapshot = clientRow[0]?.configSnapshot as Record<string, unknown> | null;
    const dbStaff = snapshot?.staff as StaffMember[] | undefined;

    if (Array.isArray(dbStaff) && dbStaff.length > 0) {
      return dbStaff;
    }
    return getAllStaff(); // fallback
  } catch {
    return getAllStaff();
  }
}

// Helper: staff listesini DB'ye yaz
async function saveStaffToDb(staff: StaffMember[]): Promise<void> {
  const db = getDb();
  const clientRow = await db
    .select({ configSnapshot: clients.configSnapshot })
    .from(clients)
    .where(eq(clients.id, CLIENT_ID))
    .limit(1);

  if (clientRow.length === 0) throw new Error("Client not found");

  const current = (clientRow[0]!.configSnapshot as Record<string, unknown>) ?? {};
  await db
    .update(clients)
    .set({ configSnapshot: { ...current, staff } })
    .where(eq(clients.id, CLIENT_ID));
}

// GET — tüm staff (active + inactive)
export async function GET(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("GET", "/api/admin/staff", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const staff = await getStaffFromDb();
    logRequest("GET", "/api/admin/staff", 200, Date.now() - start);
    return NextResponse.json({ success: true, staff });
  } catch (err) {
    logError("/api/admin/staff", err);
    logRequest("GET", "/api/admin/staff", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — yeni staff ekle
export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("POST", "/api/admin/staff", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const NewStaffSchema = z.object({
    name: z.string().min(1).max(100),
    title: z.string().min(1).max(100),
    active: z.boolean().default(true),
    serviceIds: z.array(z.string().uuid()).default([]),
  });

  const parsed = NewStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const current = await getStaffFromDb();

    const newMember: StaffMember = {
      id: crypto.randomUUID(),
      ...parsed.data,
    };

    await saveStaffToDb([...current, newMember]);
    logRequest("POST", "/api/admin/staff", 201, Date.now() - start);
    return NextResponse.json({ success: true, member: newMember }, { status: 201 });
  } catch (err) {
    logError("/api/admin/staff", err);
    logRequest("POST", "/api/admin/staff", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — staff üyesini güncelle
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("PATCH", "/api/admin/staff", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const PatchSchema = z.object({
    id: z.string(),
    name: z.string().min(1).max(100).optional(),
    title: z.string().min(1).max(100).optional(),
    active: z.boolean().optional(),
    serviceIds: z.array(z.string().uuid()).optional(),
  });

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const current = await getStaffFromDb();
    const idx = current.findIndex(s => s.id === parsed.data.id);

    if (idx === -1) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const { id: _id, ...updates } = parsed.data;
    const updated = [...current];
    const existing = updated[idx]!;
    const merged: StaffMember = {
      id: existing.id,
      name: updates.name ?? existing.name,
      title: updates.title ?? existing.title,
      active: updates.active ?? existing.active,
    };
    const resolvedServiceIds = updates.serviceIds ?? existing.serviceIds;
    if (resolvedServiceIds !== undefined) {
      merged.serviceIds = resolvedServiceIds;
    }
    updated[idx] = merged;

    await saveStaffToDb(updated);
    logRequest("PATCH", "/api/admin/staff", 200, Date.now() - start);
    return NextResponse.json({ success: true, member: updated[idx] });
  } catch (err) {
    logError("/api/admin/staff", err);
    logRequest("PATCH", "/api/admin/staff", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — staff üyesini sil
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("DELETE", "/api/admin/staff", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id query param" }, { status: 400 });
  }

  try {
    const current = await getStaffFromDb();
    const filtered = current.filter(s => s.id !== id);

    if (filtered.length === current.length) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    await saveStaffToDb(filtered);
    logRequest("DELETE", "/api/admin/staff", 200, Date.now() - start);
    return NextResponse.json({ success: true });
  } catch (err) {
    logError("/api/admin/staff", err);
    logRequest("DELETE", "/api/admin/staff", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
