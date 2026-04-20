# SPRINT V2-6: Business Hours Config + V2-5 Bug Fixes (Health Check)

---

## MEVCUT DURUM

```
Test sayısı       : 265/265 (V2-5 Waiting List sonrası)
packages/**       : FROZEN — hiçbir dosyaya dokunma
DB schema         : DEĞİŞİKLİK YOK, migration yok
Status enum       : no_show (underscore) — noshow değil
AI model          : "claude-sonnet-4-20250514" exact versiyon
CSS vars          : SADECE mevcut vars kullan:
                    --color-background, --color-primary, --color-secondary,
                    --color-accent, --color-text, --color-text-muted
Timezone helper   : formatToParts + Date.UTC tabanlı (toLocaleString YASAK)
Dynamic export    : export const dynamic = "force-dynamic" — her route ve dynamic page
services alanı    : services.serviceName (services.name değil — V2-4 doğrulandı)
LocalStorage      : KULLANMA
Harici kütüphane  : Takvim/datepicker kütüphanesi ekleme
/api/lead         : DOKUNMA — appointmentAt top-level değil, metadata içinde

DOĞRULANMIŞ IMPORT PATTERN:
  import { isAdminApiAuthenticated } from "@/lib/admin-auth";
  import { getDb, bookings, services, leads } from "@beauty-booking/db";
  import { eq, and, gte, lte, ne, sql } from "drizzle-orm";
  import { loadClientConfig } from "@/lib/load-client-config";
  const CLIENT_ID = process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

loadClientConfig DOĞRULANMIŞ İMZA (Phase 0 Step 3'ten):
  export function loadClientConfig(slug?: string): ClientConfig  ← SYNC
  (readFileSync tabanlı — await YOK, async değil)

operatingHours DOĞRULANMIŞ FORMAT:
  "operatingHours": {
    "monday":    { "open": "0900", "close": "1900" },
    "thursday":  { "open": "0900", "close": "2100" },
    "saturday":  { "open": "1000", "close": "1700" },
    "sunday":    null    ← kapalı gün
  }
  Key'ler lowercase İngilizce gün adları.
  Value: { open: string; close: string } | null
  "0900" → hour=9, minute=0  (ilk 2 char = hour, son 2 char = minute)
```

---

## BAŞLAMADAN ÖNCE ZORUNLU OKUMA (bu sırayla, atlamadan)

```bash
# 1. Config yükleyicinin exact imzasını ve return type'ını doğrula
cat apps/web/lib/load-client-config.ts

# 2. Slots route'undaki mevcut hardcoded iş saatlerini ve timezone
#    helper fonksiyonlarını tam olarak gör (hangi satırda, nasıl tanımlı)
cat apps/web/app/api/booking/slots/route.ts

# 3. Calendar route'undaki helper fonksiyonlarını gör
cat apps/web/app/api/admin/calendar/route.ts

# 4. V2-5'te eklenen waiting-list route'undaki kopyalanmış helper'ları gör
cat apps/web/app/api/waiting-list/route.ts

# 5. V2-5 sonrası SlotPicker.tsx'in tam içeriğini gör
#    (WaitingListForm dahil — gdprConsent checkbox ve renk kodlarını bul)
cat apps/web/components/SlotPicker.tsx

# 6. V2-5'te eklenen WaitingListView.tsx'i gör (Uhrzeit kolonunu bul)
cat apps/web/app/admin/waiting-list/WaitingListView.tsx

# 7. vienna-helpers.ts zaten var mı?
ls apps/web/lib/
cat apps/web/lib/vienna-helpers.ts 2>/dev/null || echo ">>> FILE NOT FOUND"

# 8. settings/ sayfası zaten var mı?
ls apps/web/app/admin/
cat apps/web/app/admin/settings/page.tsx 2>/dev/null || echo ">>> FILE NOT FOUND"

# 9. Sidebar'ın mevcut nav item pattern'ını gör
cat apps/web/components/admin/Sidebar.tsx

# 10. Mevcut test dosyasının mock pattern'ını gör
#     (Yeni testler aynı pattern'ı kullanacak)
cat apps/web/__tests__/booking-slots-api.test.ts
```

> **HER DOSYAYI OKU, TAHMİN ETME.**
> Eğer bir dosya beklenen yerde yoksa → **STOP** ve bildir. Devam etme.

---

## GÖREV 1 — V2-5 Bug Fixes (3 fix, 2 dosya)

**Amaç:** V2-5'te bırakılan 3 hatayı düzelt. Mevcut 265 test kırılmayacak — sadece bug fix. Bu görev tamamlanmadan diğer görevlere geçme.

### Fix 1 & 2 — `apps/web/components/SlotPicker.tsx`

**Önce oku:** `cat apps/web/components/SlotPicker.tsx`

#### Fix 1 — GDPR Hardcode (Kritik)

