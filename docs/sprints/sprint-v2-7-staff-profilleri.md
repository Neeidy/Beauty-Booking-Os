# Sprint V2-7: Staff Profilleri (Config-Driven)

**Backend status:** `packages/**` FROZEN. `apps/web/**` only.
**DB schema:** NO changes, no migrations.
**Test baseline:** 270/270 (V2-6 complete)
**Hedef:** 274/274 (+4 yeni test)

---

## CURRENT STATE

```
clients/demo-salon/staff.json          → YOK — V2-7'de oluşturulacak
apps/web/lib/load-staff-config.ts      → YOK — V2-7'de oluşturulacak
apps/web/app/api/public/staff/route.ts → YOK
apps/web/app/api/admin/staff/route.ts  → YOK
apps/web/app/admin/staff/page.tsx      → YOK
apps/web/components/BookingForm.tsx    → MEVCUT — staff dropdown eklenecek
apps/web/components/admin/Sidebar.tsx  → MEVCUT — "Team" nav item eklenecek
```

**Risk noktaları:**
- `BookingForm.tsx`'teki `notes` field yapısı (react-hook-form mu, raw state mi?) → okumadan dokunma
- Sidebar aktif-state pattern'i → okumadan dokunma
- `/api/lead` contract DEĞİŞMEZ — staff notes'a yazılır, asla top-level field olmaz
- `getActiveStaff()` SYNC — await kullanılmayacak

---

## MANDATORY PRE-READ (bu sırayla, atlamadan)

```bash
# 1. BookingForm mevcut yapısı — notes field, submit handler, state pattern
cat apps/web/components/BookingForm.tsx

# 2. Sidebar mevcut nav item pattern ve active state
cat apps/web/components/admin/Sidebar.tsx

# 3. load-client-config imzasını referans al — load-staff-config aynı pattern'i takip edecek
cat apps/web/lib/load-client-config.ts

# 4. Mevcut test mock pattern
cat apps/web/__tests__/booking-slots-api.test.ts | head -60

# 5. Public staff path var mı kontrol
ls apps/web/app/api/public/ 2>/dev/null || echo "public/ DIR NOT FOUND"

# 6. Admin staff klasörü kontrol
ls apps/web/app/api/admin/ 2>/dev/null

# 7. staff.json yok doğrulaması
ls clients/demo-salon/
```

`public/` klasörü yoksa oluşturulacak — adım 3'te belirtildi, durmadan devam et.

---

## IMPLEMENTATION PLAN

| Adım | Dosya | Durum | Dokunulmayacak |
|---|---|---|---|
| 1 | `clients/demo-salon/staff.json` | YENİ | — |
| 2 | `apps/web/lib/load-staff-config.ts` | YENİ | `packages/**` |
| 3 | `apps/web/app/api/public/staff/route.ts` | YENİ | `/api/lead` |
| 4 | `apps/web/app/api/admin/staff/route.ts` | YENİ | DB schema |
| 5 | `apps/web/app/admin/staff/page.tsx` | YENİ | `globals.css` |
| 6 | `apps/web/components/admin/Sidebar.tsx` | MODİFİYE | mevcut item sırası |
| 7 | `apps/web/components/BookingForm.tsx` | MODİFİYE | DatePicker, SlotPicker, /api/lead |
| 8 | `apps/web/__tests__/staff-api.test.ts` | YENİ | — |

---

## DOSYA 1 — `clients/demo-salon/staff.json`

```json
{
  "staff": [
    {
      "id": "staff_1",
      "name": "Anna",
      "title": "Nageldesignerin",
      "active": true
    },
    {
      "id": "staff_2",
      "name": "Sofia",
      "title": "Kosmetikerin",
      "active": true
    },
    {
      "id": "staff_3",
      "name": "Lena",
      "title": "Wimpernstudio",
      "active": true
    }
  ]
}
```

---

## DOSYA 2 — `apps/web/lib/load-staff-config.ts`

```typescript
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
    const filePath = path.join(
      process.cwd(),
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
```

**Kurallar:**
- `readFileSync` — SYNC, await yok
- `active: false` üyeler `getActiveStaff()`'tan filtreleniyor
- `getAllStaff()` admin için tüm üyeleri döndürür
- Her hata türü `[]` döndürür — asla throw etmez
- `loadClientConfig` ile aynı slug resolution pattern'i

---

## DOSYA 3 — `apps/web/app/api/public/staff/route.ts`

