# CLAUDE CODE PROMPT — Beauty Booking OS i18n Sprint · PHASE 4c (Admin: Calendar + Waiting List + Rebooking)

> Copy-paste into Claude Code at the repo root.
> Phases 1-3, prod fix, Standort fix, 4a, 4b are DONE (327 tests green, live healthy).
> Build ONLY Phase 4c. Do not start 4d.
> HARD RULE: do NOT change system architecture or break the system. If any assumption is wrong, STOP and report.

## ROLE & MODE
Senior frontend architect, PHASE 4c. Loop: STEP 0 verify → execute → self-verification gate → LOCAL gate → LIVE Vercel verification → done. Touch ONLY the TARGET FILES. Do not start 4d.

## WHAT ALREADY EXISTS (reuse)
- i18n infra: `getLocale()` (async server), `getDictionary(locale)`, `Dictionary = typeof de`. de/en typed against `Dictionary` → keys must match in both.
- Client: `const { dict, locale } = useI18n();` → `dict.admin.*`. No `t()`. Provider wraps all `/admin/*`.
- `admin` namespace already has `nav, login, dashboard, statusLabels, sourceLabels, relativeTime, frontDesk, leadCard, leads, clients, clientProfile` (from 4a/4b). EXTEND with `calendar, waitingList, rebooking` (do not modify existing keys).
- Reuse `admin.statusLabels` where booking statuses appear.

## SCOPE — 4c surfaces ONLY
- `app/admin/calendar/page.tsx` (server), `app/admin/calendar/WeeklyCalendar.tsx` (client), `app/admin/calendar/CalendarCell.tsx` (client), `components/admin/CalendarTimeIndicator.tsx` (client — READ in STEP 0)
- `app/admin/waiting-list/page.tsx` (server), `app/admin/waiting-list/WaitingListView.tsx` (client)
- `app/admin/rebooking/page.tsx` (server — READ in STEP 0), `app/admin/rebooking/RebookingView.tsx` (client)
Do NOT touch settings, staff, escalations, logs, bookings, or any other surface (4d/4e).

## KNOWN LEFTOVERS TO FIX (turn into localized DE/EN)
- `CalendarCell.tsx`: `"+{hiddenCount} daha"` (Turkish "daha" → "mehr" / "more").
- `RebookingView.tsx`: Turkish strings `"Job listesi yüklenemedi."`, the run-result `"… planlandı · … consent eksik · … duplicate"`, `"Çalıştırma başarısız."` → proper localized, interpolated strings.

## HARD CONSTRAINTS
- `packages/**` FROZEN; `app/api/**`, `middleware.ts`, DB schema, `DatePicker.tsx`, customer-facing files untouched.
- Do NOT change data fetching, the `db` queries, `getApptColor` service-name regex, `parseTimeToMinutes`, week-navigation/router logic, `handleRunNow`/`fetchJobs` logic, status-class helpers, or any control flow. String/label + locale-aware label maps + date-locale-arg ONLY.
- The run-result must use placeholder interpolation (`{processed}`, `{skippedConsent}`, `{skippedDuplicate}`) — never concatenate translated fragments.
- No localStorage. CSS: only existing `var(--color-*)` / existing classes. Keep markup/classNames identical.
- German Sie. `lib/vienna-helpers.ts` untouched; for existing `Intl.DateTimeFormat("de-AT", …)` calls, ONLY parametrize locale arg as `locale === "de" ? "de-AT" : "en-GB"` (flag each). Keep `formatDateVienna`/`formatTimeVienna` usage as-is.
- 327 tests stay green.

## STEP 0 — VERIFY (read-only; STOP if mismatch)
1. Read `components/admin/CalendarTimeIndicator.tsx` and `app/admin/rebooking/page.tsx` (not yet inventoried) and enumerate any hardcoded strings.
2. Confirm whether `CalendarCell.tsx` is imported anywhere (WeeklyCalendar renders appointments inline and may NOT use it). Translate its leftover regardless, but report its usage.
3. Confirm calendar/waiting-list/rebooking pages are server (force-dynamic present) and the views are client under the provider.
If anything differs, STOP and report.

