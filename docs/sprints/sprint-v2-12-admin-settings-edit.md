# Sprint V2-12: Admin Settings Edit

**Backend status:** `packages/**` FROZEN. `apps/web/**` + `clients/` only.
**DB schema:** NO new tables, NO migrations. Uses existing `clients.configSnapshot` JSONB field.
**Test baseline:** 290/290 (V2-11 complete)
**Hedef:** 298/298 (+8 yeni test)

---

## Sprint Scope

### Bu sprint yapacaklar
- Hizmet fiyatları edit (DB — `services.priceEur`, `services.active`, `services.serviceName`)
- Personel edit (DB — `clients.configSnapshot.staff` array)
- Özel kapalı günler (DB — `clients.configSnapshot.closedDates` array)
- İş saatleri edit (DB — `clients.configSnapshot.operatingHours`)
- Booking rules edit (DB — `clients.configSnapshot.bookingRules`)
- `/admin/settings` sayfasını read-only'den edit UI'a dönüştür
- `slots/route.ts`'i DB-first okuyacak şekilde güncelle

### Bu sprint yapmayacaklar
- Yeni DB tablosu yok
- `packages/**` değişikliği yok
- Hizmet ekleme/silme yok (sadece mevcut hizmetleri edit)
- Personel ekleme/silme yok (sadece mevcut personeli edit)
- Booking form, lead flow, agent sistemi değişmez
- `/api/lead` dokunulmaz

---

## Mimari Karar: ConfigSnapshot Pattern

`client.config.json` dosyası Vercel'de read-only filesystem'de yaşar — production'da
yazılamaz. Bu yüzden tüm edit edilebilir config `clients.configSnapshot` JSONB
field'ına taşınır.

**Okuma önceliği (slots/route.ts ve diğerleri):**
```
1. clients.configSnapshot.[field] → DB'de varsa bunu kullan
2. loadClientConfig().[field]     → yoksa config dosyasına fallback
```

Bu sayede:
- Mevcut sistemler bozulmaz (config dosyası hâlâ fallback)
- Production'da DB üzerinden edit edilebilir
- Migration gerekmez — `configSnapshot` zaten `jsonb nullable`

---

## Mandatory Pre-Read

```bash
# 1. clients tablosu — configSnapshot field'ı var mı, tipi ne?
grep -A20 "clients = pgTable" packages/db/src/schema.ts

# 2. Mevcut configSnapshot değeri — demo client'ta dolu mu boş mu?
# (Supabase'den kontrol et veya API üzerinden)
curl -s http://localhost:3030/api/config/demo-salon | head -c 500

# 3. slots/route.ts — operatingHours okuma noktasını bul
cat apps/web/app/api/booking/slots/route.ts | grep -n "loadClientConfig\|operatingHours\|configSnapshot"

# 4. load-client-config.ts — tam imza ve ClientConfig type
cat apps/web/lib/load-client-config.ts

# 5. Mevcut admin/settings page
cat apps/web/app/admin/settings/page.tsx

# 6. services tablosundan mevcut kayıtlar — hangi field'lar var
# SELECT id, service_name, price_eur, active FROM services WHERE client_id = '...'
# (Supabase table editor'dan kontrol et)

# 7. clients tablosunda configSnapshot mevcut durumu
# SELECT id, slug, config_snapshot FROM clients LIMIT 1;
# (Supabase table editor'dan kontrol et)

# 8. Mevcut RebookingView.tsx — client component pattern referans
cat apps/web/app/admin/rebooking/RebookingView.tsx | head -60
```

> **STOP kuralları:**
> - `configSnapshot` field tipi `jsonb` değilse — dur, rapor et
> - `services` tablosunda kayıt yoksa — önce seed çalıştır
> - `clients` tablosunda demo salon kaydı yoksa — dur, rapor et

---

## Implementation Plan

