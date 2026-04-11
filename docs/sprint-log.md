# Beauty Booking OS — Sprint Log

Historical record of completed sprints. Active project state is in CLAUDE.md.

---

## Sprints 1–8 (Foundation → Production Ready)

### Sprint 1 (Days 1-3): Foundation
**Goal**: Config validates, DB exists, one lead can be saved.
```
Tasks:
1. Initialize monorepo (pnpm + turborepo)
2. Create Zod schemas for all config files
3. Create demo-salon config files
4. Set up Supabase project + DB schema
5. Create config loader with validation
6. Build lead intake endpoint (POST /api/lead)
7. Verify: Submit form → lead appears in DB

Acceptance: A lead can be created via API and stored in Supabase.
```

### Sprint 2 (Days 4-7): AI Agents Core
**Goal**: Intake Agent classifies intent. Booking Agent proposes next step.
```
Tasks:
1. Build Claude API client wrapper with retry + logging
2. Implement Intake Agent module + prompt
3. Implement Booking Agent module + prompt
4. Build Orchestrator routing logic
5. Wire: POST /api/lead/:id/classify → Intake Agent
6. Wire: POST /api/lead/:id/next-step → Booking Agent
7. Write agent output tests with mocked Claude

Acceptance: Lead → classified intent JSON → booking next-step JSON. All logged.
```

### Sprint 3 (Days 8-14): Booking Flow + UI
**Goal**: Customer can fill form and trigger full booking flow.
```
Tasks:
1. Build landing page (Next.js, responsive, salon branding)
2. Build booking form with GDPR checkboxes
3. Build thank-you page
4. Wire form submission → lead → classify → booking flow
5. Create booking record in DB
6. Send confirmation message (email or template)
7. Build GDPR consent recording

Acceptance: User fills form → booking created → confirmation sent → GDPR logged.
```

### Sprint 4 (Days 15-18): Reminders & Follow-up
**Goal**: Automated reminders work. Follow-up agent handles responses.
```
Tasks:
1. Build automation_jobs scheduler
2. Implement Follow-up Agent + prompt
3. Create reminder_24h and reminder_3h job types
4. Build job runner endpoint (POST /api/jobs/reminders/run)
5. Implement message templates with config injection
6. Test: Booking → 24h reminder created → executes correctly

Acceptance: Booking triggers reminder jobs that execute and send messages on time.
```

### Sprint 5 (Days 19-22): Admin Panel + Observability
**Goal**: Operator can see leads, bookings, and logs.
```
Tasks:
1. Build admin authentication (Supabase Auth)
2. Build admin dashboard with key stats
3. Build lead list page with filters
4. Build booking list page with status
5. Build event log viewer
6. Implement cost tracking display
7. Build human escalation queue view

Acceptance: Admin can view all system activity and take action on escalated items.
```

### Sprint 6 (Days 23-25): Recovery + Content Agent
**Goal**: Cancellation recovery works. Content Agent writes in brand voice.
```
Tasks:
1. Implement cancellation recovery flow
2. Build recovery job scheduler
3. Implement Content Agent + prompt
4. Wire Content Agent to Follow-up Agent for message generation
5. Test: Cancel → wait → recovery message → response handling

Acceptance: Cancelled booking triggers recovery flow that generates on-brand messages.
```

### Sprint 7 (Days 26-28): Hardening + Security + Documentation ✅ COMPLETED
**Goal**: Production-hardened system with full security, GDPR compliance, and documentation.
```
Completed:
1. Rate limiting (shared/utils/rate-limiter.ts) + input sanitization (sanitizer.ts) — middleware enforces on all public + admin routes
2. GDPR endpoints: GET /api/gdpr/export/:leadId, DELETE /api/gdpr/data/:leadId — dep-injected, fully tested
3. Webhook signature verification (HMAC-SHA256) for WhatsApp + Instagram + CSP/CORS headers in next.config.ts
4. Health check GET /api/health + alerter.ts with configurable thresholds (failedJobs, escalationQueue)
5. Data retention POST /api/jobs/retention with dry_run mode — anonymizes leads per dataRetentionDays config
6. docs/deployment-checklist.md, docs/client-onboarding.md, docs/api-reference.md written

Test counts at sprint close:
  - shared: 69 tests (rate-limiter 7, sanitizer 16, webhook-verify 13, alerter 6, anthropic 12, retry 5, lead-types 10)
  - core: 68 tests (gdpr 8+6, clone-validation 14, cancellation-recovery 8, booking-status 14, job-runner 16, e2e 2)
  - agents (unchanged): orchestrator 13, intake 10, booking 11, content 14, followup 12 = 60
  Total: 197 tests

Acceptance: GDPR flows tested, webhook signatures verified, health endpoint live, docs complete.
```