```typescript
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getActiveStaff } from "@/lib/load-staff-config";
import { z } from "zod";

const PublicStaffMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
});

const PublicStaffResponseSchema = z.object({
  staff: z.array(PublicStaffMemberSchema),
});

export async function GET(): Promise<NextResponse> {
  try {
    const activeStaff = getActiveStaff();
    const publicStaff = activeStaff.map(({ id, name, title }) => ({
      id,
      name,
      title,
    }));

    const parsed = PublicStaffResponseSchema.safeParse({ staff: publicStaff });
    if (!parsed.success) {
      console.error("[/api/public/staff] Zod validation failed:", parsed.error);
      return NextResponse.json({ staff: [] });
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("[/api/public/staff] Unexpected error:", err);
    return NextResponse.json({ staff: [] });
  }
}
```

**Notlar:**
- Auth YOK — müşteri tarafı public endpoint
- `active` field dışarıda — sadece id/name/title
- Hata durumunda HTTP 200 + `{ staff: [] }` — BookingForm çökmez
- Zod validation — raw JSON.parse yok

---

## DOSYA 4 — `apps/web/app/api/admin/staff/route.ts`

```typescript
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getAllStaff } from "@/lib/load-staff-config";
import { z } from "zod";

const AdminStaffMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  active: z.boolean(),
});

const AdminStaffResponseSchema = z.object({
  staff: z.array(AdminStaffMemberSchema),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const staff = getAllStaff(); // tüm üyeler — active: false dahil

    const parsed = AdminStaffResponseSchema.safeParse({ staff });
    if (!parsed.success) {
      console.error("[/api/admin/staff] Zod validation failed:", parsed.error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("[/api/admin/staff] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Notlar:**
- İlk satır her zaman `isAdminApiAuthenticated` — kurala uygun
- `getAllStaff()` kullanılıyor — `active: false` üyeler de dahil (admin tam görünüm)
- Zod parse ile type-safe response

---

## DOSYA 5 — `apps/web/app/admin/staff/page.tsx`

```typescript
export const dynamic = "force-dynamic";

import { getActiveStaff, type StaffMember } from "@/lib/load-staff-config";

// Server Component — "use client" YOK
// getActiveStaff() asla throw etmez (kendi içinde try/catch var).
// Defensive try/catch burada da tutulur ama hiçbir zaman tetiklenmez.
export default function AdminStaffPage(): JSX.Element {
  const staff: StaffMember[] = getActiveStaff();

  return (
    <main style={{ padding: "2rem", maxWidth: "900px" }}>
      <h1
        style={{
          color: "var(--color-text)",
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: "2rem",
        }}
      >
        Team
      </h1>

      {staff.length === 0 && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          Keine aktiven Teammitglieder konfiguriert.
        </p>
      )}

      {staff.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {staff.map((member) => (
            <div
              key={member.id}
              style={{
                border: "1px solid var(--color-accent)",
                borderRadius: "10px",
                padding: "1.25rem 1.25rem 1rem",
                background: "var(--color-background)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {/* Avatar — initials */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "var(--color-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--color-background)",
                  flexShrink: 0,
                  marginBottom: "0.25rem",
                }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--color-text)",
                  fontSize: "15px",
                  lineHeight: 1.3,
                }}
              >
                {member.name}
              </div>

              {/* Title */}
              <div
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "13px",
                  lineHeight: 1.4,
                }}
              >
                {member.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
```

**Notlar:**
- Server Component — `"use client"` YOK
- `export const dynamic = "force-dynamic"` — kurala uygun
- Hex renk yok — sadece CSS vars
- `getActiveStaff()` asla throw etmez — defensive try/catch gereksiz, temiz tutuluyor

---

## DOSYA 6 — `apps/web/components/admin/Sidebar.tsx` (DEĞİŞİKLİK)

**Önce oku:** `cat apps/web/components/admin/Sidebar.tsx`

Mevcut nav item listesine, `"Einstellungen"` linkinden **SONRA** ekle. Mevcut sırayı değiştirme.

Eğer Sidebar'da **lucide-react** kullanılıyorsa:

```typescript
import { Users } from "lucide-react";

// Nav item — mevcut pattern'e birebir uy:
{ href: "/admin/staff", label: "Team", icon: <Users size={16} /> }
```

Eğer **text/emoji icon** kullanılıyorsa:

```typescript
{ href: "/admin/staff", label: "Team", icon: "👥" }
```

**KRİTİK:** Mevcut aktif-state pattern'ini (`pathname === href` veya `pathname.startsWith(href)`) birebir kopyala. Asla yeni pattern icat etme.

---

## DOSYA 7 — `apps/web/components/BookingForm.tsx` (DEĞİŞİKLİK)

**Önce oku:** `cat apps/web/components/BookingForm.tsx`

Mevcut yapıyı anladıktan sonra aşağıdaki 5 değişikliği uygula:

**Değişiklik 1 — Type tanımı (dosya başına, importların altına):**

```typescript
interface PublicStaffMember {
  id: string;
  name: string;
  title: string;
}
```

**Değişiklik 2 — State (mevcut useState'lerin yanına):**

```typescript
const [staffList, setStaffList] = useState<PublicStaffMember[]>([]);
const [staffLoadError, setStaffLoadError] = useState(false);
const [selectedStaffId, setSelectedStaffId] = useState<string>("");
```

**Değişiklik 3 — useEffect (mount'ta staff fetch):**

```typescript
useEffect(() => {
  let cancelled = false;
  fetch("/api/public/staff")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data: { staff: PublicStaffMember[] }) => {
      if (!cancelled) setStaffList(data.staff ?? []);
    })
    .catch(() => {
      if (!cancelled) setStaffLoadError(true);
    });
  return () => {
    cancelled = true;
  };
}, []);
```

**Değişiklik 4 — JSX: Staff dropdown (service dropdown'dan SONRA, notes'tan ÖNCE):**

```tsx
{/* Staff preference dropdown — only shown if staff loaded successfully */}
{!staffLoadError && staffList.length > 0 && (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label
      style={{
        fontSize: "13px",
        color: "var(--color-text-muted)",
        fontWeight: 500,
      }}
    >
      Wunsch-Mitarbeiter{" "}
      <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>
        (optional)
      </span>
    </label>
    <select
      value={selectedStaffId}
      onChange={(e) => setSelectedStaffId(e.target.value)}
      style={{
        border: "1px solid var(--color-accent)",
        borderRadius: "6px",
        padding: "10px 12px",
        fontSize: "14px",
        color: "var(--color-text)",
        background: "var(--color-background)",
        width: "100%",
        minHeight: "44px",
        cursor: "pointer",
      }}
    >
      <option value="">Keine Vorauswahl</option>
      {staffList.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} — {s.title}
        </option>
      ))}
    </select>
  </div>
)}
```

**Değişiklik 5 — Submit handler: staff preference'ı notes'a inject et:**

Submit handler'da API payload hazırlamadan ÖNCE:

```typescript
const selectedStaff = selectedStaffId
  ? staffList.find((s) => s.id === selectedStaffId)
  : null;

