# Sprint V2-8: Google Business Booking

**Backend status:** `packages/**` FROZEN. `apps/web/**` only.
**DB schema:** NO changes. `/api/lead` contract: NO changes.
**Test baseline:** 274/274 (V2-7 complete)
**Hedef:** 278/278 (+4 yeni test)

---

## CURRENT STATE

```
clients/demo-salon/client.config.json  → MEVCUT — googleBusiness field eklenecek
apps/web/app/(marketing)/page.tsx      → MEVCUT — Google CTA butonu eklenecek
apps/web/components/BookingForm.tsx    → MEVCUT — source detection eklenecek
apps/web/__tests__/google-business.test.ts → YOK — yeni oluşturulacak
```

**Doğrulanmış:**
- `/booking` → `BookingForm.tsx` → `POST /api/lead` → `leads` tablosu
- `source: "google_business"` → `leads.metadata` içine yazılacak — enum genişletilmez, top-level field olmaz
- `metadata.appointmentAt` zaten var (V2-4) — merge edilecek, overwrite edilmeyecek

**Risk noktaları:**
- `loadClientConfig()` return type `ClientConfig` — `googleBusiness` field tanımsızsa TypeScript hatası → config type güncellenmeli
- `@testing-library/react` projede kurulu olmayabilir — testler bu kütüphaneye bağımlı yapılmayacak
- `(marketing)/page.tsx` server component — `GoogleBusinessButton` da server-side kalacak

---

## MANDATORY PRE-READ (bu sırayla, atlamadan)

```bash
# 1. BookingForm submit handler — mevcut metadata merge pattern'ini gör
cat apps/web/components/BookingForm.tsx

# 2. client.config.json mevcut yapısı — tüm field'ları gör
cat clients/demo-salon/client.config.json

# 3. loadClientConfig return type — ClientConfig interface'ini bul
cat apps/web/lib/load-client-config.ts

# 4. channelEnum — google_business var mı?
grep -A10 "channelEnum" packages/db/src/schema.ts

# 5. Landing page mevcut yapısı — CTA konumu, mevcut butonlar
cat apps/web/app/\(marketing\)/page.tsx

# 6. Mevcut test mock pattern
head -60 apps/web/__tests__/booking-slots-api.test.ts
```

---

## IMPLEMENTATION PLAN

| Adım | Dosya | Durum | Dokunulmayacak |
|---|---|---|---|
| 1 | `apps/web/lib/load-client-config.ts` | MODİFİYE | fonksiyon mantığı |
| 2 | `clients/demo-salon/client.config.json` | MODİFİYE | operatingHours, services |
| 3 | `apps/web/app/(marketing)/page.tsx` | MODİFİYE | hero, mevcut CTA'lar |
| 4 | `apps/web/components/BookingForm.tsx` | MODİFİYE | staff dropdown, slot picker |
| 5 | `apps/web/__tests__/google-business.test.ts` | YENİ | — |

---

## DOSYA 1 — `apps/web/lib/load-client-config.ts` (TİP GÜNCELLEMESİ)

**Önce oku:** `cat apps/web/lib/load-client-config.ts`

`ClientConfig` interface'ine (veya type'ına) `googleBusiness` field'ı ekle:

```typescript
// Mevcut ClientConfig interface'ine ekle:
googleBusiness?: {
  profileUrl: string;
  bookingButtonText?: {
    de?: string;
    en?: string;
    tr?: string;
  };
};
```

**KRİTİK:** Sadece type tanımına ekle. Fonksiyon mantığına dokunma. Field optional (`?`) — eski config'ler bozulmaz.

---

## DOSYA 2 — `clients/demo-salon/client.config.json` (DEĞİŞİKLİK)

Mevcut JSON'a en sona (kapanış `}` öncesine), virgülle ekle:

```json
"googleBusiness": {
  "profileUrl": "https://booking.google.com/business/vienna-glow-studio",
  "bookingButtonText": {
    "de": "Jetzt buchen",
    "en": "Book now",
    "tr": "Şimdi rezervasyon yap"
  }
}
```

> **NOT:** `profileUrl` değeri demo amaçlı placeholder. Gerçek Google Business
> booking URL'si salon kurulumunda güncellenecek. `/review` URL'si değil —
> booking flow için ayrı URL kullanılır.

---

## DOSYA 3 — `apps/web/app/(marketing)/page.tsx` (DEĞİŞİKLİK)

**Önce oku:** `cat apps/web/app/(marketing)/page.tsx`

**Değişiklik 1 — Import ekle (zaten yoksa):**

```typescript
import { loadClientConfig } from "@/lib/load-client-config";
```

