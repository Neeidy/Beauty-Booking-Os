# BEAUTY BOOKING OS — CLAUDE CODE CONTEXT
## Active project state. Historical sprint records → docs/sprint-log.md

---

## SYSTEM STATUS

- **Tests:** 278/278 passing (V2-8 complete)
- **Sprints 1–8:** Production ready (213 tests at launch)
- **V2 Sprints:** V2-1 ✅ V2-2 ✅ V2-3 ✅ V2-4 ✅ V2-5 ✅ V2-6 ✅ V2-7 ✅ V2-8 ✅
- **Next:** V2-9 Google Reviews Automation
- **packages/\*\*:** FROZEN — no changes during V2 frontend workstream
- **DB schema:** No changes since Sprint 8 — no new migrations until V2-11

---

## ACTIVE CONSTRAINTS (read before every task)

```
packages/**           FROZEN — never touch during V2 sprints
DB schema             NO changes, no migrations (until V2-11)
/api/lead route       DO NOT MODIFY
/api/lead contract    top-level appointmentAt NEVER accepted — metadata only
Status enum           no_show (underscore) — never "noshow"
AI model              "claude-sonnet-4-20250514" — exact string, always
CSS vars              ONLY: --color-background, --color-primary,
                      --color-secondary, --color-accent,
                      --color-text, --color-text-muted
Timezone helpers      formatToParts + Date.UTC — toLocaleString FORBIDDEN
dynamic export        export const dynamic = "force-dynamic" on every route
services field        services.serviceName (not services.name — verified V2-4)
localStorage          NEVER use
External libs         No datepicker/calendar libraries
appointmentAt         In leads.metadata.appointmentAt — NOT top-level field
```

---

## VERIFIED IMPORT PATTERNS

```typescript
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, bookings, services, leads } from "@beauty-booking/db";
import { eq, and, gte, lte, ne, sql } from "drizzle-orm";
import { loadClientConfig } from "@/lib/load-client-config";
import {
  formatDateVienna, formatTimeVienna, getViennaOffsetMinutes,
  viennaWallClockToUTC, toDateString, getViennaWeekdayKey,
} from "@/lib/vienna-helpers";

const CLIENT_ID = process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";
```

> **NOT:** `clients` tablosu `@beauty-booking/db`'den export edilip edilmediği
> doğrulanmamıştır — kullanmadan önce `packages/db/src/schema.ts`'i oku.

---

## CRITICAL FUNCTION SIGNATURES

```typescript
// SYNC — no await, no async
loadClientConfig(slug?: string): ClientConfig

// SYNC — no await. On error returns []. Never throws. (V2-7'de eklenecek)
getActiveStaff(): StaffMember[]   // lib/load-staff-config.ts

// toDateString: m is 0-indexed (JS Date.getMonth() convention)
toDateString(y: number, m: number, d: number): string

// Vienna weekday key → "monday" | "tuesday" | ... | "sunday"
getViennaWeekdayKey(dateStr: string): string
```

---

## OPERATING HOURS CONFIG FORMAT

```json
"operatingHours": {
  "monday":   { "open": "0900", "close": "1900" },
  "thursday": { "open": "0900", "close": "2100" },
  "saturday": { "open": "1000", "close": "1700" },
  "sunday":   null
}
```
Keys: lowercase English weekday names.
Value: `{ open: string; close: string } | null` (null = closed).
Parse: `"0900"` → hour=9, minute=0 (first 2 chars = hour, last 2 = minute).
Config fail → fallback 09:00–18:00, never crash.

---

## V2-7 STAFF CONFIG FORMAT (henüz oluşturulmadı)

```json
// clients/demo-salon/staff.json
{
  "staff": [
    {
      "id": "staff_1",
      "name": "Anna",
      "title": "Nageldesignerin",
      "active": true
    }
  ]
}
```
- DB tablosu yok — config-driven
- `lib/load-staff-config.ts`: SYNC, hata → `[]` döner, form devam eder
- Public endpoint: id/name/title only (no internal fields)
- Admin endpoint: full data
- BookingForm dropdown: fetch fail → dropdown gizlenir, form çalışmaya devam eder
- `/api/lead` contract DEĞİŞMEZ — staff seçimi `notes` alanına yazılır:
  `"Mitarbeiter-Wunsch: [name]"`
- Staff slot blocking yok (DB gerektirir) — sadece preference capture

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router, TypeScript) |
| Database | Supabase (PostgreSQL) + Drizzle ORM |
| Queue | BullMQ + Redis |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Validation | Zod (all agent outputs must pass Zod schema) |
| Email | Resend |
| Monorepo | pnpm workspaces + Turborepo |
| Testing | Vitest + Playwright |
| Deploy | Vercel + Supabase |

---

## PROJECT STRUCTURE (key paths only)

```
apps/web/
  app/
    api/
      lead/route.ts              ← DO NOT MODIFY
      booking/[id]/status/       ← PATCH booking status
      booking/slots/             ← GET public slot availability (V2-4/V2-6)
      admin/front-desk/          ← V2-1
      admin/waiting-list/        ← V2-5
      admin/staff/               ← V2-7 eklenecek (auth required)
      waiting-list/              ← V2-5 public POST
      public/staff/              ← V2-7 eklenecek (no auth, id/name/title only)
    admin/
      front-desk/                ← V2-1 kanban
      clients/[identifier]/      ← V2-2 customer profile
      calendar/                  ← V2-3 weekly view
      waiting-list/              ← V2-5 admin view
      settings/                  ← V2-6 read-only config view
      staff/                     ← V2-7 eklenecek (team kartları)
  components/
    BookingForm.tsx              ← V2-4 complete. V2-7 adds staff dropdown.
    DatePicker.tsx               ← DO NOT MODIFY
    SlotPicker.tsx               ← V2-5/V2-6 complete
    admin/Sidebar.tsx
  lib/
    admin-auth.ts
    load-client-config.ts        ← SYNC, readFileSync
    load-staff-config.ts         ← V2-7 eklenecek (SYNC, error → [])
    vienna-helpers.ts            ← V2-6, 6 exports
    booking-form-schema.ts

packages/                        ← FROZEN
  db/src/schema.ts               ← No changes
  agents/                        ← No changes
  core/                          ← No changes
  config/                        ← No changes

clients/
  demo-salon/
    client.config.json
    services.json
    branding.json
    staff.json                   ← V2-7 eklenecek
```