// notes field'ını mevcut formdan al:
// react-hook-form ise: const baseNotes = data.notes ?? "";
// raw state ise:       const baseNotes = notesState ?? "";
// → Formu okuduktan sonra hangisi olduğunu belirle, ona göre kullan.

const notesValue = selectedStaff
  ? `Mitarbeiter-Wunsch: ${selectedStaff.name}${baseNotes ? `\n${baseNotes}` : ""}`
  : baseNotes;

// Mevcut payload'da notes: notesValue kullan.
// Yeni field EKLEME — sadece mevcut notes değerini güncelle.
```

**ÖNEMLİ:** `/api/lead` contract değişmez. `notes` field'ı zaten mevcut payload'da varsa sadece değerini güncelle.

---

## DOSYA 8 — `apps/web/__tests__/staff-api.test.ts`

> **ÖNEMLİ:** Dosya yolu `apps/web/__tests__/` (çift underscore) — diğer tüm test dosyalarıyla tutarlı. `apps/web/tests/` değil.

```typescript
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
```

**4 test — no `.skip`, no `.todo`. Hepsi geçmeli.**

---

## DOSYA 9 — CLAUDE.md Güncellemesi (sprint bittikten sonra)

V2 Sprint Sequence tablosunu güncelle:

```
| V2-7 | Staff Profilleri (Config-Driven) | ✅ DONE | 274/274 |
```

Sprint completion bloğunu CLAUDE.md'ye ekle:

```markdown
### V2-7: Staff Profilleri (Config-Driven) — COMPLETED
- feat: clients/demo-salon/staff.json oluşturuldu (3 aktif üye)
- feat: apps/web/lib/load-staff-config.ts — SYNC getActiveStaff() + getAllStaff()
  getActiveStaff: active: true filtrelenmiş (public + BookingForm için)
  getAllStaff: tüm üyeler (admin için)