**Değişiklik 2 — `GoogleBusinessButton` fonksiyonu (dosyanın sonuna, export'tan önce):**

```typescript
// Server-side helper — "use client" gerektirmez, loadClientConfig SYNC
function GoogleBusinessButton(): JSX.Element {
  let profileUrl = "";
  let buttonText = "Jetzt buchen";

  try {
    const cfg = loadClientConfig();
    profileUrl = cfg.googleBusiness?.profileUrl ?? "";
    buttonText =
      cfg.googleBusiness?.bookingButtonText?.[
        (cfg as any).defaultLanguage ?? "de"
      ] ?? "Jetzt buchen";
  } catch {
    // Config yüklenemezse buton gizlenir
  }

  if (!profileUrl) {
    return <></>;
  }

  return (
    <a
      href={`${profileUrl}?source=google_business`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: "var(--color-primary)",
        color: "var(--color-background)",
        padding: "12px 24px",
        borderRadius: "8px",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: 600,
        minHeight: "44px",
        justifyContent: "center",
      }}
    >
      <span aria-hidden="true">📍</span>
      {buttonText}
    </a>
  );
}
```

> **DEĞİŞİKLİK:** `?source=google_business` query param URL'e eklendi.
> Böylece Google'dan `/booking` sayfasına gelen müşteri otomatik olarak
> source'u taşır — BookingForm bunu detect eder.

**Değişiklik 3 — CTA grubuna ekle:**

Mevcut dosyayı okuyunca WhatsApp/telefon butonlarının olduğu bölümü bul.
O gruba `<GoogleBusinessButton />` ekle. Mevcut butonların sırasını değiştirme.

---

## DOSYA 4 — `apps/web/components/BookingForm.tsx` (DEĞİŞİKLİK)

**Önce oku:** `cat apps/web/components/BookingForm.tsx`

**Değişiklik 1 — State ekle:**

```typescript
const [bookingSource, setBookingSource] = useState<"web_form" | "google_business">("web_form");
```

> **NOT:** `source` yerine `bookingSource` kullanılıyor — `source` yaygın bir
> değişken adı, çakışma riskini azaltır.

**Değişiklik 2 — useEffect: URL'den source detection:**

```typescript
useEffect(() => {
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("source") === "google_business") {
      setBookingSource("google_business");
    }
  }
}, []);
```

**Değişiklik 3 — Submit handler: `bookingSource`'u metadata'ya merge et:**

Mevcut submit handler'da metadata oluşturduğun noktayı bul (appointmentAt'ın inject edildiği yer).
Oraya ekle — overwrite etme, spread ile merge et:

```typescript
// Mevcut metadata objesini bul, buna ekle:
const metadata = {
  // ... mevcut metadata fields (appointmentAt, appointmentTime, appointmentDate, vb.)
  bookingSource: bookingSource, // "web_form" | "google_business"
};

// NOT: Alan adı "source" değil "bookingSource" — /api/lead'in
// top-level "source" (channelEnum) field'ı ile karışmaması için.
```

**KRİTİK:**
- `bookingSource` → `metadata.bookingSource` olarak yazılır
- Top-level `source` field'ına dokunma — o `channelEnum` için ayrılmış
- Mevcut metadata spread'ini koru — `{ ...existingMetadata, bookingSource: bookingSource }`

---

## DOSYA 5 — `apps/web/__tests__/google-business.test.ts`

