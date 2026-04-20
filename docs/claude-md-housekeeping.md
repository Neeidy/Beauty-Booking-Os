CLAUDE.md HOUSEKEEPING — do exactly these steps in order. Do not skip any step.

---

STEP 1 — Read current state

```bash
wc -l CLAUDE.md
cat CLAUDE.md
```

Read the entire file. Understand what is in it before touching anything.

---

STEP 2 — Create docs/sprint-log.md

Create the file `docs/sprint-log.md` with the following content extracted from CLAUDE.md:

- The entire "BUILD ORDER (Sprint Plan)" section (Sprint 1 through Sprint 8 completion notes)
- The "Post-Sprint 8: Build & Admin Panel Fixes" section
- All V2 sprint completion logs (### V2-1 through ### V2-6 COMPLETED blocks)

This file is the historical record. Format it as:

```markdown
# Beauty Booking OS — Sprint Log

Historical record of completed sprints. Active project state is in CLAUDE.md.

---

## Sprints 1–8 (Foundation → Production Ready)

[paste Sprint 1–8 content here verbatim]

---

## Post-Sprint 8: Build & Admin Panel Fixes

[paste that section verbatim]

---

## V2 Sprint Log

[paste all V2-1 through V2-5 COMPLETED blocks verbatim — V2-6 is in progress, skip it]
```

Commit this file first before touching CLAUDE.md:
```bash
git add docs/sprint-log.md
git commit -m "docs: create sprint-log.md with historical sprint records"
git push
```

---

STEP 3 — Rewrite CLAUDE.md

Replace the entire contents of CLAUDE.md with exactly the following. Do not add, remove, or modify anything — write it character for character:

```markdown
# BEAUTY BOOKING OS — CLAUDE CODE CONTEXT
## Active project state. Historical sprint records → docs/sprint-log.md

---

## SYSTEM STATUS

- **Tests:** 265/265 passing (V2-5 complete)
- **Sprints 1–8:** Production ready (213 tests at launch)
- **V2 Sprints:** V2-1 ✅ V2-2 ✅ V2-3 ✅ V2-4 ✅ V2-5 ✅ V2-6 🔄 IN PROGRESS
- **Next:** V2-7 Staff Profilleri (Config-Driven)
- **packages/\*\*:** FROZEN — no changes during V2 frontend workstream
- **DB schema:** No changes since Sprint 8 — no new migrations

---

## ACTIVE CONSTRAINTS (read before every task)

```
packages/**           FROZEN — never touch during V2 sprints
DB schema             NO changes, no migrations
/api/lead route       DO NOT MODIFY
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

---

## CRITICAL FUNCTION SIGNATURES

```typescript
// SYNC — no await, no async
loadClientConfig(slug?: string): ClientConfig

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
      admin/front-desk/          ← V2-1
      admin/waiting-list/        ← V2-5
      waiting-list/              ← V2-5 public POST
    admin/
      front-desk/                ← V2-1 kanban
      clients/[identifier]/      ← V2-2 customer profile
      calendar/                  ← V2-3 weekly view
      waiting-list/              ← V2-5 admin view
      settings/                  ← V2-6 read-only config view
  components/
    BookingForm.tsx              ← V2-4 complete. V2-7 will add staff dropdown.
    DatePicker.tsx               ← DO NOT MODIFY
    SlotPicker.tsx               ← V2-5/V2-6 complete
    admin/Sidebar.tsx
  lib/
    admin-auth.ts
    load-client-config.ts        ← SYNC, readFileSync
    vienna-helpers.ts            ← V2-6, 6 exports
    booking-form-schema.ts

packages/                        ← FROZEN
  db/src/schema.ts               ← No changes
  agents/                        ← No changes
  core/                          ← No changes
  config/                        ← No changes

clients/
  demo-salon/
    client.config.json           ← operatingHours lives here
    services.json
    branding.json
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

**Waiting list entries** are stored as leads with:
`metadata.waitingList: true, metadata.requestedDate, metadata.requestedServiceId,
metadata.waitingList_notified, metadata.waitingList_registeredAt`

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
- 3 separate consent fields: data_processing (required), reminders (required for reminders), marketing (optional)
- Deletion anonymizes — does not hard-delete
- Auto-anonymization after 2 years (730 days)
- Export to JSON on request
- gdprContactEmail in every client config

---

## V2 SPRINT SEQUENCE

| Sprint | Feature | Status |
|---|---|---|
| V2-1 | Admin Front Desk Kanban | ✅ DONE |
| V2-2 | Customer Profile + History | ✅ DONE |
| V2-3 | Admin Weekly Calendar | ✅ DONE |
| V2-4 | Live Slot Selection (customer) | ✅ DONE |
| V2-5 | Waiting List (Warteliste) | ✅ DONE |
| V2-6 | Business Hours Config + Bug Fixes | 🔄 IN PROGRESS |
| V2-7 | Staff Profilleri (Config-Driven) | ⏳ NEXT |
| V2-8 | Google Business Booking | ⏳ |
| V2-9 | Google Reviews Automation | ⏳ |
| V2-10 | Rebooking Reminder | ⏳ |
| V2-11 | Slot Reservation + Locking | ⏳ (post V2-10) |

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
```

---

STEP 4 — Verify the rewrite

```bash
wc -l CLAUDE.md
# Expected: ~130 lines (not more than 150)

# Confirm the old bloat is gone:
grep -c "Sprint 1\|Sprint 2\|Sprint 3" CLAUDE.md
# Expected: 0 (sprint history is now in docs/sprint-log.md)

# Confirm key constraints are present:
grep "no_show" CLAUDE.md
grep "force-dynamic" CLAUDE.md
grep "services.serviceName" CLAUDE.md
grep "vienna-helpers" CLAUDE.md
grep "270/270" CLAUDE.md
# All should return at least 1 match
```

---

STEP 5 — Commit

```bash
git add CLAUDE.md
git commit -m "refactor(docs): trim CLAUDE.md to ~130 lines, sprint history → docs/sprint-log.md"
git push
git log --oneline -5
```

---

STEP 6 — Report back

Report:
1. CLAUDE.md line count before and after
2. docs/sprint-log.md line count
3. Output of the grep verification checks (step 4)
4. Both commit hashes
5. Any section that was ambiguous to place (sprint-log vs CLAUDE.md)
