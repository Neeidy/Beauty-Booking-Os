# CLAUDE CODE PROMPT — i18n Phase A: DatePicker (last customer-facing i18n gap)

> Copy-paste into Claude Code at the repo root.
> All i18n phases + admin (4a-4f) are DONE (327 tests green, live healthy). This closes the LAST customer-facing i18n gap.
> Build ONLY this. HARD RULE: `DatePicker.tsx` is a sensitive file — string-only changes; do NOT touch the date math, grid logic, month-navigation, or props. If anything is unclear, STOP and report.

## ROLE & MODE
Senior frontend architect. Loop: STEP 0 verify → execute → self-verification gate → LOCAL gate → LIVE Vercel verification → done. Touch ONLY the TARGET FILES.

## CONTEXT
`apps/web/components/DatePicker.tsx` (used in the booking flow, step 2) is still German-only: weekday labels `["Mo","Di","Mi","Do","Fr","Sa","So"]`, aria-labels `"Vorheriger Monat"`/`"Nächster Monat"`, and the month header via `Intl.DateTimeFormat("de-AT", …)`. It is `"use client"` and renders inside `BookingForm`, which is under the root `I18nProvider` → `useI18n()` works here.

## HARD CONSTRAINTS
- `packages/**` FROZEN; `app/api/**`, `middleware.ts`, DB schema untouched.
- DatePicker is SENSITIVE: do NOT change `toDateString`, `getTodayVienna`, `addDaysStr`, the grid/offset math, `goToPrevMonth`/`goToNextMonth`, `handleDayClick`, props shape, state, or any control flow. Only the displayed weekday labels, the two aria-labels, and the month-format locale arg change.
- The per-day `aria-label={dayStr}` (ISO date) stays as-is (machine-readable).
- No localStorage. CSS: only existing classes/tokens — no markup/class changes.
- German Sie (n/a here — just labels). `lib/vienna-helpers.ts` untouched.
- 327 tests stay green.

## STEP 0 — VERIFY (read-only; STOP if mismatch)
1. `DatePicker.tsx` is `"use client"` with the German strings above and the `monthLabel` via `Intl.DateTimeFormat("de-AT", { month:"long", year:"numeric", timeZone:"UTC" })`.
2. The `booking` dict namespace exists (from Phase 2). Confirm `useI18n()` is usable here (DatePicker is rendered by BookingForm under the provider).
If anything differs, STOP and report.

## TARGET FILES
- `apps/web/lib/i18n/dictionaries/de.json` (add `booking.datePicker`)
- `apps/web/lib/i18n/dictionaries/en.json` (add `booking.datePicker` — identical keys)
- `apps/web/components/DatePicker.tsx`
- `apps/web/lib/i18n/__tests__/` (optional small render/keys test)
DO NOT TOUCH anything else.

## IMPLEMENTATION STEPS
1. **Dictionaries — add `booking.datePicker`** to BOTH files (identical keys):
   - `weekdaysShort` → 7 entries Mon→Sun. DE: `["Mo","Di","Mi","Do","Fr","Sa","So"]`; EN: `["Mo","Tu","We","Th","Fr","Sa","Su"]`.
   - `prevMonth` → DE "Vorheriger Monat", EN "Previous month".
   - `nextMonth` → DE "Nächster Monat", EN "Next month".
2. **DatePicker.tsx** — `const { dict, locale } = useI18n();`
   - Replace the module-level `WEEKDAY_LABELS` usage with `dict.booking.datePicker.weekdaysShort` (map over it for the weekday header row; keep the same order Mon→Sun and the same markup).
   - Replace the two `aria-label` literals with `dict.booking.datePicker.prevMonth` / `nextMonth`.
   - For `monthLabel`, keep `Intl.DateTimeFormat` but parametrize the locale arg: `locale === "de" ? "de-AT" : "en-GB"` (everything else in that call unchanged). This localizes the month name (e.g. "Juni 2026" / "June 2026").
   - Do NOT change anything else.
3. (Optional) Add a tiny test asserting `de`/`en` `booking.datePicker.weekdaysShort` both have 7 entries and the parity test stays green.

## ACCEPTANCE CRITERIA
- In the booking flow (step 2), the date picker's weekday header, month name, and prev/next aria-labels reflect the active locale; DE/EN toggle switches them.
- Date math, selectable range (today..+60), navigation, and selection behavior are unchanged.
- `pnpm typecheck` 0 errors; `pnpm test` all green.
- No localStorage; no markup/CSS changes.

## SELF-VERIFICATION GATE (report pass/fail)
- [ ] `git diff --name-only` = only the listed files.
- [ ] de/en `booking.datePicker` key sets identical; parity green.
- [ ] DatePicker diff = ONLY weekday labels + 2 aria-labels + month locale-arg + the `useI18n()` line — NO change to date math/grid/nav/handlers/props.
- [ ] per-day `aria-label={dayStr}` unchanged.

## POST-PHASE VERIFICATION (local + LIVE Vercel)
### Local gate
1. `pnpm typecheck` (0) + `pnpm test` (green, count + delta vs 327).
2. `pnpm --filter @beauty-booking/web build` then `... start` on 3030.
3. `/booking` is a PUBLIC page → fetch `http://localhost:3030/booking` with `Cookie: locale=de` and `locale=en` → assert HTTP 200, `<html lang>` matches, no error. (Note: the weekday/month labels render in step 2 client-side, so HTTP smoke confirms page health; the label localization itself is best confirmed by a browser eyeball or the optional render test.)
### Commit & push
`pnpm typecheck && pnpm test && git add . && git commit -m "feat(i18n): DatePicker DE/EN — close last customer-facing i18n gap" && git push origin main`
### LIVE Vercel verification (REQUIRED)
Poll `https://beauty-booking-os-web.vercel.app/` until 200, no "Application error". Then fetch LIVE `/booking` with `locale=de` and `locale=en` → assert HTTP 200, `<html lang>` matches, no "server-side exception". Note in the verdict that the date-picker labels (step 2, client-rendered) should be eyeballed by the USER on the live `/booking` by selecting a service and toggling DE/EN.
If anything fails: diagnose, fix WITHIN scope, redeploy, re-verify. NEVER touch the date math/frozen zones to force a pass; if a real fix needs that, STOP and report.

## VERDICT (report)
`git diff --name-only`; test count (delta vs 327); self-verification items; local + LIVE `/booking` de/en health table + commit SHA; explicit statement that DatePicker date logic is unchanged; note that step-2 labels need a browser eyeball. This completes customer-facing i18n.