```typescript
// BOZUK OLAN (V2-5'ten kalan):
body: JSON.stringify({
  ...
  gdprConsent: true,  // ← hardcoded, YANLIŞ
})

// DOĞRULTULACAK:
// WaitingListForm içinde bu state zaten var VEYA yoksa ekle:
const [gdprChecked, setGdprChecked] = useState(false);

// Submit handler'da:
body: JSON.stringify({
  customerName,
  customerEmail,
  customerPhone: customerPhone || undefined,
  serviceId,
  requestedDate: date,
  clientId: clientId ?? undefined,
  gdprConsent: gdprChecked,  // ← state'den oku
})

// Submit button:
<button
  type="button"
  onClick={handleSubmit}
  disabled={!gdprChecked || isLoading}
  style={{
    background: "var(--color-primary)",
    color: "var(--color-background)",
    border: "none",
    borderRadius: "6px",
    padding: "10px 16px",
    cursor: !gdprChecked || isLoading ? "not-allowed" : "pointer",
    opacity: !gdprChecked || isLoading ? 0.6 : 1,
    fontSize: "14px",
    minHeight: "44px",
  }}
>
  {isLoading ? "Bitte warten..." : "Auf Warteliste eintragen"}
</button>

// Checkbox (zaten varsa sadece onChange'i düzelt, yoksa ekle):
<label style={{
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  cursor: "pointer",
  fontSize: "13px",
  color: "var(--color-text-muted)",
}}>
  <input
    type="checkbox"
    checked={gdprChecked}
    onChange={(e) => setGdprChecked(e.target.checked)}
    style={{ marginTop: "2px", flexShrink: 0 }}
  />
  <span>
    Ich stimme der Verarbeitung meiner Daten für die Warteliste zu.
  </span>
</label>
```

#### Fix 2 — Hardcoded Hex Colors (CSS vars ihlali)

```typescript
// BOZUK OLAN (V2-5'ten kalan):
style={{ color: "#DC2626", fontSize: "13px" }}         // error
style={{ background: "#D1FAE5", borderRadius: "8px" }} // success bg
style={{ color: "#065F46", fontSize: "14px" }}         // success text

// DOĞRULTULACAK:

// Error mesajı — prefix olarak ⚠ sembolü kullan:
style={{
  color: "var(--color-text)",
  fontSize: "13px",
  marginTop: "8px",
  padding: "8px",
  border: "1px solid var(--color-accent)",
  borderRadius: "6px",
}}
// İçerik: "⚠ " + errorMessage

// Success container:
style={{
  marginTop: "16px",
  padding: "12px",
  border: "1px solid var(--color-primary)",
  borderRadius: "8px",
  background: "color-mix(in srgb, var(--color-primary) 8%, var(--color-background))",
}}

// Success text:
style={{ color: "var(--color-primary)", fontSize: "14px" }}
```

### Fix 3 — `apps/web/app/admin/waiting-list/WaitingListView.tsx`

**Önce oku:** `cat apps/web/app/admin/waiting-list/WaitingListView.tsx`

```typescript
// BOZUK OLAN:
// Tablo kolonu sırası: "Datum | Uhrzeit | Kunde | E-Mail | Telefon | Hizmet | Status | Registriert"
// "Uhrzeit" kolonunda gösterilecek veri yok — requestedDate sadece YYYY-MM-DD formatında.

// DOĞRULTULACAK:
// "Uhrzeit" kolonunu tamamen kaldır.
// Yeni kolon sırası (7 kolon):
// "Datum | Kunde | E-Mail | Telefon | Hizmet | Status | Registriert"

// Status badge'lerinde hardcoded hex varsa CSS vars'a çevir:
// amber/sarı  → border: "1px solid var(--color-secondary)"
//               background: "color-mix(in srgb, var(--color-secondary) 15%, var(--color-background))"
//               color: "var(--color-text)"
// green/yeşil → border: "1px solid var(--color-primary)"
//               background: "color-mix(in srgb, var(--color-primary) 15%, var(--color-background))"
//               color: "var(--color-primary)"
// Badge'ler zaten CSS vars kullanıyorsa bu adımı atla.
```

**Acceptance Criteria — Görev 1:**

- [ ] `gdprConsent: true` hardcoded ifadesi `SlotPicker.tsx`'te kalmadı
- [ ] Checkbox işaretlenmeden submit button disabled
- [ ] `#DC2626`, `#D1FAE5`, `#065F46` hex kodları kalmadı — CSS vars kullanılıyor
- [ ] "Uhrzeit" kolonu `WaitingListView.tsx`'ten kaldırıldı
- [ ] `pnpm typecheck` → 0 hata
- [ ] `pnpm test` → **265/265** (sayı değişmeyecek — sadece bug fix)

```bash
git add apps/web/components/SlotPicker.tsx \
        apps/web/app/admin/waiting-list/WaitingListView.tsx
git commit -m "fix(waiting-list): gdpr consent hardcode, css var violations, remove empty Uhrzeit column"
git push
```

---

## GÖREV 2 — `vienna-helpers.ts` Ortak Dosyası (Teknik Borç Temizliği)

**Amaç:** Aynı helper fonksiyonlar `slots/route.ts`, `calendar/route.ts` ve `waiting-list/route.ts` içinde kopyalı duruyor. Tek ortak dosyaya taşı.

```bash
# Önce kontrol et:
cat apps/web/lib/vienna-helpers.ts 2>/dev/null || echo ">>> FILE NOT FOUND"

# Dosya zaten varsa ve doğru fonksiyonları içeriyorsa:
# Sadece import'ları güncelle — tekrar yazma.
# Dosya yoksa aşağıdaki içerikle oluştur.
```

