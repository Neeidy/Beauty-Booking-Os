# Beauty Booking OS — Design Implementation Command
## docs/Beauty Os Design → Production Codebase

---

## BAŞLAMADAN ÖNCE — TAM PRE-READ (atlatma)

```bash
# 1. Design token sistemi
cat "docs/Beauty Os Design/assets/tokens.css"
cat "docs/Beauty Os Design/assets/landing.css"
cat "docs/Beauty Os Design/assets/admin.css"
cat "docs/Beauty Os Design/assets/admin-v2.css"
cat "docs/Beauty Os Design/assets/booking.css"
cat "docs/Beauty Os Design/assets/admin-sidebar.html"

# 2. Tüm HTML sayfalar
cat "docs/Beauty Os Design/index.html"
cat "docs/Beauty Os Design/booking.html"
cat "docs/Beauty Os Design/admin-dashboard.html"
cat "docs/Beauty Os Design/admin-calendar.html"
cat "docs/Beauty Os Design/admin-front-desk.html"
cat "docs/Beauty Os Design/admin-clients.html"
cat "docs/Beauty Os Design/admin-client-detail.html"
cat "docs/Beauty Os Design/admin-waiting-list.html"
cat "docs/Beauty Os Design/admin-staff.html"
cat "docs/Beauty Os Design/admin-rebooking.html"
cat "docs/Beauty Os Design/admin-settings.html"
cat "docs/Beauty Os Design/admin-logs.html"
cat "docs/Beauty Os Design/waiting-list.html"
cat "docs/Beauty Os Design/gdpr-consent.html"
cat "docs/Beauty Os Design/gdpr-delete.html"
cat "docs/Beauty Os Design/gdpr-export.html"
cat "docs/Beauty Os Design/review-thanks.html"

# 3. Mevcut codebase
cat apps/web/app/layout.tsx
cat apps/web/tailwind.config.ts
cat apps/web/app/globals.css
cat apps/web/next.config.ts
ls apps/web/app/
ls apps/web/app/admin/
cat apps/web/app/page.tsx 2>/dev/null || cat "apps/web/app/(marketing)/page.tsx" 2>/dev/null
cat apps/web/app/admin/layout.tsx
cat apps/web/app/admin/calendar/page.tsx
cat apps/web/app/admin/dashboard/page.tsx 2>/dev/null || echo "NO DASHBOARD PAGE"
cat apps/web/app/admin/front-desk/page.tsx
cat "apps/web/app/admin/clients/[identifier]/page.tsx"
cat apps/web/app/admin/waiting-list/page.tsx
cat apps/web/app/admin/staff/page.tsx
cat apps/web/app/admin/rebooking/page.tsx
cat apps/web/app/admin/settings/page.tsx
cat apps/web/app/admin/logs/page.tsx 2>/dev/null || echo "NO LOGS PAGE"
cat apps/web/components/admin/Sidebar.tsx
cat apps/web/app/booking/page.tsx
```

Pre-read tamamlanmadan tek satır kod yazma.

---

## TEMEL KURALLAR (tüm adımlarda geçerli)

```
YASAK:
- packages/**
- apps/web/app/api/**
- BookingForm.tsx (içi)
- SlotPicker.tsx (içi)
- DatePicker.tsx (tüm dosya)
- *.test.ts / *.spec.ts
- Ham #hex kodu — CSS var kullan
- CDN script/link tagları — kaldır
- shell.js / shell-init.js — kullanma

ZORUNLU:
- export const dynamic = "force-dynamic" → mevcut route'larda koru
- Tüm mevcut DB query'leri koru
- Tüm mevcut auth check'leri koru
- class → className, for → htmlFor, onclick → onClick
- <img> harici URL → next/image <Image>
- Her adım sonrası: pnpm typecheck
- Her adım sonrası: git commit
```

---

## ADIM 1 — FOUNDATION

### 1a. apps/web/app/globals.css
tokens.css dosyasındaki TÜM CSS variable tanımlarını globals.css'e ekle.
Mevcut variable'ları silme — ekle veya güncelle.
tokens.css içeriğini :root {} bloğu olarak yapıştır.

### 1b. apps/web/tailwind.config.ts
tokens.css'teki --color-* variable'larını Tailwind utility olarak ekle:
```typescript
extend: {
  colors: {
    // tokens.css'teki her --color-X için:
    "accent": "var(--color-accent)",
    "primary": "var(--color-primary)",
    // ... tüm color token'lar
  },
  fontFamily: {
    sans: ["Inter", "sans-serif"],
    body: ["Inter", "sans-serif"],
  },
}
```

### 1c. apps/web/app/layout.tsx
<head>'e ekle (yoksa):
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