| Adım | Dosya | Durum | Açıklama |
|---|---|---|---|
| 1 | `apps/web/app/api/admin/services/route.ts` | YENİ | GET list + PATCH bulk |
| 2 | `apps/web/app/api/admin/services/[id]/route.ts` | YENİ | PATCH single service |
| 3 | `apps/web/app/api/admin/config/route.ts` | YENİ | GET + PATCH configSnapshot |
| 4 | `apps/web/app/api/booking/slots/route.ts` | MODİFİYE | DB-first operatingHours okuma |
| 5 | `apps/web/app/admin/settings/page.tsx` | MODİFİYE | Server shell → SettingsView'e geç |
| 6 | `apps/web/app/admin/settings/SettingsView.tsx` | YENİ | Client component — tüm edit UI |
| 7 | `apps/web/__tests__/settings-api.test.ts` | YENİ | 8 test |

---

## Dosya 1 — `apps/web/app/api/admin/services/route.ts`

```typescript
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, services } from "@beauty-booking/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

// GET /api/admin/services — tüm hizmetleri listele
export async function GET(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("GET", "/api/admin/services", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const result = await db
      .select({
        id: services.id,
        serviceName: services.serviceName,
        category: services.category,
        durationMinutes: services.durationMinutes,
        priceEur: services.priceEur,
        description: services.description,
        active: services.active,
        sortOrder: services.sortOrder,
      })
      .from(services)
      .where(eq(services.clientId, CLIENT_ID))
      .orderBy(services.sortOrder);

    logRequest("GET", "/api/admin/services", 200, Date.now() - start);
    return NextResponse.json({ success: true, services: result });
  } catch (err) {
    logError("/api/admin/services", err);
    logRequest("GET", "/api/admin/services", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Dosya 2 — `apps/web/app/api/admin/services/[id]/route.ts`

```typescript
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, services } from "@beauty-booking/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

