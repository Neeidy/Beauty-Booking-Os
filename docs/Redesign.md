# BEAUTY BOOKING OS — DESIGN MIGRATION (ADIM ADIM, ONAY GEREKTİREN)

## ÇALIŞMA KURALI — EN ÖNEMLİ

Her adımı tamamladıktan sonra **önce push et, sonra dur ve rapor yaz**:

```
pnpm typecheck          ← 0 hata olana kadar geçme
git add [dosyalar]
git commit -m "[mesaj]"
git push origin main    ← her adımda push — canlı görülmesi için
```

Sonra şu formatı kullan:

─────────────────────────────────────
✅ ADIM [N] TAMAMLANDI — ONAY BEKLİYOR
Değiştirilen dosyalar:
  - [dosya yolu]
Silinen içerik: [ne silindi]
Eklenen içerik: [ne eklendi]
pnpm typecheck: [PASS / FAIL — X hata]
Notlar: [sapma varsa gerekçe]
Devam etmemi onaylar mısın?
─────────────────────────────────────

Onay gelmeden bir sonraki adıma KESİNLİKLE geçme.
Hata varsa düzelt, tekrar typecheck çalıştır, sonra sor.

---

## BAŞLAMADAN ÖNCE — PRE-READ (atlatma, hepsini oku)

Aşağıdaki dosyaları sırayla oku. Dosya yoksa not al, devam et — dur ve hata verme.

```bash
cat "docs/Beauty Os Design/assets/tokens.css"
cat "docs/Beauty Os Design/assets/admin.css"
cat "docs/Beauty Os Design/assets/admin-v2.css"
cat "docs/Beauty Os Design/assets/booking.css"
cat "docs/Beauty Os Design/assets/landing.css"
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
cat "docs/Beauty Os Design/review-thanks.html"
cat "docs/Beauty Os Design/gdpr-consent.html"
cat "docs/Beauty Os Design/gdpr-delete.html"
cat "docs/Beauty Os Design/gdpr-export.html"
cat apps/web/app/globals.css
cat apps/web/app/layout.tsx
cat apps/web/tailwind.config.ts
cat apps/web/next.config.ts
cat apps/web/app/admin/layout.tsx
cat apps/web/components/admin/Sidebar.tsx
cat apps/web/components/admin/AdminHeader.tsx
cat apps/web/components/admin/LogViewer.tsx
cat apps/web/app/admin/dashboard/page.tsx
cat apps/web/app/admin/calendar/page.tsx
cat apps/web/app/admin/front-desk/page.tsx
cat apps/web/app/admin/clients/page.tsx
cat "apps/web/app/admin/clients/[identifier]/page.tsx"
cat apps/web/app/admin/waiting-list/page.tsx
cat apps/web/app/admin/staff/page.tsx
cat apps/web/app/admin/rebooking/page.tsx
cat apps/web/app/admin/settings/page.tsx
cat apps/web/app/admin/logs/page.tsx
cat apps/web/app/booking/page.tsx
cat apps/web/app/review-thanks/page.tsx
```

Pre-read bitmeden tek satır kod yazma.

---

## GENEL KURALLAR (tüm adımlarda geçerli)