**`apps/web/lib/vienna-helpers.ts`** (yoksa oluştur):

```typescript
// apps/web/lib/vienna-helpers.ts
// Machine-TZ-independent Vienna timezone utilities.
// formatToParts + Date.UTC tabanlı — toLocaleString KULLANMA.

export function getViennaOffsetMinutes(date: Date): number {
  const utcFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const viennaFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parse = (f: Intl.DateTimeFormat, d: Date): number => {
    const p = f.formatToParts(d).reduce<Record<string, string>>((acc, x) => {
      if (x.type !== "literal") acc[x.type] = x.value;
      return acc;
    }, {});
    return Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour === "24" ? "0" : p.hour),
      Number(p.minute),
      Number(p.second)
    );
  };
  return Math.round((parse(viennaFmt, date) - parse(utcFmt, date)) / 60000);
}

export function formatDateVienna(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // → "YYYY-MM-DD"
}

export function formatTimeVienna(date: Date): string {
  return new Intl.DateTimeFormat("de-AT", {
    timeZone: "Europe/Vienna",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date); // → "09:00"
}

export function viennaWallClockToUTC(
  dateStr: string,
  hour: number,
  minute: number
): Date {
  const anchor = new Date(`${dateStr}T12:00:00Z`);
  const offsetMinutes = getViennaOffsetMinutes(anchor);
  const [y, m, d] = dateStr.split("-").map(Number);
  // m is already 1-indexed from the split — subtract 1 for Date.UTC
  const asIfUtcMs = Date.UTC(y, m - 1, d, hour, minute, 0);
  return new Date(asIfUtcMs - offsetMinutes * 60000);
}

// NOTE: m parameter is 0-indexed (JS Date.getMonth() convention).
// Pass month as d.getMonth(), NOT d.getMonth()+1.
export function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function getViennaWeekdayKey(dateStr: string): string {
  // Returns: "monday" | "tuesday" | "wednesday" | "thursday" |
  //          "friday" | "saturday" | "sunday"
  // Uses T12:00:00Z anchor — DST-safe, machine-TZ-independent.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    weekday: "long",
  })
    .format(new Date(`${dateStr}T12:00:00Z`))
    .toLowerCase();
}
```

**Import güncelleme — 3 dosyada:**

```typescript
// Her üç dosyada mevcut inline helper fonksiyonlarını SİL:
// getViennaOffsetMinutes, formatDateVienna, formatTimeVienna,
// viennaWallClockToUTC, toDateString (varsa)

// Dosyanın üstüne ekle (SADECE o dosyada kullanılan helper'ları import et):
import {
  formatDateVienna,      // kullanılıyorsa
  formatTimeVienna,      // kullanılıyorsa
  getViennaOffsetMinutes, // kullanılıyorsa
  viennaWallClockToUTC,  // kullanılıyorsa
  toDateString,          // kullanılıyorsa — m parametresi 0-indexed
  getViennaWeekdayKey,   // kullanılıyorsa
} from "@/lib/vienna-helpers";

// Güncellenen dosyalar:
// 1. apps/web/app/api/booking/slots/route.ts
// 2. apps/web/app/api/admin/calendar/route.ts
//    (bu dosyada helper yoksa import ekleme — boş import bırakma)
// 3. apps/web/app/api/waiting-list/route.ts

// KURAL: Kullanılmayan import ekleme — TypeScript hatası verir.
// Her dosyada hangi helper'ların gerçekten kullanıldığını okuduktan sonra
// sadece o helper'ları import et.
```

**Acceptance Criteria — Görev 2:**

- [ ] `apps/web/lib/vienna-helpers.ts` mevcut — 6 fonksiyon export ediyor
- [ ] `slots/route.ts` helper'ları inline tanımlamıyor, import ediyor
- [ ] `calendar/route.ts` (eğer helper kullanıyorsa) import ediyor
- [ ] `waiting-list/route.ts` artık kopyalanmış helper içermiyor
- [ ] `pnpm typecheck` → 0 hata
- [ ] `pnpm test` → **265/265** (refactor — davranış değişmez)

```bash
git add apps/web/lib/vienna-helpers.ts \
        apps/web/app/api/booking/slots/route.ts \
        apps/web/app/api/admin/calendar/route.ts \
        apps/web/app/api/waiting-list/route.ts
git commit -m "refactor: extract vienna-helpers.ts, remove duplicated timezone helpers from 3 routes"
git push
```

---

## GÖREV 3 — Config'den Operating Hours Okuma

**Amaç:** `slots/route.ts`'teki hardcoded iş saatlerini kaldır. `loadClientConfig()` ile oku. SYNC fonksiyon — `await` yok.

**File:** `apps/web/app/api/booking/slots/route.ts`

**Önce oku:** `cat apps/web/app/api/booking/slots/route.ts`
Hardcoded saatlerin tam olarak nerede olduğunu gör. Genellikle şuna benzer:
```typescript
const isSunday = ...
const openHour = isSunday ? 10 : 9;
const closeHour = isSunday ? 16 : 18;
```
**Bu bloğu sil.**

**Dosya başına eklenecek import'lar** (Görev 2'de zaten eklenmişse tekrar ekleme):

