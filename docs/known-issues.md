# Known Issues & Deferred Fixes

Status as of the i18n sprint completion. The app is stable (327 tests green, live healthy on Vercel, demo-salon). The items below are intentionally DEFERRED — not fixed — to avoid risk to the working demo.

## Deferred functional bugs

### 1. Slot availability is per-salon, not per-staff
- **Where:** `apps/web/app/api/booking/slots/route.ts` and the reservation conflict check in `apps/web/app/api/booking/reservations/route.ts`.
- **Behavior:** A time slot is marked unavailable if ANY booking/active-reservation overlaps it for the whole salon (`clientId`). No per-staff dimension, so the salon shows a time as "full" after a single booking even if other staff are free. `maxBookingsPerSlot` is also not honored (capacity effectively 1).
- **Root cause:** `bookings` has no `staffId` column — the requested staff is free text in `bookings.notes`. `slot_reservations` likewise has no `staffId`.
- **Why deferred:** A correct fix needs a `staffId` column on `bookings` (+ `slot_reservations`) — a DB schema change, which is FROZEN. A notes-parsing approximation would be fragile and risks the booking flow.
- **Recommended fix (when schema unfreezes):** add `staffId` to `bookings`/`slot_reservations`, pass selected staff to the slots + reservation endpoints, scope availability/conflict checks by staff.

### 2. Reservation expires while the user fills later booking steps ("Rezervasyon süresi doldu")
- **Where:** `apps/web/lib/slot-reservations.ts` (`ACTIVE_TTL_MINUTES = 10`), `apps/web/components/SlotPicker.tsx`, `apps/web/app/api/booking/submit/route.ts` (409 on expired reservation).
- **Behavior:** The 10-minute hold's countdown runs only while SlotPicker is mounted (step 2). After advancing to steps 3-4 the countdown stops and there is no keepalive, but the server-side reservation still expires at 10 minutes — so a slow user is rejected at submit with 409 after filling the whole form. (DB exclusion constraint separately prevents true double-booking.)
- **Why deferred:** The reservation flow is the most fragile, revenue-critical path; not touched before the demo. Normal-speed users (<10 min) are unaffected.
- **Recommended fix (low risk):** bump `ACTIVE_TTL_MINUTES` (10 → 25-30), a single constant. Robust alternative: a keepalive that extends the reservation while the form is open + surfacing remaining time on later steps.

## Minor / cosmetic findings (none demo-breaking)
- BookingForm `useEffect` reading `?source=google_business` has no `[]` dependency array (runs every render; harmless but should be `[]`).
- Dashboard "Wochenumsatz" stat is a hardcoded "—" placeholder, never populated.
- operatingHours format inconsistency: file configs use `"HH:MM"`, the admin SettingsView writes `"HHmm"`; `/api/booking/slots` normalizes both at read.

## Security audit — deferred / accepted items

A full read-only security audit was run. Critical and high-severity fixes were applied
(leaked DB credential redacted from `.env.example`; `next` → 15.5.19 and `postcss` → 8.5.15,
closing 9 high + several moderate CVEs). The items below were intentionally NOT changed.

### drizzle-orm SQL-injection advisory (GHSA, `<0.45.2`) — accepted, not exploitable here
- **Advisory:** improperly escaped quoted SQL identifiers; only triggered when attacker-controlled
  input reaches identifier-constructing APIs (`sql.identifier()`, `.as()`, `sql.raw()`, raw `` sql`` ``).
- **Why not patched:** the codebase uses NONE of those with user input — every query is parameterized
  via `eq()/and()/lt()` etc. Verified by grep across `apps/web` + `packages/db`: zero matches. The
  vulnerable code path does not exist here, so real-world risk is zero.
- **Why deferred:** the fix requires drizzle `0.38 → 0.45`, a major bump, and `drizzle-orm` is declared
  in the FROZEN `packages/db` as well as `apps/web`. A major ORM upgrade risks the 327-test suite and
  the live booking flow for a vulnerability that is not reachable.
- **Recommended (when packages/db unfreezes):** bump `drizzle-orm` to `>=0.45.2` in both
  `apps/web/package.json` and `packages/db/package.json`, then full typecheck + test + booking-flow QA.

### Transitive `postcss` advisory via `next`
- One moderate postcss XSS advisory remains via `apps/web > next > postcss` (Next's bundled copy, not
  our direct dep, which is already 8.5.15). It is build-time only and not reachable with user input.
  Resolves when `next` next bumps its bundled postcss.

### Auth / infra hardening (tracked separately, see audit report)
- Admin auth stores the raw `ADMIN_SECRET` as the session cookie value and compares with `===`
  (not `timingSafeEqual`); a default fallback secret exists if env is unset.
- `/api/internal/log` is unauthenticated (relies on infra not exposing it; Vercel exposes all `/api/*`).
- Rate limiter is in-memory per-isolate (multiplied across Vercel instances); `getClientIp` trusts
  `x-forwarded-for`.
- No global CSP/HSTS/X-Frame-Options headers.
- These are hardening improvements, not active breaches, and are being addressed incrementally.

## Deferred feature (not a bug)
- **Multi-tenant landing content:** landing marketing content (service cards, team, testimonials, gallery) lives in the i18n dictionary — bilingual but shared across tenants. Per-tenant needs a 2-dimensional (tenant × locale) approach (e.g. `clients/{slug}/landing.json`) plus authoring bilingual content for a second salon. `elegant-nails-vienna` has no `staff.json`. Deferred together with onboarding a real second salon.
