# BEAUTY BOOKING OS — CLAUDE CODE CONTEXT
## Active project state. Historical sprint records → docs/sprint-log.md

---

## SYSTEM STATUS

- **Tests:** 306/306 passing (V2-13 complete)
- **Sprints 1–8:** Production ready (213 tests at launch)
- **V2 Sprints:** V2-1 ✅ V2-2 ✅ V2-3 ✅ V2-4 ✅ V2-5 ✅ V2-6 ✅ V2-7 ✅ V2-8 ✅ V2-9 ✅ V2-10 ✅ V2-11 ✅ V2-12 ✅ V2-13 ✅
- **Next:** Frontend Redesign Workstream
- **packages/db:** schema.ts updated for V2-11 (slot_reservations table). FROZEN again.
- **DB schema:** Migration 003_slot_reservations.sql applied — slot_reservations table live
- Known issues & deferred fixes → docs/known-issues.md

---

## ACTIVE CONSTRAINTS (read before every task)

```
Frontend redesign reference: docs/Beauty Os Design/ — this is the ONLY source of truth
for all CSS classes, colors, layout, and component structure. Never invent styles.

packages/**           FROZEN — never touch
DB schema             FROZEN — slot_reservations migration applied, no further changes
/api/lead route       DO NOT MODIFY
/api/lead contract    top-level appointmentAt NEVER accepted — metadata only
Status enum           no_show (underscore) — never "noshow"
AI model              "claude-sonnet-4-20250514" — exact string, always
CSS vars              use tokens.css variables (--color-bg, --color-accent, --color-text etc.)
                      — see docs/Beauty Os Design/assets/tokens.css
                      Branding vars injected at runtime use --brand-* prefix (never --color-*)
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

// SYNC — no await. On error returns []. Never throws.
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
      booking/slots/             ← GET public slot availability
      booking/reservations/      ← POST/DELETE slot reservation
      booking/submit/            ← POST booking submit
      admin/front-desk/          ← kanban
      admin/waiting-list/        ← waiting list
      admin/staff/               ← auth required, full CRUD
      admin/services/            ← services list + patch
      admin/config/              ← config snapshot patch
      admin/rebooking/           ← rebooking job admin
      waiting-list/              ← public POST
      public/staff/              ← no auth, id/name/title only
    admin/
      front-desk/                ← kanban
      clients/[identifier]/      ← customer profile
      calendar/                  ← weekly view
      waiting-list/              ← admin view
      settings/                  ← config edit
      staff/                     ← team management
      rebooking/                 ← rebooking jobs
  components/
    BookingForm.tsx              ← slot + staff + reservation flow
    DatePicker.tsx               ← DO NOT MODIFY
    SlotPicker.tsx               ← reservation countdown + keepalive
    admin/Sidebar.tsx
  lib/
    admin-auth.ts
    load-client-config.ts        ← SYNC, readFileSync
    load-staff-config.ts         ← SYNC, error → []
    slot-reservations.ts         ← 5 helpers + TTL constants
    vienna-helpers.ts            ← 6 exports
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
    staff.json
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

**Staff** → config-only (clients/demo-salon/staff.json + configSnapshot). DB tablosu yok. Preference → `bookings.notes`

**slot_reservations:** id, clientId, serviceId, reservationToken (unique), slotStart (TIMESTAMPTZ),
slotEnd (TIMESTAMPTZ), status (reservation_status enum), expiresAt, submittedAt, releasedAt,
leadId, createdAt. Exclusion constraint: no overlap for active/submitted rows (btree_gist).
Drizzle export: `slotReservations`, `reservationStatusEnum` from `@beauty-booking/db`

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