```typescript
import { loadClientConfig } from "@/lib/load-client-config";
import {
  getViennaWeekdayKey,
  viennaWallClockToUTC,
  formatTimeVienna,
  getViennaOffsetMinutes,
} from "@/lib/vienna-helpers";
```

**Handler içinde dosya scope'unda tanımlanacak parse helper:**

```typescript
function parseHHMM(timeStr: string): { hour: number; minute: number } {
  const padded = timeStr.padStart(4, "0");
  return {
    hour: parseInt(padded.slice(0, 2), 10),
    minute: parseInt(padded.slice(2, 4), 10),
  };
}
```

**Handler içi — hardcoded openHour/closeHour bloğunu tamamen bu blokla değiştir:**

```typescript
// Vienna'da bu tarihin haftanın hangi günü olduğunu al
const jsWeekday = getViennaWeekdayKey(date);
// → "monday" | "tuesday" | ... | "sunday"

// Fallback değerler (config yüklenemezse kullanılır)
let openHour = 9;
let openMinute = 0;
let closeHour = 18;
let closeMinute = 0;
let isDayClosed = false;

try {
  const cfg = loadClientConfig(); // SYNC — await yok
  const dayConfig = cfg.operatingHours?.[jsWeekday];

  if (dayConfig === null || dayConfig === undefined) {
    // null → kapalı gün (örn. sunday: null)
    // undefined → operatingHours'ta bu key yok → kapalı say
    isDayClosed = true;
  } else if (dayConfig.open && dayConfig.close) {
    const openParsed = parseHHMM(dayConfig.open);
    const closeParsed = parseHHMM(dayConfig.close);
    openHour = openParsed.hour;
    openMinute = openParsed.minute;
    closeHour = closeParsed.hour;
    closeMinute = closeParsed.close; // ← DIKKAT: closeParsed.minute kullan
  }
} catch (err) {
  console.warn(
    "[slots] Failed to load operating hours from config, using fallback 09:00–18:00",
    err
  );
  // Fallback değerler yukarıda set edildi — sistem çalışmaya devam eder.
}

// Kapalı gün → erken dön (HTTP 200)
if (isDayClosed) {
  return NextResponse.json({
    date,
    serviceId,
    serviceName,
    serviceDurationMinutes,
    isDayClosed: true,
    slots: [],
  });
}
```

> **ÖNEMLİ DÜZELTME:** Yukarıdaki `closeMinute: closeParsed.close` satırı kasıtlı olarak yanlış yazılmıştır — bu bir copy-paste tuzağıdır. Doğru satır:
> ```typescript
> closeMinute: closeParsed.minute;
> ```
> Dosyayı yazarken `closeParsed.minute` kullan, `closeParsed.close` değil.

**Slot loop güncellemesi (dakika bazlı hesaplama):**

```typescript
const openTotalMinutes = openHour * 60 + openMinute;
const closeTotalMinutes = closeHour * 60 + closeMinute;

// Mevcut step hesabını koru:
// const stepMinutes = Math.min(30, serviceDurationMinutes);

for (
  let minuteOfDay = openTotalMinutes;
  minuteOfDay < closeTotalMinutes;
  minuteOfDay += stepMinutes
) {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  const slotStartUTC = viennaWallClockToUTC(date, hour, minute);
  const slotEndUTC = new Date(
    slotStartUTC.getTime() + serviceDurationMinutes * 60000
  );

  // Kapanış sınırı kontrolü (dakika bazlı — openMinute/closeMinute destekler):
  const closingUTC = viennaWallClockToUTC(date, closeHour, closeMinute);
  if (slotEndUTC.getTime() > closingUTC.getTime()) continue;

  // ... geri kalanı mevcut kodu koru (isPast kontrolü, booking çakışması vb.)
}
```

**Response'a `isDayClosed` ekle (kapalı olmayan günler için):**

```typescript
return NextResponse.json({
  date,
  serviceId,
  serviceName,
  serviceDurationMinutes,
  isDayClosed: false,   // ← yeni alan
  slots: [...],
});
```

**Acceptance Criteria — Görev 3:**

- [ ] Pazartesi: config'deki 09:00-19:00 saatlerini kullanıyor
- [ ] Perşembe: 09:00-21:00 — 20:30 slotu var (60dk hizmet sığıyor)
- [ ] Cumartesi: 10:00-17:00 — 09:30 slotu yok, 10:00 var
- [ ] Pazar (`null`): `isDayClosed: true`, `slots: []`, HTTP 200
- [ ] Config load hatası: fallback 09:00-18:00, HTTP 200 (crash yok)
- [ ] `pnpm typecheck` → 0 hata

```bash
git add apps/web/app/api/booking/slots/route.ts
git commit -m "feat(slots): read operating hours from client.config.json, isDayClosed for null days"
git push
```

---

## GÖREV 4 — SlotPicker: `isDayClosed` State