---

## DATABASE TABLES (key fields)

**leads:** id, clientId, source, customerName, customerEmail, customerPhone,
rawMessage, intent, intentConfidence, status, language, gdprConsentAt,
gdprConsentMethod, metadata (JSONB), createdAt, updatedAt

**bookings:** id, clientId, leadId, serviceId, customerName, customerContact,
appointmentAt, durationMinutes, status, reminderSentAt (JSONB), notes,
cancelledAt, cancelReason, createdAt, updatedAt

**services:** id, clientId, serviceName, category, durationMinutes, priceEur,
description, active, sortOrder, createdAt

**Waiting list** → leads tablosunda metadata ile:
`metadata.waitingList: true, requestedDate, requestedServiceId,
waitingList_notified, waitingList_registeredAt`

**Staff** → V2-7'de config-only. DB tablosu yok. Preference → `bookings.notes`

**Booking status enum:** pending | confirmed | reminded | completed |
no_show | cancelled | rescheduled

**Lead status enum:** new | contacted | qualified | booking_started |
booked | lost | spam

---

## AI AGENT RULES

- Model: `"claude-sonnet-4-20250514"` — hardcoded in every API call
- Every agent output must pass a Zod schema — no raw JSON.parse
- Every agent call must write to event_logs with token count + duration
- Confidence < 0.5 → needs_human_review, never auto-act
- Max 2 unanswered follow-ups then stop — never spam
- 4 mandatory prompt sections: ROLE / OUTPUT FORMAT / RULES / ESCALATION

---

## SECURITY RULES (never bypass)

- Real credentials: gitignored .env only — never in .env.example or commits
- Every new table needs Supabase RLS policy
- Every webhook handler must verify HMAC-SHA256
- GDPR: any new customer-data code must route through consent/export/deletion pipeline
- Rate limiting active on all public endpoints
- Admin auth required on all /api/admin/* routes (first line of every handler)

---

## GDPR (Austrian law — non-negotiable)

- Explicit opt-in, no pre-checked boxes
- 3 separate consent fields: data_processing (required), reminders (required), marketing (optional)
- Deletion anonymizes — does not hard-delete
- Auto-anonymization after 2 years (730 days)
- Export to JSON on request
- gdprContactEmail in every client config

---

## V2 SPRINT SEQUENCE

| Sprint | Feature | Status | Tests |
|---|---|---|---|
| V2-1 | Admin Front Desk Kanban | ✅ DONE | 231/231 |
| V2-2 | Customer Profile + History | ✅ DONE | 239/239 |
| V2-3 | Admin Weekly Calendar | ✅ DONE | 247/247 |
| V2-4 | Live Slot Selection (customer) | ✅ DONE | 255/255 |
| V2-5 | Waiting List (Warteliste) | ✅ DONE | 265/265 |
| V2-6 | Business Hours Config + Bug Fixes | ✅ DONE | 270/270 |
| V2-7 | Staff Profilleri (Config-Driven) | ✅ DONE | 274/274 |
| V2-8 | Google Business Booking | ✅ DONE | 278/278 |
| V2-9 | Google Reviews Automation | ⏳ | — |
| V2-10 | Rebooking Reminder | ⏳ | — |
| V2-11 | Slot Reservation + Locking | ⏳ (post V2-10) | — |

---

## V2-7: Staff Profilleri (Config-Driven) — COMPLETED
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
- fix: load-staff-config path uses resolve(cwd, "..", "..", "clients", ...) — loadClientConfig pattern
- test: 274/274 (+4 yeni)
- Yapılmadı: Staff slot blocking (DB gerektirir → V2-11 veya sonrası)
- Schema değişikliği YOK, packages değişikliği YOK

---

## V2-8: Google Business Booking — COMPLETED
- feat: ClientConfig type'a googleBusiness?: { profileUrl, bookingButtonText? } eklendi
- feat: client.config.json → googleBusiness config (demo URL, 3 dil)
- feat: CTASection.tsx'e GoogleBusinessButton eklendi (config yoksa gizlenir)
- feat: Google link → ?source=google_business query param ile /booking'e yönlendirir
- feat: BookingForm URL'den bookingSource detection (web_form | google_business)
- feat: metadata.bookingSource submit payload'a eklendi — /api/lead contract DOKUNULMADI
- fix: GoogleBusinessButton CTASection.tsx'e eklendi — (marketing)/page.tsx mevcut değildi
- test: 278/278 (+4 yeni — config loading ve fallback testleri)
- Schema değişikliği YOK, packages değişikliği YOK

---

## DEBUGGING FIRST STOP

Any runtime issue → check `event_logs` table + admin `/logs` page first.
Second stop: `pnpm typecheck` → `pnpm test`.
Never commit with failing tests.

---

## SESSION END CHECKLIST

Every Claude Code session must end with:
1. `pnpm typecheck` → 0 errors
2. `pnpm test` → all passing (report exact count)
3. Append sprint completion block to CLAUDE.md
4. `git add . && git commit -m "..." && git push`