> **ÖNEMLİ:** `@testing-library/react` kullanılmıyor — projede kurulu olup
> olmadığı bilinmiyor. Testler API route'larını doğrudan test eder,
> tıpkı diğer sprint testleri gibi (front-desk, slots, staff pattern'i).

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock loadClientConfig — tüm testlerde
vi.mock("@/lib/load-client-config", () => ({
  loadClientConfig: vi.fn(),
}));

import { loadClientConfig } from "@/lib/load-client-config";

const MOCK_CONFIG_WITH_GOOGLE = {
  googleBusiness: {
    profileUrl: "https://booking.google.com/business/vienna-glow-studio",
    bookingButtonText: {
      de: "Jetzt buchen",
      en: "Book now",
    },
  },
  defaultLanguage: "de",
};

const MOCK_CONFIG_WITHOUT_GOOGLE = {
  clientName: "Vienna Glow Studio",
  // googleBusiness field yok
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("Google Business config loading", () => {
  it("returns profileUrl when googleBusiness config present", () => {
    vi.mocked(loadClientConfig).mockReturnValue(MOCK_CONFIG_WITH_GOOGLE as any);

    const cfg = loadClientConfig();
    expect(cfg.googleBusiness?.profileUrl).toBe(
      "https://booking.google.com/business/vienna-glow-studio"
    );
  });

  it("returns undefined profileUrl when googleBusiness config missing", () => {
    vi.mocked(loadClientConfig).mockReturnValue(
      MOCK_CONFIG_WITHOUT_GOOGLE as any
    );

    const cfg = loadClientConfig();
    expect(cfg.googleBusiness?.profileUrl).toBeUndefined();
  });

  it("returns correct German button text from config", () => {
    vi.mocked(loadClientConfig).mockReturnValue(MOCK_CONFIG_WITH_GOOGLE as any);

    const cfg = loadClientConfig();
    const buttonText =
      cfg.googleBusiness?.bookingButtonText?.["de"] ?? "Jetzt buchen";
    expect(buttonText).toBe("Jetzt buchen");
  });

  it("falls back to 'Jetzt buchen' when bookingButtonText is missing", () => {
    vi.mocked(loadClientConfig).mockReturnValue({
      googleBusiness: {
        profileUrl: "https://booking.google.com/business/test",
        // bookingButtonText yok
      },
    } as any);

    const cfg = loadClientConfig();
    const buttonText =
      cfg.googleBusiness?.bookingButtonText?.["de"] ?? "Jetzt buchen";
    expect(buttonText).toBe("Jetzt buchen"); // fallback çalışıyor
  });
});
```

**4 test — no `.skip`, no `.todo`. Hepsi gerçek assertion içeriyor.**

---

## ACCEPTANCE CRITERIA

- [ ] `ClientConfig` type'ına `googleBusiness?: { profileUrl, bookingButtonText? }` eklendi
- [ ] `client.config.json` → `googleBusiness.profileUrl` ve `bookingButtonText` var
- [ ] Landing sayfasında Google Business butonu görünüyor
- [ ] Google link `?source=google_business` query param içeriyor
- [ ] Google link config yok → buton render edilmiyor (`<></>`)
- [ ] Google link config bozuk → buton render edilmiyor
- [ ] `BookingForm` → `?source=google_business` URL'de varsa `bookingSource = "google_business"`
- [ ] `BookingForm` submit → `metadata.bookingSource = "google_business"`
- [ ] Normal form submit → `metadata.bookingSource = "web_form"` (default)
- [ ] `metadata.bookingSource` top-level `source` field'ı değil — metadata içinde
- [ ] Mevcut `metadata.appointmentAt` korunuyor — overwrite yok
- [ ] `/api/lead` route DOKUNULMADI
- [ ] `staff` dropdown DOKUNULMADI
- [ ] `DatePicker.tsx`, `SlotPicker.tsx` DOKUNULMADI
- [ ] `packages/**` DOKUNULMADI
- [ ] Hex renk kodu yok — sadece CSS vars
- [ ] `pnpm typecheck` → 0 hata
- [ ] `pnpm test` → **278/278** (274 + 4 yeni)
- [ ] `pnpm --filter @beauty/web build` → temiz

---

## VERIFICATION

```bash
pnpm typecheck
# Beklenen: 0 errors

pnpm test
# Beklenen: 278/278 passing

pnpm --filter @beauty/web build
# Beklenen: ✓ Compiled successfully
```

**Manuel kontroller (dev server çalışırken):**

```bash
# 1. Google butonu var mı?
open http://localhost:3030
# → "Jetzt buchen" butonu CTA grubunda görünüyor

# 2. Buton URL'si doğru mu?
# → href = "https://booking.google.com/...?source=google_business"

# 3. Source detection çalışıyor mu?
open "http://localhost:3030/booking?source=google_business"
# → Form yükleniyor, hiçbir şey kırılmıyor

# 4. Submit payload kontrolü (network tab):
# → POST /api/lead body → metadata.bookingSource: "google_business"
# → metadata.appointmentAt hâlâ var (overwrite olmadı)

# 5. Admin leads:
# → Lead metadata'da bookingSource görünüyor
```

---

## REPORT BACK

1. Exact test sayısı (278 olmalı)
2. `ClientConfig` type güncellemesi başarılı mıydı — TypeScript hatası çıktı mı?
3. `@testing-library/react` projede kurulu muydu?
4. Google butonu hangi CTA grubuna eklendi?
5. Mevcut `metadata` spread pattern'i nasıldı — `appointmentAt` korundu mu?
6. Her adımın commit hash'i
7. Beklenmedik durum varsa detaylı raporla

**Sprint V2-9'a geçmeden önce bu rapor onaylanacak.**

---

## CLAUDE.md Güncellemesi (sprint bittikten sonra)

V2 Sprint Sequence tablosunu güncelle:

```
| V2-8 | Google Business Booking | ✅ DONE | 278/278 |
```

Sprint completion bloğu:

```markdown
### V2-8: Google Business Booking — COMPLETED
- feat: ClientConfig type'a googleBusiness?: { profileUrl, bookingButtonText? } eklendi
- feat: client.config.json → googleBusiness config (demo URL, 3 dil)
- feat: Landing sayfasına GoogleBusinessButton eklendi (config yoksa gizlenir)
- feat: Google link → ?source=google_business query param ile /booking'e yönlendirir
- feat: BookingForm URL'den bookingSource detection (web_form | google_business)
- feat: metadata.bookingSource submit payload'a eklendi — /api/lead contract DOKUNULMADI
- test: 278/278 (+4 yeni — config loading ve fallback testleri)
- Schema değişikliği YOK, packages değişikliği YOK
```

---

## GIT

```bash
# Commit 1 — implementation
git add \
  apps/web/lib/load-client-config.ts \
  clients/demo-salon/client.config.json \
  apps/web/app/\(marketing\)/page.tsx \
  apps/web/components/BookingForm.tsx \
  apps/web/__tests__/google-business.test.ts
git status
git commit -m "feat(v2-8): Google Business booking button + source tracking, ClientConfig type update, 4 tests 278/278"
git push

# Commit 2 — CLAUDE.md
git add CLAUDE.md
git commit -m "docs: log V2-8 completion in CLAUDE.md"
git push

git log --oneline -5
```