- feat: GET /api/public/staff — no auth, id/name/title only (active field gizlendi)
- feat: GET /api/admin/staff — auth required, full data (inactive dahil)
- feat: /admin/staff — team kartları, avatar initials, server component
- feat: BookingForm staff dropdown — fetch fail → gizlenir, form çalışmaya devam eder
- feat: Staff seçimi → notes: "Mitarbeiter-Wunsch: [name]" — /api/lead contract DOKUNULMADI
- feat: Sidebar "Team" linki /admin/staff, aktif state
- test: 274/274 (+4 yeni)
- Yapılmadı: Staff slot blocking (DB gerektirir → V2-11 veya sonrası)
- Schema değişikliği YOK, packages değişikliği YOK
```

---

## ACCEPTANCE CRITERIA

- [ ] `clients/demo-salon/staff.json` mevcut, 3 aktif üye var
- [ ] `getActiveStaff()` SYNC — await yok, try/catch, hata → `[]`
- [ ] `getAllStaff()` SYNC — await yok, try/catch, hata → `[]`
- [ ] `active: false` üyeler `getActiveStaff()`'tan filtreleniyor
- [ ] `GET /api/public/staff` — 200, `{ staff: [{ id, name, title }] }`
- [ ] `GET /api/public/staff` — `active` field response'ta YOK
- [ ] `GET /api/public/staff` — getActiveStaff() boş → 200 + `{ staff: [] }`
- [ ] `GET /api/admin/staff` — auth yok → 401
- [ ] `GET /api/admin/staff` — auth var → 200, `active` field dahil, inactive üyeler de görünür
- [ ] `/admin/staff` sayfası render oluyor — HTTP 200
- [ ] `/admin/staff` kart sayısı = aktif staff sayısı
- [ ] `/admin/staff` staff yoksa "Keine aktiven Teammitglieder..." mesajı
- [ ] Sidebar'da "Team" linki var, `/admin/staff`'e yönlendiriyor
- [ ] Sidebar aktif state çalışıyor
- [ ] BookingForm staff dropdown görünüyor (staff yüklendiyse)
- [ ] BookingForm dropdown "Keine Vorauswahl" default seçenek var
- [ ] BookingForm fetch fail → dropdown gizleniyor, form çalışmaya devam ediyor
- [ ] Staff seçilince `notes = "Mitarbeiter-Wunsch: Anna\n[user notes]"`
- [ ] Staff seçilmezse `notes = [user notes]`, önek YOK
- [ ] `/api/lead` route DOKUNULMADI
- [ ] `DatePicker.tsx` DOKUNULMADI
- [ ] `SlotPicker.tsx` DOKUNULMADI
- [ ] `packages/**` DOKUNULMADI
- [ ] Hex renk kodu yok — sadece CSS vars
- [ ] `export const dynamic = "force-dynamic"` her iki route'ta var
- [ ] `pnpm typecheck` → 0 hata
- [ ] `pnpm test` → **274/274** (270 + 4 yeni)
- [ ] `pnpm --filter @beauty/web build` → temiz

---

## VERIFICATION

```bash
# Bu sırayla çalıştır. İlk hatada dur, commit yapma.

pnpm typecheck
# Beklenen: 0 errors

pnpm test
# Beklenen: 274/274 passing
# Farklıysa: hangi testler kırıldı raporla, commit yapma

pnpm --filter @beauty/web build
# Beklenen: ✓ Compiled successfully
```

**Manuel kontroller (dev server çalışırken):**

```bash
curl http://localhost:3030/api/public/staff
# → { "staff": [{ "id": "staff_1", "name": "Anna", "title": "Nageldesignerin" }, ...] }
# → active field YOK

curl http://localhost:3030/api/admin/staff
# → 401 Unauthorized

# http://localhost:3030/admin/staff
# → Team kartları görünüyor, 3 kart (Anna, Sofia, Lena)

# http://localhost:3030/booking
# → Staff dropdown "Wunsch-Mitarbeiter" görünüyor
# → "Keine Vorauswahl" default
# → Staff seçip form gönderilince admin/leads'de notes = "Mitarbeiter-Wunsch: Anna"
```

---

## REPORT BACK

Sprint bitince şunları raporla:

1. Exact test sayısı (274 olmalı)
2. `getActiveStaff()` ve `getAllStaff()` SYNC mıydı, async sarmalama yapıldı mı?
3. `BookingForm`'da `notes` field react-hook-form ile mi, raw state ile mi yönetiliyordu?
4. Sidebar'da lucide-react mi, text icon mu vardı?
5. `public/` dizini zaten var mıydı, yoksa yeni mi oluşturuldu?
6. Her adımın commit hash'i
7. Beklenmedik durum varsa detaylı raporla

**Sprint V2-8'e geçmeden önce bu rapor onaylanacak.**

---

## GIT

```bash
# Commit 1 — implementation
git add \
  clients/demo-salon/staff.json \
  apps/web/lib/load-staff-config.ts \
  apps/web/app/api/public/staff/route.ts \
  apps/web/app/api/admin/staff/route.ts \
  apps/web/app/admin/staff/page.tsx \
  apps/web/components/admin/Sidebar.tsx \
  apps/web/components/BookingForm.tsx \
  apps/web/__tests__/staff-api.test.ts
git status
git commit -m "feat(v2-7): staff profiles config-driven, public+admin API, team page, booking dropdown, 4 tests 274/274"
git push

# Commit 2 — CLAUDE.md
git add CLAUDE.md
git commit -m "docs: log V2-7 completion in CLAUDE.md"
git push

git log --oneline -5
```