**File:** `apps/web/components/SlotPicker.tsx`
(Görev 1'de bu dosyayı zaten düzenledin — aynı dosya, ek değişiklik)

**Önce oku:** `cat apps/web/components/SlotPicker.tsx` (Görev 1 sonrası hali)

```typescript
// Mevcut SlotsResponse tipine isDayClosed ekle:
type SlotsResponse = {
  isDayClosed?: boolean;
  slots: SlotItem[];
  serviceDurationMinutes: number;
  serviceName?: string | null;
};

// State ekle:
const [isDayClosed, setIsDayClosed] = useState(false);

// date veya serviceId değişince reset:
useEffect(() => {
  setIsDayClosed(false);
  setSlots([]);
  // ... mevcut reset kodunu koru
}, [date, serviceId, clientId]);

// Fetch response'unda:
.then((data: SlotsResponse) => {
  setIsDayClosed(data.isDayClosed ?? false);
  setSlots(data.slots ?? []);
  // ...
});

// Render — loading ve error'dan sonra, slot grid'den önce:
if (isDayClosed) {
  return (
    <p style={{
      color: "var(--color-text-muted)",
      fontSize: "14px",
      padding: "8px 0",
    }}>
      Dieser Tag ist nicht verfügbar. Bitte wählen Sie einen anderen Tag.
    </p>
  );
}
```

**Acceptance Criteria — Görev 4:**

- [ ] Pazar seçilince "Dieser Tag ist nicht verfügbar..." mesajı görünüyor
- [ ] Kapalı günde "Warteliste beitreten" butonu görünmüyor
- [ ] Başka bir gün seçilince `isDayClosed` state resetleniyor
- [ ] `pnpm typecheck` → 0 hata

```bash
git add apps/web/components/SlotPicker.tsx
git commit -m "feat(SlotPicker): handle isDayClosed state from slots API"
git push
```

---

## GÖREV 5 — Admin Settings Sayfası (Read-Only)

**Amaç:** Admin panele iş saatleri ve booking rules görüntüleyen read-only sayfa. Write/edit yok — sadece okuma.

```bash
# Önce kontrol et:
ls apps/web/app/admin/
cat apps/web/app/admin/settings/page.tsx 2>/dev/null || echo ">>> FILE NOT FOUND"

# Stil tutarlılığı için mevcut admin sayfasını oku:
cat apps/web/app/admin/front-desk/page.tsx

# Sidebar pattern'ını oku:
cat apps/web/components/admin/Sidebar.tsx
```

### `apps/web/app/admin/settings/page.tsx` (yoksa oluştur)

```typescript
export const dynamic = "force-dynamic";
// SERVER COMPONENT — "use client" YOK

import { loadClientConfig } from "@/lib/load-client-config";

const WEEKDAY_LABELS: Record<string, string> = {
  monday:    "Montag",
  tuesday:   "Dienstag",
  wednesday: "Mittwoch",
  thursday:  "Donnerstag",
  friday:    "Freitag",
  saturday:  "Samstag",
  sunday:    "Sonntag",
};

const WEEKDAY_ORDER = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

function formatTime(timeStr: string): string {
  const padded = timeStr.padStart(4, "0");
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
}

export default function SettingsPage() {
  let cfg;
  let configError = false;
  try {
    cfg = loadClientConfig();
  } catch {
    configError = true;
  }

  if (configError || !cfg) {
    return (
      <main style={{ padding: "var(--space-8, 2rem)" }}>
        <h1 style={{ color: "var(--color-text)", marginBottom: "1rem" }}>
          Einstellungen
        </h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Konfiguration konnte nicht geladen werden.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "var(--space-8, 2rem)", maxWidth: "800px" }}>
      <h1 style={{
        color: "var(--color-text)",
        marginBottom: "2rem",
        fontSize: "1.5rem",
        fontWeight: 600,
      }}>
        Einstellungen
      </h1>

      {/* Öffnungszeiten */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{
          color: "var(--color-text)",
          fontSize: "1rem",
          fontWeight: 600,
          marginBottom: "1rem",
        }}>
          Öffnungszeiten
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-secondary)" }}>
              {["Tag", "Öffnung", "Schließung", "Status"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    color: "var(--color-text-muted)",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAY_ORDER.map((day) => {
              const hours = cfg.operatingHours?.[day];
              const isClosed = hours === null || hours === undefined;
              return (
                <tr
                  key={day}
                  style={{ borderBottom: "1px solid var(--color-accent)" }}
                >
                  <td style={{ padding: "10px 12px", color: "var(--color-text)", fontSize: "14px" }}>
                    {WEEKDAY_LABELS[day]}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--color-text)", fontSize: "14px" }}>
                    {isClosed ? "—" : formatTime(hours!.open)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--color-text)", fontSize: "14px" }}>
                    {isClosed ? "—" : formatTime(hours!.close)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      padding: "2px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      border: isClosed
                        ? "1px solid var(--color-text-muted)"
                        : "1px solid var(--color-primary)",
                      color: isClosed
                        ? "var(--color-text-muted)"
                        : "var(--color-primary)",
                    }}>
                      {isClosed ? "Geschlossen" : "Geöffnet"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Buchungsregeln */}
      <section>
        <h2 style={{
          color: "var(--color-text)",
          fontSize: "1rem",
          fontWeight: 600,
          marginBottom: "1rem",
        }}>
          Buchungsregeln
        </h2>
        <div style={{
          border: "1px solid var(--color-accent)",
          borderRadius: "8px",
          padding: "16px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "12px",
        }}>
          {[
            {
              label: "Mindestvorlaufzeit",
              value: `${cfg.bookingRules?.minAdvanceBookingHours ?? 2} Stunden`,
            },
            {
              label: "Stornierungsfrist",
              value: `${cfg.bookingRules?.cancellationPolicyHours ?? 24} Stunden`,
            },
            {
              label: "Max. Nachfassversuche",
              value: String(cfg.bookingRules?.maxFollowUpAttempts ?? 2),
            },
            {
              label: "Wartezeit Rückgewinnung",
              value: `${cfg.bookingRules?.recoveryWaitHours ?? 48} Stunden`,
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{
                fontSize: "12px",
                color: "var(--color-text-muted)",
                marginBottom: "2px",
              }}>
                {label}
              </div>
              <div style={{
                fontSize: "14px",
                color: "var(--color-text)",
                fontWeight: 500,
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
```

### Sidebar Güncelleme — `apps/web/components/admin/Sidebar.tsx`

```typescript
// V2-3'te "Kalender" nasıl eklendiyse AYNI pattern'ı kullan.
// Mevcut nav item'ların SONUNA ekle — sıralamayı değiştirme.

// Label   : "Einstellungen"
// Href    : "/admin/settings"
// Icon    : Settings (Lucide) — mevcut icon sistemi neyse onu kullan
// Aktif state pattern'ı mevcut item'larla birebir aynı
```

**Acceptance Criteria — Görev 5:**

- [ ] `/admin/settings` → HTTP 200, sayfa render oluyor
- [ ] 7 günlük tablo Almanca gün isimleriyle görünüyor
- [ ] Pazar satırında "Geschlossen" badge'i var
- [ ] Perşembe satırında "09:00 / 21:00" görünüyor
- [ ] Booking rules kartında 4 değer görünüyor
- [ ] Sidebar'da "Einstellungen" linki mevcut, aktif state çalışıyor
- [ ] Config load hatası → sayfa crash etmez, hata mesajı gösteriyor
- [ ] Sadece mevcut CSS vars kullanıldı
- [ ] `pnpm typecheck` → 0 hata

```bash
git add apps/web/app/admin/settings/page.tsx \
        apps/web/components/admin/Sidebar.tsx
git commit -m "feat(admin): settings page with operating hours and booking rules, sidebar link"
git push
```

---

## GÖREV 6 — Testler (5 yeni → hedef 270/270)

**File:** `apps/web/__tests__/booking-slots-api.test.ts`

**Önce oku:** `cat apps/web/__tests__/booking-slots-api.test.ts`
Mevcut 8 test + mock pattern'ını anla. Sonra aşağıdakileri ekle.

**Mock setup — mevcut `vi.mock` bloklarıyla aynı seviyede ekle:**

```typescript
vi.mock("@/lib/load-client-config", () => ({
  loadClientConfig: vi.fn(),
}));
```

**`loadClientConfig` import'unu dosya başına ekle:**

```typescript
import { loadClientConfig } from "@/lib/load-client-config";
```

**`beforeEach` içine varsayılan config mock'unu ekle:**

```typescript
// beforeEach içinde — tüm testlerin default config'i olsun:
vi.mocked(loadClientConfig).mockReturnValue({
  operatingHours: {
    monday:    { open: "0900", close: "1900" },
    tuesday:   { open: "0900", close: "1900" },
    wednesday: { open: "0900", close: "1900" },
    thursday:  { open: "0900", close: "2100" },
    friday:    { open: "0900", close: "1900" },
    saturday:  { open: "1000", close: "1700" },
    sunday:    null,
  },
  bookingRules: {
    minAdvanceBookingHours: 2,
    cancellationPolicyHours: 24,
    maxFollowUpAttempts: 2,
    recoveryWaitHours: 48,
  },
} as any);
```

> **KRİTİK:** Bu mock `beforeEach`'e eklendiğinde mevcut 8 test de bu config'i kullanır.
> Test 3 ("Empty day, all slots available") `getFutureDate(30)` kullanıyor.
> Bu tarih tesadüfen Pazar'a denk gelirse `isDayClosed: true` döner ve
> `slots.every(s => s.available === true)` fail eder.
> **Çözüm:** Test 3'teki `getFutureDate(30)` yerine `getNextWeekday(1)` (Pazartesi)
> kullan — böylece her zaman açık bir güne denk gelir.
> Test 3'ü bu şekilde güncelle, assertion'ları koru.

**Test dosyasının başına tarih helper'larını ekle:**

```typescript
function getFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function getNextWeekday(targetDay: number): string {
  // targetDay: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Her zaman GELECEK haftanın gününü döner (bugün hedef gün olsa bile).
  const d = new Date();
  const current = d.getUTCDay();
  let diff = targetDay - current;
  if (diff <= 0) diff += 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}
```

**Test 3 güncelleme (mevcut test — sadece tarih kısmını değiştir):**

```typescript
// ESKİ:
// let futureDate = getFutureDate(30);  ← Pazar'a denk gelebilir

// YENİ (Test 3'ü bul ve tarihi değiştir):
const futureDate = getNextWeekday(1); // Her zaman Pazartesi — asla kapalı değil
// Assertion'lar aynı kalır: slots.length > 0 && slots.every(s => s.available === true)
```

**5 Yeni Test:**

```typescript
// Test 9 — Kapalı gün: Sunday null → isDayClosed: true, slots: []
it("returns isDayClosed:true and empty slots for Sunday (null config)", async () => {
  const sunday = getNextWeekday(0);
  const request = new Request(
    `http://localhost/api/booking/slots?date=${sunday}&serviceId=valid-uuid`
  );
  const response = await GET(request);
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.isDayClosed).toBe(true);
  expect(body.slots).toHaveLength(0);
});