## TARGET FILES
- `apps/web/lib/i18n/dictionaries/de.json` (extend `admin`)
- `apps/web/lib/i18n/dictionaries/en.json` (extend `admin` — identical keys)
- `apps/web/app/admin/calendar/page.tsx`
- `apps/web/app/admin/calendar/WeeklyCalendar.tsx`
- `apps/web/app/admin/calendar/CalendarCell.tsx`
- `apps/web/components/admin/CalendarTimeIndicator.tsx`
- `apps/web/app/admin/waiting-list/page.tsx`
- `apps/web/app/admin/waiting-list/WaitingListView.tsx`
- `apps/web/app/admin/rebooking/page.tsx`
- `apps/web/app/admin/rebooking/RebookingView.tsx`
DO NOT TOUCH anything else.

## IMPLEMENTATION STEPS
1. **Dictionaries — extend `admin`** (BOTH files, identical keys, German verbatim, faithful EN, Sie):
   - `admin.calendar` → `daysLong` (Mo..So full names array/keyed), `daysShort`, `prevWeek`/`nextWeek` (aria), `today`, `weekCount` (`{count} Termine diese Woche`), `loadError`, `retry`, `cellMore` (`+{count} mehr`).
   - `admin.waitingList` → `breadcrumb, title, waitingSuffix {count}, recheck, addManual, loadErrorTitle, loadErrorText, searchPlaceholder, filterAll {count}, filterWaiting {count}, filterNotified {count}, filterBooked, filterExpired {count}, emptyTitle, emptyText, colCustomer, colService, colDate, colRegistered, colStatus, colAction, statusNotified, statusWaiting, actionResend, actionOffer`.
   - `admin.rebooking` → `breadcrumb, title` (if page has them), `statActive, statSent, statSkipped, runNow, running, runResult` (`{processed}/{skippedConsent}/{skippedDuplicate}` interpolation), `runFailed, loadError, searchPlaceholder, filterAll {count}, filterScheduled {count}, filterSent {count}, filterSkipped {count}, loading, emptyTitle, emptyText, colCustomer, colScheduled, colBooking, colStatus, executedPrefix, preview`, and `jobStatus` map {scheduled, sent, skipped, optedOut} (DE "⏳ Geplant"/"✓ Versendet"/"✗ Übersprungen"/"⊘ Abgemeldet").
2. **calendar/page.tsx** (server) — `const dict = getDictionary(await getLocale());` Build `dayNamesLong`/`dayNamesShort` from `dict.admin.calendar.daysLong/daysShort` instead of hardcoded German. Translate the error block (`loadError` + `retry`). Keep all date math, `db` query, fallback, and the `data` shape unchanged.
3. **WeeklyCalendar.tsx** (client) — `const { dict, locale } = useI18n();` translate aria labels (`prevWeek`/`nextWeek`), "Heute" (`today`), the count (`weekCount` interpolated). `formatDisplayDate` → parametrize locale arg. Keep `getApptColor`, `parseTimeToMinutes`, navigation/router, and rendering logic unchanged. (Day short labels still arrive via `data.days` from the server.)
4. **CalendarCell.tsx** (client) — `const { dict } = useI18n();` replace `"+{hiddenCount} daha"` with `dict.admin.calendar.cellMore` (interpolated). Keep `getStatusColor`/expand logic unchanged.
5. **CalendarTimeIndicator.tsx** (client) — if it has any visible label, translate via dict; otherwise leave (report).
6. **waiting-list/page.tsx** (server) — `getDictionary(await getLocale())`; translate header (breadcrumb, title, `waitingSuffix` count, buttons). Keep the `db`/metadata query unchanged.
7. **WaitingListView.tsx** (client) — `const { dict, locale } = useI18n();` translate error empty-state, search placeholder, all filter chips (with counts), table headers, status pills (`statusNotified`/`statusWaiting`), action buttons. `formatDate`/`formatDateTime` → parametrize locale arg. Keep filter logic/state unchanged.
8. **rebooking/page.tsx** (server) — translate any header strings via `dict.admin.rebooking.*`; keep rendering of `<RebookingView/>` unchanged.
9. **RebookingView.tsx** (client) — `const { dict, locale } = useI18n();` translate stat labels, run button (`runNow`/`running`), toolbar chips, loading/empty, table headers, `getJobStatusLabel` via `dict.admin.rebooking.jobStatus`, "Ausgeführt:" prefix, "Vorschau". Replace the Turkish `error`/`runResult`/failure strings with localized interpolated versions (`runResult` uses the 3 placeholders). Parametrize the two `Intl.DateTimeFormat("de-AT")` locale args. Keep `fetchJobs`, `handleRunNow`, `getJobStatusClass`, counts, and effects unchanged.
10. Ensure de/en `admin` key sets identical (parity green).

