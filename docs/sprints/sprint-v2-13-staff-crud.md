# Sprint V2-13: Staff CRUD + Hizmet Bağlantısı

**Backend status:** `packages/**` FROZEN. `apps/web/**` + `clients/` only.
**DB schema:** NO new tables. Uses existing `clients.configSnapshot` JSONB (V2-12'de kuruldu).
**Test baseline:** 298/298 (V2-12 complete)
**Hedef:** 306/306 (+8 yeni test)

---

## Sprint Scope

### Bu sprint yapacaklar
- Staff CRUD: ekle, düzenle, sil, aktif/pasif toggle
- Her staff üyesine hizmet bağlantısı (`serviceIds: string[]`)
- `configSnapshot.staff` DB'ye yazılır — production'da filesystem bypass
- `GET /api/public/staff` DB-first okuma (configSnapshot → staff.json fallback)
- `GET /api/admin/staff` DB-first okuma
- `/admin/staff` sayfası kartlardan edit UI'a dönüşür
- BookingForm: seçilen servise göre staff listesi filtrelenir

### Bu sprint yapmayacaklar
- Staff slot blocking yok (DB foreign key gerektiriyor — kapsam dışı)
- `packages/**` değişikliği yok
- `/api/lead` dokunulmaz
- `BookingForm` submit payload değişmez — notes pattern korunur
- Yeni DB tablosu yok

---

## Mimari Karar

**V2-12'de kurulan `configSnapshot` pattern'i kullanılır:**

```
Okuma önceliği:
1. clients.configSnapshot.staff → DB'de varsa bunu kullan
2. getActiveStaff() → staff.json fallback
```

**Staff veri yapısı (genişletilmiş):**
```typescript
interface StaffMember {
  id: string;          // benzersiz — uuid formatında üretilir
  name: string;
  title: string;
  active: boolean;
  serviceIds: string[]; // hangi hizmetleri veriyor — services.id UUID'leri
}
```

**BookingForm filtresi:**
Müşteri servis seçince staff dropdown sadece o servisi `serviceIds`'de içeren
aktif üyeleri gösterir. `serviceIds` boşsa veya hiç eşleşme yoksa tüm aktif
staff gösterilir (fallback — form hiçbir zaman blank kalmaz).

---

## Mandatory Pre-Read

```bash
# 1. configSnapshot mevcut durumu — staff field var mı?
# Supabase'de: SELECT config_snapshot FROM clients LIMIT 1;

# 2. load-staff-config.ts — tam içerik
cat apps/web/lib/load-staff-config.ts

# 3. GET /api/public/staff — mevcut implementasyon
cat apps/web/app/api/public/staff/route.ts

# 4. GET /api/admin/staff — mevcut implementasyon
cat apps/web/app/api/admin/staff/route.ts

# 5. /admin/staff/page.tsx — mevcut içerik
cat apps/web/app/admin/staff/page.tsx

# 6. BookingForm.tsx — staff fetch + dropdown + onSlotSelect callback
cat apps/web/components/BookingForm.tsx | grep -A30 "staffList\|publicStaff\|Mitarbeiter"

# 7. /api/admin/config route — PATCH implementasyonu (V2-12)
cat apps/web/app/api/admin/config/route.ts

# 8. Test mock pattern referans
cat apps/web/__tests__/settings-api.test.ts | head -60

# 9. clients tablosu export kontrolü
grep "clients" packages/db/src/index.ts
```

> **STOP kuralları:**
> - `clients` export edilmiyorsa → dur, rapor et
> - `configSnapshot` field yoksa → dur, rapor et
> - `staff.json` yoksa → getActiveStaff() boş array dönüyor, normal

---

## Implementation Plan

| Adım | Dosya | Durum | Açıklama |
|---|---|---|---|
| 1 | `apps/web/app/api/public/staff/route.ts` | MODİFİYE | DB-first okuma |
| 2 | `apps/web/app/api/admin/staff/route.ts` | MODİFİYE | DB-first okuma + CRUD |
| 3 | `apps/web/app/admin/staff/page.tsx` | MODİFİYE | Shell → StaffManagementView |
| 4 | `apps/web/app/admin/staff/StaffManagementView.tsx` | YENİ | Client CRUD UI |
| 5 | `apps/web/components/BookingForm.tsx` | MODİFİYE | Servis bazlı staff filtresi |
| 6 | `apps/web/__tests__/staff-crud.test.ts` | YENİ | 8 test |

---

## Dosya 1 — `apps/web/app/api/public/staff/route.ts` (MODİFİYE)

**Önce oku:** `cat apps/web/app/api/public/staff/route.ts`

Mevcut `getActiveStaff()` çağrısını DB-first pattern ile değiştir:

```typescript
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb, clients } from "@beauty-booking/db";
import { eq } from "drizzle-orm";
import { getActiveStaff, type StaffMember } from "@/lib/load-staff-config";
import { z } from "zod";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

const PublicStaffMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  serviceIds: z.array(z.string()).optional(),
});

const PublicStaffResponseSchema = z.object({
  staff: z.array(PublicStaffMemberSchema),
});

export async function GET(): Promise<NextResponse> {
  try {
    let activeStaff: StaffMember[] = [];

    // DB-first: configSnapshot.staff
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
        activeStaff = dbStaff.filter(s => s.active === true);
      } else {
        // Fallback: staff.json
        activeStaff = getActiveStaff();
      }
    } catch {
      // DB okuma başarısız → file fallback
      activeStaff = getActiveStaff();
    }

    // Public endpoint: active field ve internal data gizlenir
    // serviceIds müşteriye gönderilir — BookingForm filtresi için gerekli
    const publicStaff = activeStaff.map(({ id, name, title, serviceIds }) => ({
      id,
      name,
      title,
      serviceIds: serviceIds ?? [],
    }));

    const parsed = PublicStaffResponseSchema.safeParse({ staff: publicStaff });
    if (!parsed.success) {
      return NextResponse.json({ staff: [] });
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("[/api/public/staff]", err);
    return NextResponse.json({ staff: [] });
  }
}
```

---

## Dosya 2 — `apps/web/app/api/admin/staff/route.ts` (MODİFİYE)

**Önce oku:** `cat apps/web/app/api/admin/staff/route.ts`

Mevcut `getAllStaff()` çağrısını DB-first pattern ile değiştir. POST (ekle) ve DELETE (sil) endpoint'leri ekle.

```typescript
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

const StaffMemberSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  active: z.boolean(),
  serviceIds: z.array(z.string().uuid()).default([]),
});

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

  const current = (clientRow[0].configSnapshot as Record<string, unknown>) ?? {};
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

  // id zorunlu değil — yeni üye için üretilir
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

    // Benzersiz id üret
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

    const { id, ...updates } = parsed.data;
    const updated = [...current];
    updated[idx] = { ...updated[idx], ...updates };

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
```

---

## Dosya 3 — `apps/web/app/admin/staff/page.tsx` (MODİFİYE)

Server component shell — interactivity `StaffManagementView`'de.

```typescript
export const dynamic = "force-dynamic";

import StaffManagementView from "./StaffManagementView";

export default function AdminStaffPage(): JSX.Element {
  return (
    <main style={{ padding: "2rem", maxWidth: "900px" }}>
      <h1 style={{
        color: "var(--color-text)",
        fontSize: "1.5rem",
        fontWeight: 600,
        marginBottom: "2rem",
      }}>
        Team
      </h1>
      <StaffManagementView />
    </main>
  );
}
```

---

## Dosya 4 — `apps/web/app/admin/staff/StaffManagementView.tsx` (YENİ)

```typescript
"use client";

import { useEffect, useState } from "react";

interface StaffMember {
  id: string;
  name: string;
  title: string;
  active: boolean;
  serviceIds: string[];
}

interface ServiceOption {
  id: string;
  serviceName: string;
  active: boolean;
}

export default function StaffManagementView(): JSX.Element {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newServiceIds, setNewServiceIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [staffRes, svcRes] = await Promise.all([
        fetch("/api/admin/staff"),
        fetch("/api/admin/services"),
      ]);
      if (!staffRes.ok) throw new Error("Staff load failed");
      const staffData = await staffRes.json();
      setStaff(staffData.staff ?? []);

      if (svcRes.ok) {
        const svcData = await svcRes.json();
        setServices((svcData.services ?? []).filter((s: ServiceOption) => s.active));
      }
    } catch {
      setError("Team konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleToggleActive(member: StaffMember) {
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, active: !member.active }),
      });
      if (!res.ok) throw new Error();
      setSaveMessage(member.active ? `${member.name} deaktiviert.` : `${member.name} aktiviert.`);
      await loadAll();
    } catch {
      setSaveMessage("Fehler beim Speichern.");
    }
  }

  async function handleUpdateServices(member: StaffMember, serviceIds: string[]) {
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, serviceIds }),
      });
      if (!res.ok) throw new Error();
      setSaveMessage(`${member.name} aktualisiert.`);
      await loadAll();
    } catch {
      setSaveMessage("Fehler beim Speichern.");
    }
  }

  async function handleUpdateName(member: StaffMember, name: string, title: string) {
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, name, title }),
      });
      if (!res.ok) throw new Error();
      setSaveMessage("Gespeichert ✓");
      await loadAll();
    } catch {
      setSaveMessage("Fehler beim Speichern.");
    }
  }

  async function handleDelete(member: StaffMember) {
    if (!confirm(`${member.name} wirklich löschen?`)) return;
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/admin/staff?id=${member.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setSaveMessage(`${member.name} gelöscht.`);
      await loadAll();
    } catch {
      setSaveMessage("Fehler beim Löschen.");
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !newTitle.trim()) {
      setSaveMessage("Name und Titel sind erforderlich.");
      return;
    }
    setIsAdding(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          title: newTitle.trim(),
          active: true,
          serviceIds: newServiceIds,
        }),
      });
      if (!res.ok) throw new Error();
      setSaveMessage("Teammitglied hinzugefügt ✓");
      setNewName("");
      setNewTitle("");
      setNewServiceIds([]);
      setShowAddForm(false);
      await loadAll();
    } catch {
      setSaveMessage("Fehler beim Hinzufügen.");
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) return (
    <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Lädt...</p>
  );

  if (error) return (
    <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>⚠ {error}</p>
  );

  return (
    <div>
      {saveMessage && (
        <div style={{
          marginBottom: "1rem", padding: "8px 12px",
          border: "1px solid var(--color-primary)", borderRadius: "6px",
          fontSize: "13px", color: "var(--color-primary)",
        }}>
          {saveMessage}
        </div>
      )}

      {/* Staff kartları */}
      <div style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}>
        {staff.length === 0 && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            Keine Teammitglieder konfiguriert.
          </p>
        )}
        {staff.map(member => (
          <StaffCard
            key={member.id}
            member={member}
            services={services}
            onToggleActive={() => handleToggleActive(member)}
            onUpdateServices={(ids) => handleUpdateServices(member, ids)}
            onUpdateName={(name, title) => handleUpdateName(member, name, title)}
            onDelete={() => handleDelete(member)}
          />
        ))}
      </div>

      {/* Yeni staff ekle */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          style={secondaryButtonStyle}
        >
          + Teammitglied hinzufügen
        </button>
      ) : (
        <div style={{
          border: "1px solid var(--color-accent)", borderRadius: "8px",
          padding: "1.25rem", background: "var(--color-background)",
        }}>
          <h3 style={{ color: "var(--color-text)", fontSize: "14px",
            fontWeight: 600, marginBottom: "1rem" }}>
            Neues Teammitglied
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="z.B. Maria"
              />
            </div>
            <div>
              <label style={labelStyle}>Titel *</label>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="z.B. Nageldesignerin"
              />
            </div>
          </div>

          {services.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>Leistungen</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {services.map(svc => (
                  <label key={svc.id} style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    fontSize: "13px", color: "var(--color-text)", cursor: "pointer",
                  }}>
                    <input
                      type="checkbox"
                      checked={newServiceIds.includes(svc.id)}
                      onChange={e => {
                        setNewServiceIds(prev =>
                          e.target.checked
                            ? [...prev, svc.id]
                            : prev.filter(id => id !== svc.id)
                        );
                      }}
                    />
                    {svc.serviceName}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              style={{
                background: "var(--color-primary)",
                color: "var(--color-background)",
                border: "none", padding: "8px 16px",
                borderRadius: "6px", fontSize: "13px",
                cursor: isAdding ? "not-allowed" : "pointer",
                opacity: isAdding ? 0.6 : 1,
              }}
            >
              {isAdding ? "Wird hinzugefügt..." : "Hinzufügen"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewName(""); setNewTitle(""); setNewServiceIds([]); }}
              style={secondaryButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── StaffCard Sub-Component ────────────────────────────────────────────────

function StaffCard({
  member, services, onToggleActive, onUpdateServices, onUpdateName, onDelete,
}: {
  member: { id: string; name: string; title: string; active: boolean; serviceIds: string[] };
  services: { id: string; serviceName: string }[];
  onToggleActive: () => void;
  onUpdateServices: (ids: string[]) => void;
  onUpdateName: (name: string, title: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(member.name);
  const [editTitle, setEditTitle] = useState(member.title);
  const [editServiceIds, setEditServiceIds] = useState<string[]>(member.serviceIds ?? []);

  return (
    <div style={{
      border: "1px solid var(--color-accent)", borderRadius: "8px",
      padding: "1rem", background: "var(--color-background)",
      opacity: member.active ? 1 : 0.6,
    }}>
      {!isEditing ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%",
                background: "var(--color-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", fontWeight: 700, color: "var(--color-background)",
                flexShrink: 0,
              }}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "14px" }}>
                  {member.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {member.title}
                </div>
              </div>
            </div>

            {/* Bağlı hizmetler */}
            {services.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "0.5rem" }}>
                {member.serviceIds?.length > 0 ? (
                  member.serviceIds.map(sid => {
                    const svc = services.find(s => s.id === sid);
                    return svc ? (
                      <span key={sid} style={{
                        fontSize: "11px", padding: "2px 8px", borderRadius: "999px",
                        border: "1px solid var(--color-accent)", color: "var(--color-text-muted)",
                      }}>
                        {svc.serviceName}
                      </span>
                    ) : null;
                  })
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                    Alle Leistungen
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Aksiyonlar */}
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            <span style={{
              fontSize: "11px", padding: "2px 8px", borderRadius: "999px",
              border: member.active
                ? "1px solid var(--color-primary)"
                : "1px solid var(--color-text-muted)",
              color: member.active ? "var(--color-primary)" : "var(--color-text-muted)",
            }}>
              {member.active ? "Aktiv" : "Inaktiv"}
            </span>
            <button type="button" onClick={() => setIsEditing(true)} style={secondaryButtonStyle}>
              Bearbeiten
            </button>
            <button type="button" onClick={onToggleActive} style={secondaryButtonStyle}>
              {member.active ? "Deaktivieren" : "Aktivieren"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              style={{
                ...secondaryButtonStyle,
                borderColor: "var(--color-text-muted)",
                color: "var(--color-text-muted)",
              }}
            >
              Löschen
            </button>
          </div>
        </div>
      ) : (
        // Edit mode
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Titel</label>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
          </div>

          {services.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>Leistungen</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {services.map(svc => (
                  <label key={svc.id} style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    fontSize: "13px", color: "var(--color-text)", cursor: "pointer",
                  }}>
                    <input
                      type="checkbox"
                      checked={editServiceIds.includes(svc.id)}
                      onChange={e => {
                        setEditServiceIds(prev =>
                          e.target.checked
                            ? [...prev, svc.id]
                            : prev.filter(id => id !== svc.id)
                        );
                      }}
                    />
                    {svc.serviceName}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => {
                onUpdateName(editName, editTitle);
                onUpdateServices(editServiceIds);
                setIsEditing(false);
              }}
              style={{
                background: "var(--color-primary)", color: "var(--color-background)",
                border: "none", padding: "8px 16px", borderRadius: "6px",
                fontSize: "13px", cursor: "pointer",
              }}
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setEditName(member.name);
                setEditTitle(member.title);
                setEditServiceIds(member.serviceIds ?? []);
                setIsEditing(false);
              }}
              style={secondaryButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared Styles ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--color-accent)",
  borderRadius: "4px",
  padding: "6px 8px",
  fontSize: "13px",
  color: "var(--color-text)",
  background: "var(--color-background)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-text-muted)",
  display: "block",
  marginBottom: "4px",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "var(--color-background)",
  color: "var(--color-text)",
  border: "1px solid var(--color-accent)",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  cursor: "pointer",
  minHeight: "32px",
};
```

---

## Dosya 5 — `apps/web/components/BookingForm.tsx` (MODİFİYE)

**Önce oku:** `cat apps/web/components/BookingForm.tsx`

**Tek değişiklik:** Staff fetch sonrası `staffList`'i seçili servise göre filtrele.

Mevcut `setStaffList(data.staff ?? [])` satırını bul. Bunun hemen altına:

```typescript
// Tüm staff'ı sakla — filtreleme için
setStaffList(data.staff ?? []);
```

Staff dropdown'ı render eden JSX'te, seçili `serviceId`'ye göre filtrele:

```typescript
// Mevcut staffList render'ının BAŞINA ekle:
const filteredStaff = staffList.filter(s => {
  // serviceIds boşsa veya hiç eşleşme yoksa tüm staff göster (fallback)
  if (!s.serviceIds || s.serviceIds.length === 0) return true;
  const currentServiceId = watch("serviceId"); // react-hook-form
  if (!currentServiceId) return true;
  return s.serviceIds.includes(currentServiceId);
});

// Dropdown'da staffList yerine filteredStaff kullan:
// {filteredStaff.map((s) => (
//   <option key={s.id} value={s.id}>{s.name} — {s.title}</option>
// ))}
```

**ÖNEMLİ:** `watch("serviceId")` react-hook-form'dan geliyor. Eğer form
`useForm` kullanıyorsa bu zaten mevcut. `watch` yoksa `getValues("serviceId")`
ile al. Formu okuduktan sonra doğru pattern'i uygula.

**Korunan değişmezler:**
- Submit payload değişmez — `notes: "Mitarbeiter-Wunsch: [name]"` pattern'i aynı
- `/api/lead` contract değişmez
- `serviceIds` field'ı müşteriye gösterilmez — sadece filtreleme için kullanılır
- Hiç eşleşme yoksa fallback: tüm staff gösterilir (form hiçbir zaman blank kalmaz)

---

## Dosya 6 — `apps/web/__tests__/staff-crud.test.ts`

```typescript
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
  it("returns 401 without auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);
    const res = await GET(new Request("http://localhost/api/admin/staff") as any);
    expect(res.status).toBe(401);
  });

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
```

**8 test — tümü gerçek assertion.**

---

## Acceptance Criteria

- [ ] `GET /api/admin/staff` → DB-first, `staff.json` fallback çalışıyor
- [ ] `GET /api/public/staff` → DB-first, `active` field gizli, `serviceIds` dahil
- [ ] `POST /api/admin/staff` → yeni üye eklendi, UUID üretildi
- [ ] `POST /api/admin/staff` → name eksik → 400
- [ ] `PATCH /api/admin/staff` → name/title/serviceIds güncellendi
- [ ] `PATCH /api/admin/staff` → unknown id → 404
- [ ] `DELETE /api/admin/staff?id=` → üye silindi
- [ ] `DELETE /api/admin/staff` (id yok) → 400
- [ ] `/admin/staff` → kartlar ve "Bearbeiten" butonu görünüyor
- [ ] Edit modunda name/title/hizmetler düzenlenebiliyor
- [ ] Yeni staff ekle formu çalışıyor
- [ ] Aktif/pasif toggle çalışıyor
- [ ] Silme confirm dialog ile çalışıyor
- [ ] BookingForm: servis seçilince staff filtresi çalışıyor
- [ ] BookingForm: eşleşme yoksa tüm staff fallback olarak gösteriliyor
- [ ] Submit payload değişmedi — `notes: "Mitarbeiter-Wunsch: [name]"` korunuyor
- [ ] CSS vars only — hex renk yok
- [ ] `pnpm typecheck` → 0 hata
- [ ] `pnpm test` → **306/306** (298 + 8)
- [ ] `pnpm --filter @beauty/web build` → temiz
- [ ] `/api/lead` dokunulmadı
- [ ] `packages/**` dokunulmadı

---

## CLAUDE.md Güncellemesi

```
| V2-13 | Staff CRUD + Hizmet Bağlantısı | ✅ DONE | 306/306 |
```

```markdown
### V2-13: Staff CRUD + Hizmet Bağlantısı — COMPLETED
- feat: GET/POST/PATCH/DELETE /api/admin/staff — tam CRUD, configSnapshot'a yazar
- feat: GET /api/public/staff — DB-first, staff.json fallback, serviceIds dahil
- feat: /admin/staff → StaffManagementView client component
  ekle/düzenle/sil/aktif-pasif toggle, hizmet bağlantısı checkbox
- feat: BookingForm servis bazlı staff filtresi (serviceIds boşsa tüm staff)
- feat: Staff id: crypto.randomUUID() ile üretilir
- test: 306/306 (+8 yeni — GET/POST/PATCH/DELETE coverage)
- configSnapshot.staff pattern (V2-12'den) kullanıldı
- /api/lead contract değişmedi, submit payload değişmedi
- packages değişikliği YOK
```

---

## GIT

```bash
git add \
  apps/web/app/api/public/staff/route.ts \
  apps/web/app/api/admin/staff/route.ts \
  apps/web/app/admin/staff/page.tsx \
  apps/web/app/admin/staff/StaffManagementView.tsx \
  apps/web/components/BookingForm.tsx \
  apps/web/__tests__/staff-crud.test.ts
git commit -m "feat(v2-13): staff CRUD + service binding, DB-first reads, booking form filter (306/306)"
git push

git add CLAUDE.md
git commit -m "docs: log V2-13 completion in CLAUDE.md"
git push
git log --oneline -5
```

---

## CLAUDE CODE BAŞLATMA KOMUTU

```
claude
```

Session açılınca yapıştır:

```
Read sprint-v2-13-staff-crud.md from the project root.

Before writing any code, complete mandatory pre-read and confirm:
1. clients is exported from @beauty-booking/db
2. configSnapshot field exists on clients table
3. Current /api/admin/staff and /api/public/staff route signatures
4. BookingForm.tsx current staffList render and watch("serviceId") usage

Then implement all 6 steps in order. Run pnpm typecheck after each file.

STRICT RULES:
- /api/lead untouched
- packages/** untouched
- Submit payload unchanged — notes: "Mitarbeiter-Wunsch: [name]" pattern preserved
- BookingForm filter: if no match, show all staff (never blank dropdown)
- No hex colors — CSS vars only
- crypto.randomUUID() for new staff IDs

Do not commit until pnpm test shows 306/306.
```