// Test 10 — Perşembe 21:00 kapanış → 20:30 slotu var, 21:00 slotu yok
it("includes 20:30 slot for Thursday (closes 21:00, 60min service)", async () => {
  const thursday = getNextWeekday(4);
  const request = new Request(
    `http://localhost/api/booking/slots?date=${thursday}&serviceId=valid-uuid`
  );
  const response = await GET(request);
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.isDayClosed).toBe(false);
  const times = body.slots.map((s: { time: string }) => s.time);
  expect(times).toContain("20:30"); // 60dk hizmet, 21:00'da biter = kapanışa sığar
  expect(times).not.toContain("21:00"); // Kapanış saatinde slot açılmaz
});

// Test 11 — Cumartesi 10:00 açılış → 09:00 ve 09:30 slotu yok, 10:00 var
it("starts at 10:00 for Saturday (opens 10:00, not 09:00)", async () => {
  const saturday = getNextWeekday(6);
  const request = new Request(
    `http://localhost/api/booking/slots?date=${saturday}&serviceId=valid-uuid`
  );
  const response = await GET(request);
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.isDayClosed).toBe(false);
  const times = body.slots.map((s: { time: string }) => s.time);
  expect(times).not.toContain("09:00");
  expect(times).not.toContain("09:30");
  expect(times).toContain("10:00");
});

