# CLAUDE CODE PROMPT — Record known issues (documentation only)

> Copy-paste into Claude Code at the repo root.
> This is DOCUMENTATION ONLY — create one markdown file and commit it. Do NOT change any code, config, or behavior. Do NOT touch any other file.

## TASK
Create `docs/known-issues.md` with EXACTLY the content in the block below (verbatim), then commit & push. No code changes anywhere.

## STEPS
1. Create the file `docs/known-issues.md` with the content below.
2. `git add docs/known-issues.md`
3. Verify `git diff --name-only --cached` shows ONLY `docs/known-issues.md` (nothing else staged).
4. `git commit -m "docs: record known issues (deferred bugs + minor findings)" && git push origin main`
5. Report: confirm only the one file was committed; no code/test impact.

## FILE CONTENT (`docs/known-issues.md`)
```markdown
# Known Issues & Deferred Fixes

Status as of the i18n sprint completion. The app is stable (327 tests green, live healthy on Vercel, demo-salon). The items below are intentionally DEFERRED — not fixed — to avoid risk to the working demo. Each has a diagnosis and a recommended fix for when it is picked up.

## Deferred functional bugs

### 1. Slot availability is per-salon, not per-staff
- **Where:** `apps/web/app/api/booking/slots/route.ts` and the reservation conflict check in `apps/web/app/api/booking/reservations/route.ts`.
- **Behavior:** A time slot is marked unavailable if ANY booking/active-reservation overlaps it for the whole salon (`clientId`). There is no per-staff dimension, so a salon with multiple staff shows a time as "full" after a single booking, even if other staff are free. `maxBookingsPerSlot` in config is also not honored (capacity is effectively hardcoded to 1).
- **Root cause:** The `bookings` table has no `staffId` column — the requested staff member is stored as free text inside `bookings.notes` ("Mitarbeiter-Wunsch: …"). `slot_reservations` likewise has no `staffId`.
- **Why deferred:** A correct per-staff fix requires adding a `staffId` column to `bookings` (and `slot_reservations`) — a DB schema change, which is FROZEN. A `notes`-parsing approximation would be fragile and risks the booking flow.
- **Recommended fix (when schema unfreezes):** add `staffId` to `bookings` + `slot_reservations` (migration), pass the selected staff to `/api/booking/slots` and the reservation POST, and scope availability/conflict checks by staff. Optionally honor `maxBookingsPerSlot` for capacity in the interim.

### 2. Reservation expires while the user fills later booking steps ("Rezervasyon süresi doldu")
- **Where:** `apps/web/lib/slot-reservations.ts` (`ACTIVE_TTL_MINUTES = 10`), `apps/web/components/SlotPicker.tsx` (countdown), `apps/web/app/api/booking/submit/route.ts` (409 on expired/non-active reservation).
- **Behavior:** When the customer picks a slot (step 2) a 10-minute reservation is created. The countdown runs ONLY while SlotPicker is mounted (step 2). After advancing to steps 3-4 (contact info, GDPR) SlotPicker unmounts, the countdown stops, and there is no keepalive — but the server-side reservation still expires at 10 minutes. A user who takes longer than ~10 minutes is rejected at submit with 409 "Rezervasyon süresi doldu" after filling the whole form. (True double-booking is separately prevented by the DB exclusion constraint; this issue is the silent single-user expiry.)
- **Why deferred:** The booking reservation flow is the most fragile, revenue-critical path; not touched before the demo. Normal-speed users (<10 min) are unaffected.
- **Recommended fix (low risk first):** bump `ACTIVE_TTL_MINUTES` (e.g. 10 → 25-30) — a single constant, no flow changes. Robust alternative: add a keepalive that periodically extends the reservation while the booking form is open across steps (needs an "extend" endpoint + a ping from the form), plus surfacing the remaining time on later steps.

## Minor / cosmetic findings (low priority, none demo-breaking)
- **BookingForm effect missing dependency array:** the `useEffect` in `apps/web/components/BookingForm.tsx` that reads `?source=google_business` has no `[]` dependency array, so it runs on every render. Harmless (state set is idempotent) but should be `[]`.
- **Stray junk file:** a 0-byte file literally named `{` exists at the repo root (accidental). Safe to delete.
- **Dashboard "Wochenumsatz" placeholder:** the weekly-revenue stat on `apps/web/app/admin/dashboard/page.tsx` is a hardcoded "—" and is never populated.
- **operatingHours format inconsistency:** file configs use `"HH:MM"` (e.g. "09:00") while the admin SettingsView writes `"HHmm"` (e.g. "0900"); `/api/booking/slots` `parseHHMM` normalizes both, so it works, but the stored format is inconsistent.
- **Dead legacy components:** `apps/web/components/{HeroSection,ServicesSection,CTASection,Footer,GalerieTeamSection}.tsx` are unused (the landing page uses `components/sections/*`). Safe to remove in a cleanup pass.

## Deferred feature (not a bug)
- **Multi-tenant landing content:** the landing marketing content (service cards, team, testimonials, gallery) lives in the i18n dictionary — bilingual but shared across tenants. Making it per-tenant needs a 2-dimensional (tenant × locale) approach, e.g. a `clients/{slug}/landing.json`, plus authoring bilingual content for the second salon. `elegant-nails-vienna` currently has no `staff.json`. Deferred together with onboarding a real second salon.
```

## CONSTRAINTS
- Do NOT modify any source file, config, or test. Only create `docs/known-issues.md`.
- Do NOT delete the stray `{` file or fix anything listed — this task only RECORDS the issues.
- If `git status` shows unrelated changes, do NOT include them; stage only `docs/known-issues.md`.
```