**YASAK — bunları asla yapma:**
- `packages/**` altındaki hiçbir dosyaya dokunma
- `apps/web/app/api/**` route'larına dokunma
- `BookingForm.tsx` içini değiştirme (wrapper'ı değişebilir)
- `SlotPicker.tsx` ve `DatePicker.tsx` dosyalarına dokunma
- `*.test.ts` / `*.spec.ts` dosyalarına dokunma
- HTML'deki `<script src="assets/shell.js">` ve `shell-init.js` tag'larını ekleme
- CDN `<link>` ve `<script>` tag'larını `.tsx` dosyalarına ekleme (`layout.tsx` hariç)
- Ham hex renk kodu kullanma — her zaman `var(--color-*)` kullan
- Inline style ile renk vermek yerine CSS class kullan (mevcut kodda zaten varsa koruyabilirsin)

**ZORUNLU:**
- `export const dynamic = "force-dynamic"` — mevcut sayfalarda varsa koru
- Tüm mevcut DB query'leri ve fetch çağrıları koru — sadece JSX görsel katmanını değiştir
- Tüm mevcut auth kontrolleri koru
- HTML → TSX dönüşümünde: `class` → `className`, `for` → `htmlFor`, `onclick` → `onClick`
- `<img>` etiketlerini `next/image` `<Image>` ile değiştir (harici URL'ler için domains ekle)
- Her adım sonrası `pnpm typecheck` çalıştır
- Her adım sonrası `git commit` + `git push origin main` at

**ESKİ TASARIM KALMASIN:**
Her sayfanın JSX'i tamamen yeni HTML tasarımına göre yeniden yazılacak. Eski sınıf/yapı korunmayacak — sadece veri mantığı (DB query, state, handler) korunacak.

---

## ADIM 1 — globals.css ve Tailwind Temeli

### 1a. `apps/web/app/globals.css`

Mevcut dosyayı tamamen sil ve yeniden yaz. İçerik kaynağı:

- `docs/Beauty Os Design/assets/tokens.css` → `:root {}` bloğu
- `docs/Beauty Os Design/assets/landing.css` → landing section'ları
- `docs/Beauty Os Design/assets/admin.css` → admin shell
- `docs/Beauty Os Design/assets/admin-v2.css` → admin sayfa stilleri
- `docs/Beauty Os Design/assets/booking.css` → booking form

Dosya yapısı (bu sırayla):

```css
@import "tailwindcss";
@config "../tailwind.config.ts";

/* 1. :root token'ları (tokens.css'ten) */
/* 2. [data-theme="dark"] (tokens.css'ten) */
/* 3. Base stiller (body, h1-h6, a, button) */
/* 4. Shared utilities (.btn, .pill, .section vb.) */
/* 5. Landing stiller (landing.css'ten) */
/* 6. Admin shell stiller (admin.css'ten) */
/* 7. Admin sayfa stiller (admin-v2.css'ten) */
/* 8. Booking stiller (booking.css'ten) */
/* 9. Responsive media queries */
```

**DİKKAT:** Dosya sonuna şunu ekle:

```css
/* ── Legacy aliases — mevcut bileşenler için geriye dönük uyumluluk ── */
:root {
  --color-primary:    var(--color-text);
  --color-secondary:  var(--color-accent);
  --color-background: var(--color-bg);
  --color-error-soft: rgba(239, 68, 68, 0.08);
}
```

### 1b. `apps/web/tailwind.config.ts`

Mevcut `extend.colors` bloğunu oku. Şu key'ler zaten farklı değerlerle tanımlı: `accent`, `text`, `text-muted`, `error`, `surface-*`, `primary`, `secondary` vb.

**Çakışmayı önlemek için:** Mevcut key'lerin değerlerini CSS var'larıyla **güncelle** (üzerine yaz), yeni key'leri ekle. Duplicate key oluşturma.

Sonuç olarak `extend.colors` içinde şu key'ler CSS var'larına işaret etmeli:

```typescript
// Tüm ds- prefixli satırları SİL — artık direkt key'leri kullanıyoruz
// Aşağıdaki key'leri ekle veya mevcut değerlerini güncelle:
"accent":           "var(--color-accent)",
"bg":               "var(--color-bg)",
"bg-surface":       "var(--color-bg-surface)",
"bg-card":          "var(--color-bg-card)",
"border":           "var(--color-border)",
"text":             "var(--color-text)",
"text-muted":       "var(--color-text-muted)",
"text-secondary":   "var(--color-text-secondary)",
"text-faint":       "var(--color-text-faint)",
"purple":           "var(--color-purple)",
"rose":             "var(--color-rose)",
"emerald":          "var(--color-emerald)",
"amber":            "var(--color-amber)",
"cyan":             "var(--color-cyan)",
"error":            "var(--color-error)",
"success":          "var(--color-success)",
"warning":          "var(--color-warning)",
```

MD3 surface token'larını (`surface`, `surface-bright`, `on-surface` vb.) ve `vgs-*` prefixli satırları **SİL** — artık kullanılmıyor.

`primary`, `secondary`, `background` branding key'lerini koru — bunlar `branding.colors.*`'dan geliyor ve `BookingForm.tsx` hâlâ kullanıyor.

### 1c. `apps/web/app/layout.tsx`

`<head>` içine ekle (zaten varsa dokunma — önce kontrol et):

```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
```

### 1d. `apps/web/next.config.ts`

`images.remotePatterns` içinde `images.unsplash.com` ve `lh3.googleusercontent.com` **zaten var**.
Bu adımda `next.config.ts`'e dokunma.

```bash
pnpm typecheck
git add apps/web/app/globals.css apps/web/tailwind.config.ts apps/web/app/layout.tsx
git commit -m "design(step-1): foundation — globals.css, tailwind tokens, fonts"
git push origin main
```

⛔ DUR — ADIM 1 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 2 — Admin Sidebar + AdminHeader Temizliği

### 2a. Önce import taraması yap

```bash
grep -r "AdminHeader" apps/web --include="*.tsx" -l
```

Çıkan her dosyada `AdminHeader` import satırını sil ve varsa kullanımını inline `adm-header` yapısıyla değiştir.

### 2b. `apps/web/components/admin/AdminHeader.tsx` — SİL

```bash
git rm apps/web/components/admin/AdminHeader.tsx
```

### 2c. `apps/web/components/admin/Sidebar.tsx`

**KORU (bunlara dokunma):**
- "use client" direktifi
- `usePathname()` ile aktif state tespiti
- `escalationCount` prop'u ve badge logic'i
- `handleLogout()` fonksiyonu
- Tüm `href` değerleri (`/admin/dashboard`, `/admin/front-desk` vb.)
- `NAV_SECONDARY` items (leads, bookings, escalations)

**YENİDEN YAZ (görsel katman):**
- JSX yapısını `admin.css` / `admin-v2.css`'teki class'larla eşleştir
- `admin-brand`, `admin-brand-name`, `admin-brand-sub`, `admin-divider` class'ları
- `admin-nav`, `admin-nav-item`, `mi` class'ları
- `admin-sidebar-footer` yapısı
- Aktif item: `admin-nav-item active` class'ı (mevcut logic doğru, class ismi koru)

```bash
pnpm typecheck
git add apps/web/components/admin/Sidebar.tsx
git commit -m "design(step-2): admin sidebar update, remove AdminHeader"
git push origin main
```

⛔ DUR — ADIM 2 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 3 — Admin Dashboard

**Dosya:** `apps/web/app/admin/dashboard/page.tsx`
**Kaynak:** `docs/Beauty Os Design/admin-dashboard.html`

**KORU:**
- `export const dynamic = "force-dynamic"` (varsa)
- Mevcut veri fetch mantığını birebir koru — sadece JSX'i güncelle
- TypeScript interface tanımları
- `useEffect`, `useState` hook'ları (varsa)

**YENİDEN YAZ (tüm JSX):**
- `admin-dashboard.html`'deki yapıyı birebir TSX'e çevir
- `<aside class="admin-sidebar">` → **KALDIR** (layout.tsx zaten inject ediyor)
- `<div class="admin-layout">` → **KALDIR** (layout.tsx'de var)
- Başlangıç: `<header className="dash-header">` ile başla
- Stat kartları: `stat-grid` → `stat-card` yapısı
- Appointments tablosu: `appt-table` class'ları
- Leads listesi: `lead-list`, `lead-item` class'ları
- HTML'deki hardcoded değerleri mevcut fetch'ten gelen state'den al
- Veri yoksa `—` göster

```bash
pnpm typecheck
git add apps/web/app/admin/dashboard/
git commit -m "design(step-3): admin dashboard"
git push origin main
```

⛔ DUR — ADIM 3 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 4 — Admin Calendar

**Dosyalar (hepsini güncelle):**
- `apps/web/app/admin/calendar/page.tsx`
- `apps/web/app/admin/calendar/WeeklyCalendar.tsx` ← görsel ağırlık burası
- `apps/web/app/admin/calendar/CalendarCell.tsx` ← randevu kartı görünümü
- `apps/web/components/admin/CalendarTimeIndicator.tsx` ← zaten var, güncelle

**Kaynak:** `docs/Beauty Os Design/admin-calendar.html`

**KORU:**
- `export const dynamic = "force-dynamic"` (`page.tsx`'de)
- `WeeklyCalendar.tsx`'deki tüm navigasyon, tarih hesaplama, fetch logic
- `CalendarCell.tsx`'deki expand/collapse logic
- `CalendarTimeIndicator.tsx`'deki saat hesaplama logic

**YENİDEN YAZ (görsel katman):**
- `page.tsx` → `<aside>` ve `admin-layout` wrapper → **KALDIR**
- `WeeklyCalendar.tsx` → `cal-header`, `cal-scroll`, `cal-grid`, `cal-day-headers`, `cal-body`, `cal-gutter`, `cal-col`, `cal-appt` class yapısı
- `CalendarCell.tsx` → `admin-calendar.html`'deki randevu kart yapısına göre yeniden yaz; `STATUS_COLORS` içindeki ham hex değerleri `var(--color-*)` ile değiştir
- Randevu renk logic'i (WeeklyCalendar'da zaten doğru, koru):
  - nails/gel → `var(--color-purple)`
  - hair → `var(--color-amber)`
  - facial/skin → `var(--color-emerald)`
  - lashes/waxing/brow → `var(--color-rose)`
  - varsayılan → `var(--color-accent)`
- Zaman pozisyonu: `topPx = ((hour - 8) * 60 + minutes) * (96/60)`
- Yükseklik: `heightPx = durationMinutes * (96/60)`

```bash
pnpm typecheck
git add apps/web/app/admin/calendar/ apps/web/components/admin/CalendarTimeIndicator.tsx
git commit -m "design(step-4): admin calendar"
git push origin main
```

⛔ DUR — ADIM 4 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 5 — Admin Front Desk (Kanban)

**Dosyalar (hepsini güncelle):**
- `apps/web/app/admin/front-desk/page.tsx`
- `apps/web/app/admin/front-desk/FrontDeskBoard.tsx` ← kanban mantığı burası
- `apps/web/app/admin/front-desk/BookingCard.tsx` ← kart görünümü burası

**Kaynak:** `docs/Beauty Os Design/admin-front-desk.html`

**KORU:**
- `FrontDeskBoard.tsx`'deki tüm kanban logic (optimistik update, rollback, status mapping)
- `BookingCard.tsx`'deki tüm action handler'ları (`handleAction`, `onStatusChange`)
- API çağrıları (`/api/booking/${bookingId}/status`)
- `export const dynamic` (varsa)

**YENİDEN YAZ (görsel katman):**
- `page.tsx` → `<aside>` ve wrapper → **KALDIR**
- `FrontDeskBoard.tsx` → `kanban`, `kanban-col`, `kanban-col-head`, `kanban-list` class yapısı
- `BookingCard.tsx` → `kanban-card`, `kanban-card-top`, `kanban-name`, `kanban-when`, `kanban-msg`, `kanban-meta`, `kanban-pill`, `kanban-card-foot`, `kanban-act-btns`, `kanban-ico-btn` class yapısı; kaynak badge'leri için `src-web`, `src-google`, `src-phone`, `src-instagram` class'ları ekle

```bash
pnpm typecheck
git add apps/web/app/admin/front-desk/
git commit -m "design(step-5): admin front desk kanban"
git push origin main
```

⛔ DUR — ADIM 5 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 6 — Admin Clients (Liste + Detay)

**Dosyalar:**
- `apps/web/app/admin/clients/page.tsx`
- `apps/web/app/admin/clients/[identifier]/page.tsx`

**Kaynaklar:**
- `docs/Beauty Os Design/admin-clients.html`
- `docs/Beauty Os Design/admin-client-detail.html`

**KORU:**
- DB query'leri, auth, `dynamic` export
- `[identifier]` route parametresi

**YENİDEN YAZ:**
- Liste sayfası → `clients-table`, `client-name-cell`, `client-avatar`, `client-vip` class yapısı
- Detay sayfası → `profile-layout`, `profile-card`, `profile-hero`, `profile-tabs`, timeline yapısı
- `<aside>` ve wrapper → **KALDIR** her iki dosyada da

```bash
pnpm typecheck
git add "apps/web/app/admin/clients/"
git commit -m "design(step-6): admin clients list + detail"
git push origin main
```

⛔ DUR — ADIM 6 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 7 — Admin Waiting List

**Dosyalar:**
- `apps/web/app/admin/waiting-list/page.tsx`
- `apps/web/app/admin/waiting-list/WaitingListView.tsx` ← görsel ağırlık burası

**Kaynak:** `docs/Beauty Os Design/admin-waiting-list.html`

**KORU:** DB query'leri, `dynamic`, auth, tüm action handler'ları.

**YENİDEN YAZ:** `adm-header`, `adm-toolbar`, `clients-table`, `wl-status` class yapısı. `<aside>` ve wrapper → **KALDIR**.

```bash
pnpm typecheck
git add apps/web/app/admin/waiting-list/
git commit -m "design(step-7): admin waiting list"
git push origin main
```

⛔ DUR — ADIM 7 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 8 — Admin Staff

**Dosyalar:**
- `apps/web/app/admin/staff/page.tsx`
- `apps/web/app/admin/staff/StaffManagementView.tsx` ← tüm CRUD burası

**Kaynak:** `docs/Beauty Os Design/admin-staff.html`

**KORU:** Tüm CRUD API çağrıları (`handleAdd`, `handleDelete`, `handleToggleActive`, `handleUpdateServices`, `handleUpdateName`), form state'leri, `StaffCard` sub-component logic.

**YENİDEN YAZ (görsel katman):**
- `staff-grid`, `staff-card`, `staff-card-top`, `staff-avatar`, `toggle` class yapısı
- `StaffCard` içindeki tüm `inline style` renk değerlerini `var(--color-*)` class'larıyla değiştir
- `secondaryButtonStyle`, `inputStyle`, `labelStyle` JS style objelerini CSS class'larıyla değiştir
- `<aside>` ve wrapper → **KALDIR**

```bash
pnpm typecheck
git add apps/web/app/admin/staff/
git commit -m "design(step-8): admin staff"
git push origin main
```

⛔ DUR — ADIM 8 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 9 — Admin Rebooking

**Dosyalar:**
- `apps/web/app/admin/rebooking/page.tsx`
- `apps/web/app/admin/rebooking/RebookingView.tsx` ← tüm logic burası

**Kaynak:** `docs/Beauty Os Design/admin-rebooking.html`

**KORU:** `fetchJobs`, `handleRunNow` fonksiyonları, tüm API çağrıları, `dynamic`.

**YENİDEN YAZ (görsel katman):**
- `rb-stats`, `rb-stat`, `rb-run-btn`, `rb-table`, `rb-job-status` class yapısı
- Tüm `inline style` renk değerlerini `var(--color-*)` ile değiştir
- `<aside>` ve wrapper → **KALDIR**

```bash
pnpm typecheck
git add apps/web/app/admin/rebooking/
git commit -m "design(step-9): admin rebooking"
git push origin main
```

⛔ DUR — ADIM 9 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 10 — Admin Settings

**Dosyalar:**
- `apps/web/app/admin/settings/page.tsx`
- `apps/web/app/admin/settings/SettingsView.tsx` ← tüm logic burası

**Kaynak:** `docs/Beauty Os Design/admin-settings.html`

**KORU:** Tüm ayar kaydetme logic'i, form state'leri, API çağrıları, `dynamic`.

**YENİDEN YAZ:** `settings-layout`, `settings-side`, `settings-side-link`, `settings-section`, `svc-edit-row`, `hours-grid`, `hours-row` class yapısı. `<aside>` ve wrapper → **KALDIR**.

```bash
pnpm typecheck
git add apps/web/app/admin/settings/
git commit -m "design(step-10): admin settings"
git push origin main
```

⛔ DUR — ADIM 10 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 11 — Admin Logs

**Dosyalar:**
- `apps/web/app/admin/logs/page.tsx` ← filter UI burası
- `apps/web/components/admin/LogViewer.tsx` ← log satırları görünümü burası

**Kaynak:** `docs/Beauty Os Design/admin-logs.html`

**KORU:**
- `logs/page.tsx`'deki tüm filter state'leri (`eventType`, `agentName`, `status`, `dateFrom`, `page`), `fetchLogs` logic, pagination
- `LogViewer.tsx`'deki `expandedId` state ve expand/collapse logic
- `EVENT_ICONS`, `STATUS_COLORS` objeleri — sadece hex değerleri `var(--color-*)` ile değiştir

**YENİDEN YAZ (görsel katman):**
- `logs/page.tsx` → `adm-header`, `adm-toolbar`, filter satırı `logs-table` class yapısı; tüm `inline style` renk değerlerini `var(--color-*)` ile değiştir
- `LogViewer.tsx` → `log-level`, `log-agent`, `log-tokens`, `log-row` class yapısı; `STATUS_COLORS` içindeki ham hex değerleri `var(--color-*)` ile değiştir

```bash
pnpm typecheck
git add apps/web/app/admin/logs/ apps/web/components/admin/LogViewer.tsx
git commit -m "design(step-11): admin logs"
git push origin main
```

⛔ DUR — ADIM 11 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 12 — Booking Page

**Dosya:** `apps/web/app/booking/page.tsx`
**Kaynak:** `docs/Beauty Os Design/booking.html`

**KESİNLİKLE DOKUNMA:**
- `BookingForm.tsx` dosyasının içi
- `SlotPicker.tsx`
- `DatePicker.tsx`

**SADECE WRAPPER'I GÜNCELLE:**
- Üst bar: `booking-topbar`, `booking-topbar-inner`, `booking-back`, `site-brand` class'ları
- Sayfa body: `booking-wrap` class'ı (arka plan rengi)
- Kart: `booking-card` class'ı (max-width, shadow, border-radius)
- `<BookingForm />` aynen kalsın, sadece etrafındaki wrapper değişiyor

```bash
pnpm typecheck
git add apps/web/app/booking/
git commit -m "design(step-12): booking page wrapper"
git push origin main
```

⛔ DUR — ADIM 12 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 13 — Ek Sayfalar

### 13a. `apps/web/app/review-thanks/page.tsx`
Kaynak: `docs/Beauty Os Design/review-thanks.html`
Varsa güncelle, yoksa oluştur. Statik içerik yeterli.

### 13b. `apps/web/app/datenschutz/page.tsx`
Kaynak: `docs/Beauty Os Design/gdpr-consent.html`
Varsa güncelle, yoksa oluştur.

### 13c. `apps/web/app/gdpr/delete/page.tsx`
Kaynak: `docs/Beauty Os Design/gdpr-delete.html`
Varsa güncelle, yoksa oluştur.

### 13d. `apps/web/app/gdpr/export/page.tsx`
Kaynak: `docs/Beauty Os Design/gdpr-export.html`
Varsa güncelle, yoksa oluştur.

```bash
pnpm typecheck
git add apps/web/app/review-thanks/ apps/web/app/datenschutz/ apps/web/app/gdpr/
git commit -m "design(step-13): public pages — review-thanks, GDPR"
git push origin main
```

⛔ DUR — ADIM 13 RAPORU YAZ VE ONAY BEKLE.

---

## ADIM 14 — Final Validation

```bash
pnpm typecheck
# Beklenen: 0 hata

pnpm test
# Beklenen: 306/306 passing — hiçbir test bozulmamalı

pnpm --filter web build
# Beklenen: temiz build, 0 hata
# NOT: filter adı çalışmazsa "pnpm build" veya "cd apps/web && pnpm build" dene

git log --oneline -15
# Son 14 commit görünmeli
```

Çıktıları olduğu gibi raporla.

```bash
git push origin main
```

⛔ DUR — ADIM 14 RAPORU YAZ VE ONAY BEKLE.

---

## ÖZET — Ne değişti, neden

| Adım | Değişiklik | Neden |
|---|---|---|
| ADIM 1b | `ds-` prefixli satırlar silindi, key'ler direkt güncellendi | Eski `ds-accent` vb. artık gerekmiyor; duplicate key engellendi |
| ADIM 1d | next.config.ts'e dokunulmuyor | `unsplash` ve `lh3` zaten mevcut — duplicate oluşurdu |
| ADIM 2 | grep taraması eklendi, sonra silme | `AdminHeader` import eden dosyalar önce tespit edilmeli |
| ADIM 4 | `WeeklyCalendar.tsx` ve `CalendarCell.tsx` eklendi | Görsel katman bu dosyalarda — `page.tsx` sadece wrapper |
| ADIM 5 | `BookingCard.tsx` eklendi | Kanban kart görünümü bu dosyada |
| ADIM 7 | `WaitingListView.tsx` eklendi | Görsel katman bu dosyada |
| ADIM 8 | `StaffManagementView.tsx` detaylandırıldı | JS style objeleri CSS class'larıyla değiştirilmeli |
| ADIM 9 | `RebookingView.tsx` detaylandırıldı | Inline style'lar CSS class'larıyla değiştirilmeli |
| ADIM 11 | `LogViewer.tsx` eklendi | Log satırı görünümü bu dosyada; hex renkler var |