// Sadece güvenli field'lar edit edilebilir
// durationMinutes ve category DIŞARIDA — slot hesaplamalarını etkiler
const ServicePatchSchema = z.object({
  serviceName: z.string().min(2).max(100).optional(),
  priceEur: z.number().int().min(0).max(99999).nullable().optional(),
  active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("PATCH", "/api/admin/services/[id]", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ServicePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Boş patch — hiçbir şey değişmemiş
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const db = getDb();

    // clientId kontrolü — başka salon'un service'ini edit etmeyi engelle
    const existing = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, id), eq(services.clientId, CLIENT_ID)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const updated = await db
      .update(services)
      .set(parsed.data)
      .where(and(eq(services.id, id), eq(services.clientId, CLIENT_ID)))
      .returning();

    logRequest("PATCH", "/api/admin/services/[id]", 200, Date.now() - start);
    return NextResponse.json({ success: true, service: updated[0] });
  } catch (err) {
    logError("/api/admin/services/[id]", err);
    logRequest("PATCH", "/api/admin/services/[id]", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Dosya 3 — `apps/web/app/api/admin/config/route.ts`

ConfigSnapshot üzerinden tüm salon config'ini oku ve güncelle.

```typescript
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, clients } from "@beauty-booking/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { loadClientConfig } from "@/lib/load-client-config";
import { logRequest, logError } from "@/lib/logger";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

// Staff member schema
const StaffMemberSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  active: z.boolean(),
});

// Operating hours schema — null = kapalı gün
const DayHoursSchema = z
  .object({ open: z.string().regex(/^\d{4}$/), close: z.string().regex(/^\d{4}$/) })
  .nullable();

const OperatingHoursSchema = z.object({
  monday: DayHoursSchema,
  tuesday: DayHoursSchema,
  wednesday: DayHoursSchema,
  thursday: DayHoursSchema,
  friday: DayHoursSchema,
  saturday: DayHoursSchema,
  sunday: DayHoursSchema,
});

// Booking rules schema
const BookingRulesSchema = z.object({
  minAdvanceBookingHours: z.number().int().min(0).max(168).optional(),
  cancellationPolicyHours: z.number().int().min(0).max(168).optional(),
  maxFollowUpAttempts: z.number().int().min(0).max(10).optional(),
  recoveryWaitHours: z.number().int().min(0).max(720).optional(),
});

// Top-level patch schema — tüm field'lar optional
const ConfigPatchSchema = z.object({
  staff: z.array(StaffMemberSchema).optional(),
  operatingHours: OperatingHoursSchema.optional(),
  bookingRules: BookingRulesSchema.optional(),
  closedDates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
});

// GET — mevcut config'i döndür (DB + file fallback merge)
export async function GET(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("GET", "/api/admin/config", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const clientRow = await db
      .select({ configSnapshot: clients.configSnapshot })
      .from(clients)
      .where(eq(clients.id, CLIENT_ID))
      .limit(1);

    // Config dosyasından fallback değerleri al
    let fileConfig: Record<string, unknown> = {};
    try {
      fileConfig = loadClientConfig() as unknown as Record<string, unknown>;
    } catch {
      // config dosyası yoksa boş
    }

    const snapshot = (clientRow[0]?.configSnapshot as Record<string, unknown>) ?? {};

    // Merge: DB değerleri override, yoksa file'dan al
    const merged = {
      staff: snapshot.staff ?? fileConfig.staff ?? [],
      operatingHours: snapshot.operatingHours ?? fileConfig.operatingHours ?? {},
      bookingRules: snapshot.bookingRules ?? fileConfig.bookingRules ?? {},
      closedDates: (snapshot.closedDates as string[]) ?? [],
    };

    logRequest("GET", "/api/admin/config", 200, Date.now() - start);
    return NextResponse.json({ success: true, config: merged });
  } catch (err) {
    logError("/api/admin/config", err);
    logRequest("GET", "/api/admin/config", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — configSnapshot'ı güncelle (deep merge)
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  if (!isAdminApiAuthenticated(request)) {
    logRequest("PATCH", "/api/admin/config", 401, Date.now() - start);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ConfigPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const db = getDb();

    // Mevcut snapshot'ı çek
    const clientRow = await db
      .select({ configSnapshot: clients.configSnapshot })
      .from(clients)
      .where(eq(clients.id, CLIENT_ID))
      .limit(1);

    if (clientRow.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const current = (clientRow[0].configSnapshot as Record<string, unknown>) ?? {};

    // Deep merge — sadece gönderilen field'ları güncelle
    const updated = {
      ...current,
      ...parsed.data,
    };

    await db
      .update(clients)
      .set({ configSnapshot: updated })
      .where(eq(clients.id, CLIENT_ID));

    logRequest("PATCH", "/api/admin/config", 200, Date.now() - start);
    return NextResponse.json({ success: true, config: updated });
  } catch (err) {
    logError("/api/admin/config", err);
    logRequest("PATCH", "/api/admin/config", 500, Date.now() - start);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Dosya 4 — `apps/web/app/api/booking/slots/route.ts` (MODİFİYE)

**Önce oku:** `cat apps/web/app/api/booking/slots/route.ts`

**Tek değişiklik:** `operatingHours` ve `closedDates` okuma noktasında DB-first pattern ekle.

Mevcut `loadClientConfig()` çağrısının hemen öncesine veya yerine:

```typescript
// DB-first config okuma
let dbConfig: Record<string, unknown> = {};
try {
  const db = getDb();
  const clientRow = await db
    .select({ configSnapshot: clients.configSnapshot })
    .from(clients)
    .where(eq(clients.clientId ?? clients.id, CLIENT_ID)) // schema'ya göre doğrula
    .limit(1);
  dbConfig = (clientRow[0]?.configSnapshot as Record<string, unknown>) ?? {};
} catch {
  // DB okuma başarısız → file fallback devam eder
}

// operatingHours: DB → file fallback
const operatingHours =
  (dbConfig.operatingHours as Record<string, unknown> | undefined) ??
  cfg.operatingHours;

// closedDates: DB → boş array fallback
const closedDates = (dbConfig.closedDates as string[]) ?? [];

// Kapalı gün kontrolü — tarih closedDates'te varsa isDayClosed: true
if (closedDates.includes(date)) {
  isDayClosed = true;
}
```

> **ÖNEMLİ:** `clients` tablosunu import et — `getDb, bookings, services, clients`
> Pre-read'de `clients` export edilip edilmediğini kontrol et.

---

## Dosya 5 — `apps/web/app/admin/settings/page.tsx` (MODİFİYE)

Mevcut server component içeriğini `SettingsView` client component'e taşı.

```typescript
export const dynamic = "force-dynamic";
import SettingsView from "./SettingsView";

export default function SettingsPage(): JSX.Element {
  return <SettingsView />;
}
```

---

## Dosya 6 — `apps/web/app/admin/settings/SettingsView.tsx` (YENİ)

Client component — 5 section, her biri kendi save butonu ile.

```typescript
"use client";

import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface ServiceRow {
  id: string;
  serviceName: string;
  category: string;
  durationMinutes: number;
  priceEur: number | null;
  active: boolean;
  description: string | null;
  sortOrder: number;
}

interface StaffMember {
  id: string;
  name: string;
  title: string;
  active: boolean;
}

interface DayHours {
  open: string;
  close: string;
}

interface OperatingHours {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

interface BookingRules {
  minAdvanceBookingHours: number;
  cancellationPolicyHours: number;
  maxFollowUpAttempts: number;
  recoveryWaitHours: number;
}

interface AdminConfig {
  staff: StaffMember[];
  operatingHours: OperatingHours;
  bookingRules: BookingRules;
  closedDates: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Montag", tuesday: "Dienstag", wednesday: "Mittwoch",
  thursday: "Donnerstag", friday: "Freitag", saturday: "Samstag", sunday: "Sonntag",
};
const WEEKDAY_ORDER = [
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
] as const;

function formatPrice(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(2);
}

function parsePrice(value: string): number | null {
  const num = parseFloat(value.replace(",", "."));
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SettingsView(): JSX.Element {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Section-level saving state
  const [savingService, setSavingService] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Local edit state — mirrors config, edited independently
  const [editedConfig, setEditedConfig] = useState<AdminConfig | null>(null);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [svcRes, cfgRes] = await Promise.all([
        fetch("/api/admin/services"),
        fetch("/api/admin/config"),
      ]);
      if (!svcRes.ok || !cfgRes.ok) throw new Error("Load failed");
      const svcData = await svcRes.json();
      const cfgData = await cfgRes.json();
      setServices(svcData.services ?? []);
      setConfig(cfgData.config);
      setEditedConfig(cfgData.config);
    } catch {
      setError("Ayarlar yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // ── Service Price/Active Edit ──────────────────────────────────────────

  async function handleServiceSave(service: ServiceRow, newPrice: string, newActive: boolean) {
    setSavingService(service.id);
    setSaveMessage(null);
    try {
      const priceEur = parsePrice(newPrice);
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceEur, active: newActive }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMessage("Gespeichert ✓");
      await loadAll();
    } catch {
      setSaveMessage("Speichern fehlgeschlagen.");
    } finally {
      setSavingService(null);
    }
  }

  // ── Config Section Save ────────────────────────────────────────────────

  async function handleConfigSave(section: keyof AdminConfig) {
    if (!editedConfig) return;
    setSavingConfig(section);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [section]: editedConfig[section] }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMessage("Gespeichert ✓");
      await loadAll();
    } catch {
      setSaveMessage("Speichern fehlgeschlagen.");
    } finally {
      setSavingConfig(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (isLoading) return (
    <p style={{ padding: "2rem", color: "var(--color-text-muted)" }}>Lädt...</p>
  );
  if (error) return (
    <p style={{ padding: "2rem", color: "var(--color-text-muted)" }}>⚠ {error}</p>
  );
  if (!editedConfig) return <></>;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px" }}>
      <h1 style={{ color: "var(--color-text)", fontSize: "1.5rem", fontWeight: 600, marginBottom: "2rem" }}>
        Einstellungen
      </h1>

      {saveMessage && (
        <div style={{
          marginBottom: "1rem", padding: "8px 12px",
          border: "1px solid var(--color-primary)", borderRadius: "6px",
          fontSize: "13px", color: "var(--color-primary)",
        }}>
          {saveMessage}
        </div>
      )}

      {/* ── Section 1: Hizmetler ── */}
      <Section title="Leistungen">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-secondary)" }}>
              {["Leistung", "Kategorie", "Dauer", "Preis (€)", "Aktiv", ""].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px",
                  fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {services.map(svc => (
              <ServiceRow
                key={svc.id}
                service={svc}
                onSave={handleServiceSave}
                isSaving={savingService === svc.id}
              />
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── Section 2: Personel ── */}
      <Section title="Team">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {(editedConfig.staff ?? []).map((member, idx) => (
            <div key={member.id} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr auto auto",
              gap: "0.5rem", alignItems: "center",
              padding: "10px", border: "1px solid var(--color-accent)", borderRadius: "6px",
            }}>
              <input
                value={member.name}
                onChange={e => {
                  const next = [...editedConfig.staff];
                  next[idx] = { ...next[idx], name: e.target.value };
                  setEditedConfig({ ...editedConfig, staff: next });
                }}
                style={inputStyle}
                placeholder="Name"
              />
              <input
                value={member.title}
                onChange={e => {
                  const next = [...editedConfig.staff];
                  next[idx] = { ...next[idx], title: e.target.value };
                  setEditedConfig({ ...editedConfig, staff: next });
                }}
                style={inputStyle}
                placeholder="Titel"
              />
              <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
                <input
                  type="checkbox"
                  checked={member.active}
                  onChange={e => {
                    const next = [...editedConfig.staff];
                    next[idx] = { ...next[idx], active: e.target.checked };
                    setEditedConfig({ ...editedConfig, staff: next });
                  }}
                />
                Aktiv
              </label>
            </div>
          ))}
        </div>
        <SaveButton
          onClick={() => handleConfigSave("staff")}
          isSaving={savingConfig === "staff"}
        />
      </Section>

      {/* ── Section 3: Öffnungszeiten ── */}
      <Section title="Öffnungszeiten">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-secondary)" }}>
              {["Tag", "Öffnung", "Schließung", "Geöffnet"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px",
                  fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAY_ORDER.map(day => {
              const hours = editedConfig.operatingHours[day];
              const isOpen = hours !== null;
              return (
                <tr key={day} style={{ borderBottom: "1px solid var(--color-accent)" }}>
                  <td style={{ padding: "10px", fontSize: "14px", color: "var(--color-text)" }}>
                    {WEEKDAY_LABELS[day]}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="time"
                      value={hours?.open ? `${hours.open.slice(0,2)}:${hours.open.slice(2)}` : ""}
                      disabled={!isOpen}
                      onChange={e => {
                        const val = e.target.value.replace(":", "");
                        setEditedConfig({
                          ...editedConfig,
                          operatingHours: {
                            ...editedConfig.operatingHours,
                            [day]: { open: val, close: hours?.close ?? "1800" },
                          },
                        });
                      }}
                      style={{ ...inputStyle, width: "100px" }}
                    />
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="time"
                      value={hours?.close ? `${hours.close.slice(0,2)}:${hours.close.slice(2)}` : ""}
                      disabled={!isOpen}
                      onChange={e => {
                        const val = e.target.value.replace(":", "");
                        setEditedConfig({
                          ...editedConfig,
                          operatingHours: {
                            ...editedConfig.operatingHours,
                            [day]: { open: hours?.open ?? "0900", close: val },
                          },
                        });
                      }}
                      style={{ ...inputStyle, width: "100px" }}
                    />
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="checkbox"
                      checked={isOpen}
                      onChange={e => {
                        setEditedConfig({
                          ...editedConfig,
                          operatingHours: {
                            ...editedConfig.operatingHours,
                            [day]: e.target.checked
                              ? { open: "0900", close: "1800" }
                              : null,
                          },
                        });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <SaveButton
          onClick={() => handleConfigSave("operatingHours")}
          isSaving={savingConfig === "operatingHours"}
        />
      </Section>

      {/* ── Section 4: Özel Kapalı Günler ── */}
      <Section title="Geschlossene Tage">
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
          Feiertage oder Betriebsurlaub — diese Tage sind für Buchungen gesperrt.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          {editedConfig.closedDates.map(date => (
            <span key={date} style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "4px 10px", borderRadius: "999px",
              border: "1px solid var(--color-secondary)",
              fontSize: "13px", color: "var(--color-text)",
            }}>
              {date}
              <button
                type="button"
                onClick={() => setEditedConfig({
                  ...editedConfig,
                  closedDates: editedConfig.closedDates.filter(d => d !== date),
                })}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: "var(--color-text-muted)", fontSize: "14px", lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="date"
            id="new-closed-date"
            style={{ ...inputStyle, width: "160px" }}
          />
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById("new-closed-date") as HTMLInputElement;
              const val = input?.value;
              if (!val || editedConfig.closedDates.includes(val)) return;
              setEditedConfig({
                ...editedConfig,
                closedDates: [...editedConfig.closedDates, val].sort(),
              });
              input.value = "";
            }}
            style={secondaryButtonStyle}
          >
            + Hinzufügen
          </button>
        </div>
        <SaveButton
          onClick={() => handleConfigSave("closedDates")}
          isSaving={savingConfig === "closedDates"}
        />
      </Section>

      {/* ── Section 5: Buchungsregeln ── */}
      <Section title="Buchungsregeln">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {(Object.entries({
            minAdvanceBookingHours: "Mindestvorlaufzeit (Std.)",
            cancellationPolicyHours: "Stornierungsfrist (Std.)",
            maxFollowUpAttempts: "Max. Nachfassversuche",
            recoveryWaitHours: "Wartezeit Rückgewinnung (Std.)",
          }) as [keyof BookingRules, string][]).map(([key, label]) => (
            <div key={key}>
              <label style={{ fontSize: "12px", color: "var(--color-text-muted)",
                display: "block", marginBottom: "4px" }}>
                {label}
              </label>
              <input
                type="number"
                min={0}
                value={editedConfig.bookingRules[key] ?? ""}
                onChange={e => setEditedConfig({
                  ...editedConfig,
                  bookingRules: {
                    ...editedConfig.bookingRules,
                    [key]: parseInt(e.target.value, 10),
                  },
                })}
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
          ))}
        </div>
        <SaveButton
          onClick={() => handleConfigSave("bookingRules")}
          isSaving={savingConfig === "bookingRules"}
        />
      </Section>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <h2 style={{ color: "var(--color-text)", fontSize: "1rem", fontWeight: 600,
        marginBottom: "1rem", paddingBottom: "0.5rem",
        borderBottom: "1px solid var(--color-accent)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ServiceRow({ service, onSave, isSaving }: {
  service: ServiceRow;
  onSave: (s: ServiceRow, price: string, active: boolean) => void;
  isSaving: boolean;
}) {
  const [price, setPrice] = useState(formatPrice(service.priceEur));
  const [active, setActive] = useState(service.active);

  return (
    <tr style={{ borderBottom: "1px solid var(--color-accent)" }}>
      <td style={{ padding: "10px", fontSize: "14px", color: "var(--color-text)" }}>
        {service.serviceName}
      </td>
      <td style={{ padding: "10px", fontSize: "13px", color: "var(--color-text-muted)" }}>
        {service.category}
      </td>
      <td style={{ padding: "10px", fontSize: "13px", color: "var(--color-text-muted)" }}>
        {service.durationMinutes} Min.
      </td>
      <td style={{ padding: "10px" }}>
        <input
          type="text"
          value={price}
          onChange={e => setPrice(e.target.value)}
          style={{ ...inputStyle, width: "80px" }}
          placeholder="0.00"
        />
      </td>
      <td style={{ padding: "10px" }}>
        <input
          type="checkbox"
          checked={active}
          onChange={e => setActive(e.target.checked)}
        />
      </td>
      <td style={{ padding: "10px" }}>
        <button
          type="button"
          onClick={() => onSave(service, price, active)}
          disabled={isSaving}
          style={{ ...secondaryButtonStyle, opacity: isSaving ? 0.6 : 1 }}
        >
          {isSaving ? "..." : "Speichern"}
        </button>
      </td>
    </tr>
  );
}

function SaveButton({ onClick, isSaving }: { onClick: () => void; isSaving: boolean }) {
  return (
    <div style={{ marginTop: "1rem" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={isSaving}
        style={{
          background: "var(--color-primary)",
          color: "var(--color-background)",
          border: "none",
          padding: "8px 20px",
          borderRadius: "6px",
          fontSize: "13px",
          cursor: isSaving ? "not-allowed" : "pointer",
          opacity: isSaving ? 0.6 : 1,
          minHeight: "36px",
        }}
      >
        {isSaving ? "Wird gespeichert..." : "Speichern"}
      </button>
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

const secondaryButtonStyle: React.CSSProperties = {
  background: "var(--color-background)",
  color: "var(--color-text)",
  border: "1px solid var(--color-accent)",
  padding: "6px 14px",
  borderRadius: "6px",
  fontSize: "13px",
  cursor: "pointer",
  minHeight: "32px",
};
```

---

## Dosya 7 — `apps/web/__tests__/settings-api.test.ts`

```typescript
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
  vi.mocked(loadClientConfig).mockReturnValue({} as any);
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
      new Request("http://localhost/api/admin/services/s-1", { method: "PATCH",
        body: JSON.stringify({ priceEur: 5000 }), headers: { "Content-Type": "application/json" } }) as any,
      { params: Promise.resolve({ id: "s-1" }) } as any
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid priceEur", async () => {
    const res = await PATCH_SERVICE(
      new Request("http://localhost/api/admin/services/s-1", { method: "PATCH",
        body: JSON.stringify({ priceEur: -100 }), headers: { "Content-Type": "application/json" } }) as any,
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
      new Request("http://localhost/api/admin/services/s-1", { method: "PATCH",
        body: JSON.stringify({ priceEur: 5000, active: false }),
        headers: { "Content-Type": "application/json" } }) as any,
      { params: Promise.resolve({ id: "s-1" }) } as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.service.priceEur).toBe(5000);
  });
});

describe("GET /api/admin/config", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);
    const res = await GET_CONFIG(new Request("http://localhost/api/admin/config") as any);
    expect(res.status).toBe(401);
  });

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
      new Request("http://localhost/api/admin/config", { method: "PATCH",
        body: JSON.stringify({ closedDates: ["not-a-date"] }),
        headers: { "Content-Type": "application/json" } }) as any
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
      new Request("http://localhost/api/admin/config", { method: "PATCH",
        body: JSON.stringify({ closedDates: ["2026-04-24"] }),
        headers: { "Content-Type": "application/json" } }) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.config.closedDates).toContain("2026-04-24");
  });
});
```

**8 test — tümü gerçek assertion.**

---

## Supabase'de Yapılacaklar (Manuel — Sprint Başlamadan)

```sql
-- Demo client'ın configSnapshot'ını initialize et
-- (Eğer NULL ise boş object yaz)
UPDATE clients
SET config_snapshot = '{}'::jsonb
WHERE config_snapshot IS NULL;
```

Bunu sprint başlamadan Supabase SQL editor'da çalıştır, sonra Claude Code'a "configSnapshot initialized" de.

---

## Acceptance Criteria

- [ ] `GET /api/admin/services` → auth yok → 401
- [ ] `GET /api/admin/services` → auth var → hizmet listesi döner
- [ ] `PATCH /api/admin/services/[id]` → `priceEur` güncellendi
- [ ] `PATCH /api/admin/services/[id]` → `active: false` hizmeti devre dışı bırakıyor
- [ ] `PATCH /api/admin/services/[id]` → başka salon'un service'ini edit edemiyor (clientId check)
- [ ] `durationMinutes` ve `category` PATCH'te reddediliyor (schema'da yok)
- [ ] `GET /api/admin/config` → DB + file fallback merge çalışıyor
- [ ] `PATCH /api/admin/config` → `closedDates` kaydediliyor
- [ ] `PATCH /api/admin/config` → `operatingHours` kaydediliyor
- [ ] `PATCH /api/admin/config` → `staff` kaydediliyor
- [ ] `PATCH /api/admin/config` → `bookingRules` kaydediliyor
- [ ] `slots/route.ts` → `closedDates`'teki tarih → `isDayClosed: true`
- [ ] `slots/route.ts` → DB'deki `operatingHours` dosyadan önce okunuyor
- [ ] `/admin/settings` → 5 section render oluyor
- [ ] Hizmet fiyatı edit → kaydet → sayfada güncelleniyor
- [ ] Personel aktif/pasif toggle → kaydet → DB'ye yazılıyor
- [ ] Özel kapalı gün ekle → kaydet → o gün için slot 0 dönüyor
- [ ] İş saati edit → kaydet → slots API'de yansıyor
- [ ] Hiçbir edit `/api/lead`, `BookingForm`, agent sistemi'ni etkilemiyor
- [ ] CSS vars only — hex renk yok
- [ ] `pnpm typecheck` → 0 hata
- [ ] `pnpm test` → **298/298** (290 + 8)
- [ ] `pnpm --filter @beauty/web build` → temiz

---

## CLAUDE.md Güncellemesi

```
| V2-12 | Admin Settings Edit | ✅ DONE | 298/298 |
```

```markdown
### V2-12: Admin Settings Edit — COMPLETED
- feat: GET/PATCH /api/admin/services — hizmet fiyat + aktif/pasif edit (clientId guard)
- feat: PATCH /api/admin/services/[id] — durationMinutes ve category korunuyor
- feat: GET/PATCH /api/admin/config — configSnapshot üzerinden staff, operatingHours,
  bookingRules, closedDates edit
- feat: slots/route.ts DB-first operatingHours + closedDates kontrolü
- feat: /admin/settings 5-section edit UI (SettingsView client component)
- feat: Özel kapalı gün ekleme/çıkarma (YYYY-MM-DD format)
- test: 298/298 (+8 yeni)
- configSnapshot pattern: DB değerleri file config'in önüne geçer
- packages değişikliği YOK, /api/lead dokunulmadı
```

---

## GIT

```bash
git add \
  apps/web/app/api/admin/services/route.ts \
  apps/web/app/api/admin/services/\[id\]/route.ts \
  apps/web/app/api/admin/config/route.ts \
  apps/web/app/api/booking/slots/route.ts \
  apps/web/app/admin/settings/page.tsx \
  apps/web/app/admin/settings/SettingsView.tsx \
  apps/web/__tests__/settings-api.test.ts
git commit -m "feat(v2-12): admin settings edit — services, staff, hours, closed dates, booking rules (298/298)"
git push

git add CLAUDE.md
git commit -m "docs: log V2-12 completion in CLAUDE.md"
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
Read sprint-v2-12-admin-settings-edit.md from the project root.

Before writing any code, complete mandatory pre-read. Then confirm:
1. clients table has configSnapshot jsonb field
2. services table has records for this client
3. clients export available from @beauty-booking/db

Then implement all 7 steps in order. Run pnpm typecheck after each file.

IMPORTANT RULES — do not violate:
- durationMinutes and category must NOT be editable in services PATCH
- clientId check required on every services mutation
- slots/route.ts change is additive only — do not remove existing logic
- /api/lead must not be touched
- packages/** must not be touched

Do not commit until pnpm test shows 298/298.
```