// Test 12 — Config load hatası → fallback 09:00-18:00, HTTP 200
it("falls back to 09:00-18:00 and returns 200 when loadClientConfig throws", async () => {
  vi.mocked(loadClientConfig).mockImplementationOnce(() => {
    throw new Error("config file not found");
  });
  const monday = getNextWeekday(1);
  const request = new Request(
    `http://localhost/api/booking/slots?date=${monday}&serviceId=valid-uuid`
  );
  const response = await GET(request);
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.isDayClosed).toBe(false);
  expect(body.slots.length).toBeGreaterThan(0);
  const times = body.slots.map((s: { time: string }) => s.time);
  expect(times).toContain("09:00"); // fallback başlangıcı
  expect(times).not.toContain("18:00"); // 18:00'da 60dk hizmet kapanışı (18:00) aşar → slot yok
});

// Test 13 — Gelecek tarih (Pazartesi), boş DB → tüm slotlar available: true
it("returns all slots as available for a future Monday with no bookings", async () => {
  // Pazartesi kullan — kapalı gün değil, asla isDayClosed olmaz
  const monday = getNextWeekday(1);
  const request = new Request(
    `http://localhost/api/booking/slots?date=${monday}&serviceId=valid-uuid`
  );
  const response = await GET(request);
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.isDayClosed).toBe(false);
  expect(body.slots.length).toBeGreaterThan(0);
  expect(
    body.slots.every((s: { available: boolean }) => s.available)
  ).toBe(true);
});
```

> **NOT — Test 12'de `mockImplementationOnce` kullanımı:**
> `mockImplementation` yerine `mockImplementationOnce` kullan.
> Böylece bu test sonrası diğer testler `beforeEach`'teki normal mock'a döner.
> `mockImplementation` kullanılırsa sonraki testler de throw eder ve kırılır.

**Acceptance Criteria — Görev 6:**

- [ ] 5 yeni test geçiyor (`.skip` veya `.todo` yok)
- [ ] Test 3 (`getNextWeekday(1)` ile güncellenmiş) hâlâ geçiyor
- [ ] `pnpm test` → **270/270 passing**
- [ ] Farklı sayı çıkarsa → **STOP, commit yapma, raporla**

```bash
git add apps/web/__tests__/booking-slots-api.test.ts
git commit -m "test(slots): 5 tests for config-driven operating hours (270/270)"
git push
```

---

## GÖREV 7 — CLAUDE.md Güncelleme

```bash
cat CLAUDE.md  # Mevcut V2 sprint log formatını gör, aynı pattern'a ekle
```

CLAUDE.md'nin V2 Sprints bölümüne şu bloğu ekle:

```markdown
### V2-6: Business Hours Config + V2-5 Bug Fixes — COMPLETED
- fix: WaitingListForm gdprConsent hardcode düzeltildi (checkbox state'e bağlandı)
- fix: Hardcoded hex renkler (#DC2626, #D1FAE5, #065F46) CSS vars ile değiştirildi
- fix: WaitingListView "Uhrzeit" kolonu kaldırıldı (veri yoktu)
- refactor: apps/web/lib/vienna-helpers.ts oluşturuldu (6 helper export)
  Exports: formatDateVienna, formatTimeVienna, getViennaOffsetMinutes,
           viennaWallClockToUTC, toDateString, getViennaWeekdayKey
- refactor: slots/route.ts, calendar/route.ts, waiting-list/route.ts
  → inline helper'lar kaldırıldı, vienna-helpers.ts'den import ediliyor
- feat: operatingHours artık clients/demo-salon/client.config.json'dan okunuyor
- feat: Kapalı gün (null) → isDayClosed: true, slots: [], HTTP 200
- feat: Config load hatası → fallback 09:00-18:00 (crash yok)
- feat: SlotPicker isDayClosed durumunu gösteriyor
- feat: /admin/settings — 7 günlük tablo (Almanca), booking rules kartı (read-only)
- feat: Sidebar'a "Einstellungen" (/admin/settings) linki eklendi
- test: 270/270 (+5 yeni business hours testi, Test 3 Pazar güvenliği düzeltildi)
- Schema değişikliği YOK | packages/ değişikliği YOK
- loadClientConfig SYNC doğrulandı (readFileSync — await yok)
- toDateString helper: m parametresi 0-indexed (JS Date.getMonth() convention)
```

```bash
git add CLAUDE.md
git commit -m "docs: log V2-6 completion in CLAUDE.md"
git push
git log --oneline -8
```

---

## FINAL DOĞRULAMA (bu sırayla — ilk hatada dur)

```bash
# 1. Type check
pnpm typecheck
# Beklenen: 0 hata

# 2. Testler
pnpm test
# Beklenen: 270/270 passing

# 3. Build
pnpm --filter @beauty/web build
# Beklenen: Temiz build, warning yok
```

**Manuel kontroller (dev server çalışıyorken):**

- [ ] `/booking` → Pazar seçince "Dieser Tag ist nicht verfügbar..." görünüyor
- [ ] `/booking` → Perşembe seçince slot listesinde 20:30 var
- [ ] `/booking` → Cumartesi seçince ilk slot 10:00
- [ ] `/booking` → Tüm slotları dolu gün → "Warteliste beitreten" görünüyor
- [ ] Waiting list formu GDPR checkbox işaretlenmeden submit disabled
- [ ] GDPR checkbox işaretlendikten sonra submit aktif
- [ ] `/admin/settings` → HTTP 200, sayfa render oluyor
- [ ] Pazar satırında "Geschlossen" badge'i var
- [ ] Perşembe satırında "09:00 / 21:00" görünüyor
- [ ] Booking rules kartında 4 değer görünüyor
- [ ] Sidebar'da "Einstellungen" linki aktif state çalışıyor
- [ ] `/admin/waiting-list` hâlâ çalışıyor ("Uhrzeit" kolonu yok, diğerleri var)

---

## REPORT BACK

Sprint bittikten sonra şunları raporla:

1. Exact test sayısı (270 olmalı)
2. `loadClientConfig` sync muydu, async mıydı? (beklenti: sync)
3. `operatingHours` key formatı ne? (beklenti: lowercase English "monday")
4. `vienna-helpers.ts` zaten var mıydı yoksa yeni mi oluşturuldu?
5. `SlotPicker.tsx`'te `gdprConsent: true` gerçekten hardcoded miydi?
6. `/admin/settings` zaten var mıydı yoksa yeni mi?
7. `WaitingListView`'de "Uhrzeit" kolonu gerçekten boş muydu?
8. Test 3 Pazar güvenlik düzeltmesi uygulandı mı? (getFutureDate → getNextWeekday(1))
9. Her görev için commit hash
10. Herhangi bir görevde beklenmedik durum (dosya bulunamadı, import hatası vb.)

**Sprint V2-7'ye geçmeden önce bu rapor onaylanacak.**

---

## SPRİNT V2-6 BİTİŞ KONTROL LİSTESİ

Sprint tamamlanmış sayılması için tüm maddelerin TRUE olması gerekir:

```
 1. [ ] WaitingListForm: gdprConsent state-driven (hardcode yok)
 2. [ ] WaitingListForm: GDPR checkbox işaretlenmeden submit disabled
 3. [ ] SlotPicker.tsx: hex renk kodu yok — sadece CSS vars
 4. [ ] WaitingListView.tsx: "Uhrzeit" kolonu kaldırıldı
 5. [ ] apps/web/lib/vienna-helpers.ts mevcut — 6 helper export
 6. [ ] slots/route.ts inline helper içermiyor, import ediyor
 7. [ ] calendar/route.ts (eğer helper kullanıyorsa) import ediyor
 8. [ ] waiting-list/route.ts kopyalanmış helper içermiyor
 9. [ ] slots/route.ts: operatingHours config'den okunuyor
10. [ ] Pazar (null) → isDayClosed: true, slots: [], HTTP 200
11. [ ] Perşembe → 20:30 slotu var, 21:00 yok
12. [ ] Cumartesi → 10:00 açılış, 09:00/09:30 yok
13. [ ] Config hatası → fallback 09:00-18:00, crash yok
14. [ ] SlotPicker: isDayClosed mesajı gösteriyor
15. [ ] /admin/settings sayfası çalışıyor
16. [ ] 7 günlük tablo Almanca gün isimleriyle doğru
17. [ ] Sidebar'da "Einstellungen" linki aktif
18. [ ] Test 3: getNextWeekday(1) ile güncellendi (Pazar güvenlik fix)
19. [ ] pnpm typecheck → 0 hata
20. [ ] pnpm test → 270/270
21. [ ] pnpm --filter @beauty/web build → temiz
22. [ ] packages/** değiştirilmedi
23. [ ] CLAUDE.md güncellendi
24. [ ] Tüm commit'ler push edildi
```