### 1d. apps/web/next.config.ts
images.remotePatterns'e ekle:
- hostname: "images.unsplash.com"
- hostname: "lh3.googleusercontent.com"

```bash
pnpm typecheck
git add apps/web/app/globals.css apps/web/tailwind.config.ts apps/web/app/layout.tsx apps/web/next.config.ts
git commit -m "design(step-1): foundation — CSS tokens, tailwind config, fonts, image domains"
```

---

## ADIM 2 — ADMIN SIDEBAR

File: apps/web/components/admin/Sidebar.tsx
Kaynak: docs/Beauty Os Design/assets/admin-sidebar.html

KORU:
- Tüm mevcut href değerlerini
- usePathname() aktif state logic'ini
- Tüm nav item'ları

DEĞİŞTİR: Sadece görsel katman.

Design'dan al:
- Genişlik: 220px
- Aktif item: sol border var(--color-accent), tinted arka plan
- İnaktif: muted text, hover efekti
- Emoji ikonlar (admin-sidebar.html'deki ikonları birebir kullan)

```bash
pnpm typecheck
git add apps/web/components/admin/Sidebar.tsx
git commit -m "design(step-2): admin sidebar visual update"
```

---

## ADIM 3 — LANDING PAGE

Kaynak: docs/Beauty Os Design/index.html + assets/landing.css

landing.css içeriğini globals.css'e ekle.

Dosya yapısı:
```
apps/web/components/sections/
  HeroSection.tsx
  ServicesSection.tsx       (id="leistungen")
  GalleryTeamSection.tsx    (id="galerie" + id="team")
  TestimonialsSection.tsx
  StandortSection.tsx       (id="kontakt")
  CtaFooterSection.tsx
```

Landing page dosyası (mevcut page.tsx):
```tsx
<HeroSection />
<ServicesSection />
<GalleryTeamSection />
<TestimonialsSection />
<StandortSection />
<CtaFooterSection />
```

Link mapping:
- "Jetzt Termin buchen" → href="/booking"
- Nav linkleri → "#leistungen", "#galerie", "#team", "#kontakt"
- Footer: Datenschutz → "/datenschutz", Impressum → "/impressum"

Tüm section'lar server component (no "use client").
Unsplash URL'leri → next/image <Image> ile.

```bash
pnpm typecheck
git add apps/web/app/ apps/web/components/sections/
git commit -m "design(step-3): landing page — all sections"
```

---

## ADIM 4 — BOOKING PAGE WRAPPER

File: apps/web/app/booking/page.tsx
Kaynak: docs/Beauty Os Design/booking.html + assets/booking.css

KRITIK: BookingForm.tsx, SlotPicker.tsx, DatePicker.tsx'e dokunma.
Sadece sayfa wrapper'ını güncelle:
- Sayfa arka planı
- Üst bar ("← Zurück" → href="/")
- Kart container (max-width, shadow, border-radius)
- <BookingForm /> aynen kalsın

booking.css → globals.css'e ekle.

```bash
pnpm typecheck
git add apps/web/app/booking/page.tsx apps/web/app/globals.css
git commit -m "design(step-4): booking page visual wrapper"
```

---

## ADIM 5 — ADMIN DASHBOARD

File: apps/web/app/admin/dashboard/page.tsx
Kaynak: docs/Beauty Os Design/admin-dashboard.html

KORU: DB query'leri, auth, dynamic export.
SİL: Design HTML'deki sidebar.
DEĞİŞTİR: Görsel katman.

Eğer dashboard page yoksa oluştur (auth + bugünün randevuları + yeni lead sayısı).

Status badge renkleri (tokens.css'ten al):
- confirmed → var(--color-success) tinted
- pending → var(--color-warning) tinted
- cancelled/no_show → var(--color-error) tinted

```bash
pnpm typecheck
git add apps/web/app/admin/dashboard/
git commit -m "design(step-5): admin dashboard visual update"
```

---

## ADIM 6 — ADMIN CALENDAR

File: apps/web/app/admin/calendar/page.tsx
Kaynak: docs/Beauty Os Design/admin-calendar.html + assets/admin.css

KORU: dynamic, DB query'leri, haftalık navigasyon.
SİL: Sidebar.
DEĞİŞTİR: Görsel katman.

admin.css → globals.css'e ekle.

Randevu zaman formülü:
```typescript
const topPx = ((hour - 8) * 60 + minutes) * (96 / 60)
const heightPx = durationMinutes * (96 / 60)
```

Renk logic (tokens.css'ten exact var isimlerini al):
- nails → purple token
- hair → amber token
- skin/facial → emerald token
- lashes/waxing → rose token
- default → accent token

Current time indicator → CalendarTimeIndicator.tsx ("use client" sadece bu)

```bash
pnpm typecheck
git add apps/web/app/admin/calendar/ apps/web/components/admin/CalendarTimeIndicator.tsx
git commit -m "design(step-6): admin calendar visual update"
```

---

## ADIM 7 — ADMIN FRONT DESK

File: apps/web/app/admin/front-desk/page.tsx
Kaynak: docs/Beauty Os Design/admin-front-desk.html

KORU: Kanban logic, API calls, status update.
DEĞİŞTİR: Görsel katman.

```bash
pnpm typecheck
git add apps/web/app/admin/front-desk/
git commit -m "design(step-7): admin front desk visual update"
```

---

## ADIM 8 — ADMIN CLIENTS

Files:
- apps/web/app/admin/clients/page.tsx (varsa)
- apps/web/app/admin/clients/[identifier]/page.tsx

Kaynaklar: admin-clients.html + admin-client-detail.html

KORU: DB query'leri, auth, dynamic.
DEĞİŞTİR: Görsel katman.

```bash
pnpm typecheck
git add "apps/web/app/admin/clients/"
git commit -m "design(step-8): admin clients visual update"
```

---

## ADIM 9 — ADMIN WAITING LIST

File: apps/web/app/admin/waiting-list/page.tsx
Kaynak: docs/Beauty Os Design/admin-waiting-list.html

KORU: Tüm mevcut logic.
DEĞİŞTİR: Görsel katman.

```bash
pnpm typecheck
git add apps/web/app/admin/waiting-list/
git commit -m "design(step-9): admin waiting list visual update"
```

---

## ADIM 10 — ADMIN STAFF

File: apps/web/app/admin/staff/page.tsx + StaffManagementView.tsx
Kaynak: docs/Beauty Os Design/admin-staff.html

KORU: Tüm V2-13 CRUD logic.
DEĞİŞTİR: StaffManagementView.tsx görsel katmanı.

```bash
pnpm typecheck
git add apps/web/app/admin/staff/
git commit -m "design(step-10): admin staff visual update"
```

---

## ADIM 11 — ADMIN REBOOKING

File: apps/web/app/admin/rebooking/page.tsx + RebookingView.tsx
Kaynak: docs/Beauty Os Design/admin-rebooking.html

KORU: Tüm V2-10 logic.
DEĞİŞTİR: RebookingView.tsx görsel katmanı.

```bash
pnpm typecheck
git add apps/web/app/admin/rebooking/
git commit -m "design(step-11): admin rebooking visual update"
```

---

## ADIM 12 — ADMIN SETTINGS

File: apps/web/app/admin/settings/page.tsx + SettingsView.tsx
Kaynak: docs/Beauty Os Design/admin-settings.html

KORU: Tüm V2-12 edit logic.
DEĞİŞTİR: SettingsView.tsx görsel katmanı.

```bash
pnpm typecheck
git add apps/web/app/admin/settings/
git commit -m "design(step-12): admin settings visual update"
```

---

## ADIM 13 — ADMIN LOGS

File: apps/web/app/admin/logs/page.tsx
Kaynak: docs/Beauty Os Design/admin-logs.html

Eğer logs page yoksa oluştur:
- auth check
- event_logs tablosundan son 100 kayıt (getDb import)
- Design HTML'i görsel olarak uygula

```bash
pnpm typecheck
git add apps/web/app/admin/logs/
git commit -m "design(step-13): admin logs page"
```

---

## ADIM 14 — PUBLIC EK SAYFALAR

### 14a. GDPR Sayfaları
Yoksa oluştur:
- apps/web/app/datenschutz/page.tsx → gdpr-consent.html
- apps/web/app/gdpr/delete/page.tsx → gdpr-delete.html
- apps/web/app/gdpr/export/page.tsx → gdpr-export.html

Statik içerik + temel layout yeterli.

### 14b. Review Thanks
apps/web/app/review-thanks/page.tsx → review-thanks.html (varsa)

### 14c. Public Waiting List
apps/web/app/waiting-list/page.tsx → waiting-list.html (varsa — yoksa skip)

```bash
pnpm typecheck
git add apps/web/app/
git commit -m "design(step-14): public pages — GDPR, review thanks"
```

---

## ADIM 15 — FINAL VALIDATION

```bash
pnpm typecheck
# Expected: 0 errors

pnpm test
# Expected: 306/306

pnpm --filter @beauty/web build
# Expected: clean build

git push origin main
git log --oneline -10
```

---

## HER ADIM RAPOR FORMATI

```
ADIM: [numara + isim]
DOSYALAR: [değiştirilen dosyalar]
TYPECHECK: [pass / fail + hata sayısı]
YENİ DOSYALAR: [yeni oluşturulanlar]
SAPMA: [design'dan farklı yapılan + gerekçe]
```
