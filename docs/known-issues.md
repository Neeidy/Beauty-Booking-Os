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

## Security audit — outcomes

A full read-only security audit was run, then findings were remediated in order with
verification at each step (typecheck + 327 tests + prod build + live checks; no regression).

**Fixed & deployed:**
- **Leaked DB credential** redacted from `.env.example` (was a real Supabase URL+password,
  committed in 360d2ec). Operator confirmed the DB password was already rotated, so the
  leaked value is dead; HEAD is clean. History scrub was deemed unnecessary (dead credential,
  rewrite risk > benefit).
- **CVEs:** `next` ^15.1.3 → ^15.5.19 (closed 9 HIGH: middleware/proxy bypass, SSRF, DoS, XSS)
  and `postcss` ^8.5.8 → ^8.5.15 (closed </style> XSS).
- **Admin auth timing side-channel:** all `ADMIN_SECRET` comparisons are now constant-time
  (`safeEqual` via SHA-256 + `timingSafeEqual` in Node routes; inline `timingSafeStrEqual`
  XOR in the Edge middleware). Live-verified: wrong/no auth → 401, valid → 200.
- **`/api/internal/log`** now requires the `x-internal-log` shared secret (middleware sends it);
  public callers get 403. Live-verified.
- **Security headers** were found ALREADY present and strong (CSP, HSTS, X-Frame-Options DENY,
  nosniff, Referrer-Policy, Permissions-Policy) in `apps/web/next.config.ts` — no change needed.

The items below were intentionally NOT changed (accepted / deferred).

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

### Rate limiting & client-IP (deferred — needs external infra)
- The middleware rate limiter uses an in-memory `Map`, which on Vercel is **per-isolate** —
  each serverless/edge instance counts independently, so the effective limit is multiplied and
  trivially bypassed at scale. `getClientIp` also trusts the first `x-forwarded-for` value, which
  a client can spoof to rotate the limiter key or poison logs. Admin login inherits the (looser)
  admin limit, so brute-force protection is weak.
- **Why deferred:** the correct fix is a Redis-backed limiter (e.g. Upstash) — a new external
  dependency + account + env vars that touches the booking/lead hot path. Not added without an
  explicit infra decision. The code already leaves a `REDIS_URL` placeholder for this.
- **Recommended:** add `@upstash/ratelimit` with a shared store, key on Vercel's trusted IP
  (`x-vercel-forwarded-for` / `request.ip`), and give `/api/admin/auth/login` its own strict limit.

### Admin session model (deferred — larger change, low live risk)
- The session cookie value IS the raw `ADMIN_SECRET` (no per-session token / rotation), and a
  default fallback secret (`change-me-in-production`) exists if `ADMIN_SECRET` is unset. Live env
  HAS `ADMIN_SECRET` set (verified), so the fallback is not a live risk; the timing side-channel
  on the comparison is already fixed (see above).
- **Recommended:** issue a signed random session token instead of echoing the secret, and hard-fail
  when `ADMIN_SECRET` is unset rather than falling back. Deferred because it invalidates existing
  sessions and needs coordinated login/logout/middleware changes.

### CSP `script-src 'unsafe-inline'` (accepted)
- The production CSP allows `'unsafe-inline'` for scripts. Removing it requires nonces/hashes and
  risks breaking Next.js inline bootstrap + the branding `<style>` injection. Low marginal benefit;
  left as-is.

## Deferred feature (not a bug)
- **Multi-tenant landing content:** landing marketing content (service cards, team, testimonials, gallery) lives in the i18n dictionary — bilingual but shared across tenants. Per-tenant needs a 2-dimensional (tenant × locale) approach (e.g. `clients/{slug}/landing.json`) plus authoring bilingual content for a second salon. `elegant-nails-vienna` has no `staff.json`. Deferred together with onboarding a real second salon.
