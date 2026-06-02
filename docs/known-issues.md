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

## Deferred feature (not a bug)
- **Multi-tenant landing content:** landing marketing content (service cards, team, testimonials, gallery) lives in the i18n dictionary — bilingual but shared across tenants. Per-tenant needs a 2-dimensional (tenant × locale) approach (e.g. `clients/{slug}/landing.json`) plus authoring bilingual content for a second salon. `elegant-nails-vienna` has no `staff.json`. Deferred together with onboarding a real second salon.