## ACCEPTANCE CRITERIA
- Calendar (header, nav, counts, day names, cell "+N more"), Waiting List (filters, table, statuses, actions), Rebooking (stats, run button, table, job statuses) render fully in the active locale; DE/EN toggle switches every string.
- ALL Turkish leftovers ("daha", rebooking error/run-result/failure) gone — keyed in both dictionaries.
- `pnpm typecheck` 0 errors; `pnpm test` all green; no calendar-nav / rebooking-run / data regressions.
- No localStorage; no new CSS class/color.

## SELF-VERIFICATION GATE (report pass/fail)
- [ ] `git diff --name-only` = only the listed target files.
- [ ] de/en `admin` key sets identical; parity green; 4a/4b keys untouched.
- [ ] calendar: only strings/day-names/date-arg; date math, db query, `getApptColor`, router nav untouched.
- [ ] waiting-list: only strings + date-arg; query/filter logic untouched.
- [ ] rebooking: only strings + jobStatus map + date-arg; `fetchJobs`/`handleRunNow`/status-class untouched; run-result interpolated (no fragment concat).
- [ ] grep for residual Turkish in these files (`daha|yüklenemedi|planlandı|consent eksik|duplicate|başarısız`) → NONE.
- [ ] German Sie; longest DE labels checked for overflow (calendar count, rebooking stats, table headers).

## POST-PHASE VERIFICATION (local + LIVE Vercel)
### Local gate
1. `pnpm typecheck` (0) + `pnpm test` (green, count + delta vs 327).
2. `pnpm --filter @beauty-booking/web build` then `... start` on 3030.
3. Authenticated LOCAL check (login → capture `admin_session` cookie): for `/admin/calendar`, `/admin/waiting-list`, `/admin/rebooking` fetch with `Cookie: admin_session=<secret>; locale=de` and `...; locale=en` → assert HTTP 200, no error, German vs English, zero DE/Turkish leftovers in EN.
### Commit & push
`pnpm typecheck && pnpm test && git add . && git commit -m "feat(i18n): Phase 4c — admin calendar, waiting-list, rebooking DE/EN (+ remove TR leftovers)" && git push origin main`
### LIVE Vercel verification (REQUIRED)
Poll `https://beauty-booking-os-web.vercel.app/` until 200, no "Application error" (deploy live). Then confirm NO REGRESSION on public surfaces: `/` and `/admin/login` (de + en) still 200, no "server-side exception". Note that the authed 4c pages need real login → the USER should eyeball `/admin/calendar`, `/admin/waiting-list`, `/admin/rebooking` after logging in on the live URL and toggling DE/EN. Do NOT script live credentials.
If anything fails: diagnose, fix WITHIN scope, redeploy, re-verify — repeat until pass. NEVER touch architecture/frozen zones/logic to force a pass; if a real fix needs that, STOP and report.

## VERDICT (report)
`git diff --name-only`; test count (delta vs 327); self-verification items; residual-Turkish grep result; local authed results (calendar/waiting-list/rebooking de/en); LIVE health table (`/`, `/admin/login` × de/en) + commit SHA; flag every date-locale-arg change; note CalendarCell usage; pages for user to eyeball live; overflow note. Do NOT start 4d.