### Sprint 8 (Days 29-30): Go-Live Preparation + Final Validation ✅ COMPLETED
**Goal**: Production artifacts complete. System validated and documented for first real client.
```
Completed:
1. vercel.json with cron jobs (reminders hourly, recovery daily, retention weekly)
2. SQL migrations: 001_initial_schema.sql + 002_rls_policies.sql (RLS on all tables)
3. .env.example: complete with all Sprint 7+8 additions (NEXT_PUBLIC_DEMO_CLIENT_ID, NEXT_PUBLIC_DEFAULT_CLIENT_SLUG, WHATSAPP_APP_SECRET, INSTAGRAM_APP_SECRET)
4. scripts/setup-production.md: step-by-step Supabase + Vercel + cron + WhatsApp setup
5. scripts/smoke-test.ts: 12-step full-chain validation (health, lead, booking, reminders, logs, GDPR export+delete, retention dry-run)
6. Fixed BookingForm.tsx hard-coded DEMO_CLIENT_ID → NEXT_PUBLIC_DEMO_CLIENT_ID env var
7. CLAUDE.md final update with project status

Final test count: 197/197 passing (unchanged — no regressions)
```

---

## Post-Sprint 8: Build & Admin Panel Fixes

### Post-Sprint 8: Build & Admin Panel Fixes ✅ COMPLETED (2026-04-07)
**Goal**: Resolve build failures and admin panel issues discovered during local health check.
```
Completed:
1. packages/core, orchestrator, intake-agent, booking-agent package.json: added "exports" + "types" fields
   → Root cause: webpack transpilePackages requires explicit exports, not just "main"
2. apps/web/package.json: added missing workspace deps (@beauty-booking/core, agents, drizzle-orm)
   → Routes were importing from packages not symlinked by pnpm
3. classify/next-step routes: replaced deep relative paths (../../../../packages/agents/...) with package imports
4. gdpr data/export routes: fixed Next.js 15 params Promise<{}> signature + await params
5. admin routes (bookings/escalations/leads/logs): fixed Drizzle count() destructuring for exactOptionalPropertyTypes
6. content-agent/writer.ts + email/client.ts: fixed optional property spreads (exactOptionalPropertyTypes)
7. next.config.ts: commented out output:"standalone" locally (Windows EPERM symlink limitation)
8. apps/web/__tests__/health.test.ts: added smoke test so pnpm test exits 0 for web package
9. admin login: hard navigation (window.location.href) after cookie set
10. admin settings page: fixed import path (@beauty-booking/config)
11. admin sidebar: fixed broken icon character

Final test count: 213/213 passing (+16: web smoke 2, plus config package counted twice previously)
Build: webpack compiles clean, all TypeScript errors resolved
```

---

## V2 Sprint Log

### V2-1: Admin Front Desk Kanban — COMPLETED
- New page: /admin/front-desk (3-column kanban)
- New endpoint: GET /api/admin/front-desk
- Columns: Onaylanmadı / Onaylandı / Tamamlandı
- Status updates via existing PATCH /api/booking/[id]/status
- Tests: 231/231 (225 + 6 new)
- No schema changes, no package/ changes

### V2-2: Customer Profile + History — COMPLETED
- New endpoint: GET /api/admin/clients/[identifier]
- New page: /admin/clients/[identifier]
- "Profili Gör" link added to leads list
- Multi-lead aggregation by phone (same customer, multiple leads over time)
- Tests: 239/239 (231 + 8 new)
- No schema changes, no packages/ changes

### V2-3: Admin Weekly Calendar — COMPLETED
- New endpoint: GET /api/admin/calendar
- New page: /admin/calendar (7-day grid, URL-synced navigation)
- No external calendar libraries — pure CSS Grid
- Mobile: vertical day stack
- Staff dimension deferred to V2-6
- Tests: 247/247 (239 + 8 new)
- No schema changes, no packages/ changes

### V2-4: Live Slot Selection — COMPLETED
- New public endpoint: GET /api/booking/slots (no auth, customer-facing)
- New components: DatePicker (custom month grid), SlotPicker (live fetch)
- BookingForm: replaced free-text preferredDate/preferredTime with visual pickers
- Selected slot stored in leads.metadata.appointmentAt (backend unchanged)
- Step size = min(30, serviceDuration)
- Honors minAdvanceBookingHours from client.config.json
- Past slots and cancelled/no_show bookings do not block availability
- Business hours: Mo-Sa 09-18, Sun 10-16 (hardcoded; V2-5 will move to config)
- Race condition / slot reservation deferred to post-V2-9 dedicated sprint
- Tests: 255/255 (247 + 8 new)
- No schema changes, no packages/ changes

### V2-5: Waiting List (Warteliste) — COMPLETED
- New public endpoint: POST /api/waiting-list (no auth, customer-facing)
- New admin endpoint: GET /api/admin/waiting-list (auth required)
- New admin page: /admin/waiting-list
- Waiting list entries stored as leads with metadata.waitingList: true
- No new DB table, no migration — reuses leads table JSONB metadata
- SlotPicker: shows "Warteliste beitreten" UI when all slots unavailable
- WaitingListForm: inline form in SlotPicker, no nested <form> (button onClick pattern)
- Duplicate registration guard: same email+service+date → alreadyRegistered: true
- Status route hook: cancel/no_show triggers metadata.waitingList_notified: true
- Admin view shows: date, customer, service, notified status, registered timestamp
- No email notification in this sprint — admin handles outreach manually
- Tests: 265/265 (255 + 10 new)
- No packages/** changes, no DB schema changes

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
- operatingHours key formatı: "09:00" (colon) — parseHHMM her iki formatı da işliyor
- toDateString helper: m parametresi 0-indexed (JS Date.getMonth() convention)
