# CLAUDE CODE PROMPT — Beauty Booking OS i18n Sprint · PHASE 4d (Admin: Escalations + Logs + Bookings)

> Copy-paste into Claude Code at the repo root.
> Phases 1-3, prod fix, Standort, 4a, 4b, 4c are DONE (327 tests green, live healthy).
> Build ONLY Phase 4d. Do not start 4e.
> HARD RULE: do NOT change system architecture or break the system. If any assumption is wrong, STOP and report.

## ROLE & MODE
Senior frontend architect, PHASE 4d. Loop: STEP 0 verify → execute → self-verification gate → LOCAL gate → LIVE Vercel verification → done. Touch ONLY the TARGET FILES. Do not start 4e.

## WHAT ALREADY EXISTS (reuse)
- i18n infra: `getLocale()` (server async), `getDictionary(locale)`, `Dictionary = typeof de`; de/en must match.
- Client: `const { dict, locale } = useI18n();` → `dict.admin.*`. No `t()`. Provider wraps `/admin/*`.
- `admin` namespace has `nav, login, dashboard, statusLabels, sourceLabels, relativeTime, frontDesk, leadCard, leads, clients, clientProfile, calendar, waitingList, rebooking`. EXTEND with `escalations, logs, bookings` (don't modify existing keys).
- Reuse `admin.statusLabels` for BOOKING statuses (BookingTable pill, bookings filter) and `admin.relativeTime` for the escalation age text.

## SCOPE — 4d surfaces ONLY
- `app/admin/escalations/page.tsx` (client), `components/admin/EscalationCard.tsx` (client)
- `app/admin/logs/page.tsx` (client), `components/admin/LogViewer.tsx` (client)
- `app/admin/bookings/page.tsx` (client), `components/admin/BookingTable.tsx` (client)
Do NOT touch settings or staff (4e), or any other surface. `components/admin/StatCard.tsx` has NO hardcoded strings (label comes via props) → do NOT touch it.

## HARD CONSTRAINTS
- `packages/**` FROZEN; `app/api/**`, `middleware.ts`, DB schema, `DatePicker.tsx`, customer-facing files untouched.
- Do NOT change data fetching (`fetchEscalations`/`fetchLogs`/`fetchBookings`), the PATCH actions (`handleAction`), `agentBadgeClass`, `STATUS_LEVEL`/`EVENT_ICONS`/`STATUS_PILL`/`NEXT_ACTIONS` logic mapping, pagination, expand state, or control flow. String/label + locale-aware maps + date-locale-arg ONLY.
- TECHNICAL ENUM VALUES STAY RAW (not translated): in Logs, the `eventType`/`agentName`/`status` option VALUES and the displayed technical log `status`/`eventType`/agent names are system identifiers — keep raw. Only translate the chrome (headers, "Alle …" placeholders, count, empty, expanded field labels). In Bookings, the `<option value>` stays the raw enum; the DISPLAY uses `admin.statusLabels`.
- No localStorage. CSS: only existing `var(--color-*)` / existing classes; keep markup/classNames identical.
- German Sie. `lib/vienna-helpers.ts` untouched; for existing `toLocaleDateString/Time/String("de-AT")` calls, ONLY parametrize the locale arg as `locale === "de" ? "de-AT" : "en-GB"` (flag each).
- 327 tests stay green.

## STEP 0 — VERIFY (read-only; STOP if mismatch)
1. Confirm all 6 files are client components under the provider, with the strings described below.
2. Confirm `EscalationCard` source labels are PLAIN ("Web"/"Instagram"/"WhatsApp"/"E-Mail") — different from the emoji `admin.sourceLabels`; so use a dedicated `admin.escalations.sourceLabels`.
3. Confirm `BookingTable` shows the booking status as `● {status}` (raw) and `NEXT_ACTIONS` labels are German.
If anything differs, STOP and report.

## TARGET FILES
- `apps/web/lib/i18n/dictionaries/de.json` (extend `admin`)
- `apps/web/lib/i18n/dictionaries/en.json` (extend `admin` — identical keys)
- `apps/web/app/admin/escalations/page.tsx`
- `apps/web/components/admin/EscalationCard.tsx`
- `apps/web/app/admin/logs/page.tsx`
- `apps/web/components/admin/LogViewer.tsx`
- `apps/web/app/admin/bookings/page.tsx`
- `apps/web/components/admin/BookingTable.tsx`
DO NOT TOUCH anything else (including StatCard).

## IMPLEMENTATION STEPS
1. **Dictionaries — extend `admin`** (BOTH files, identical keys, German verbatim, faithful EN, Sie):
   - `admin.escalations` → `title` ("Eskalations-Queue"), `breadcrumb` ("Admin / Eskalationen"), `refresh`, `notice` (low-confidence AI explanation), `openCount` (`{count}` with singular/plural handled via interpolation or two keys `openOne`/`openMany`), `loadErrorTitle, loadErrorText, loading, emptyTitle, emptyText`, `sourceLabels` {web_form, instagram_dm, whatsapp, email} (PLAIN), `unknown`, `aiPrefix`, action titles {qualify, contacted, spam}.
   - `admin.logs` → `breadcrumb` ("System · event_logs"), `title` ("AI Agent Logs"), `refresh`, `allTypes, allAgents, allStatus, filter`, `count` (`{total}`/`{page}`/`{totalPages}`), `loadErrorTitle, loadErrorText, loading, back, next`, `emptyTitle, emptyText`, `tokensInView` (`{tokens}` + the ≈€ stays computed), table headers {timestamp, level, agent, eventMessage, tokens, duration}, expanded labels {logId, leadId, bookingId, input, output, error}.
   - `admin.bookings` → `breadcrumb, title` ("Buchungen"), `refresh, allStatus, fromPlaceholder, toPlaceholder, filter`, `count` (`{total}`/`{page}`/`{totalPages}`), `loadErrorTitle, loadErrorText, loading, back, next`, `emptyTitle, emptyText`, table headers {appointment, customer, contact, duration, status, reminders, actions}, `minutesUnit` ("Min."), `nextActions` {confirm, completed, noShow}, expanded labels {bookingId, createdAt, notes, cancelled}, `remindersCount` (`{count}x`).
2. **escalations/page.tsx** — `const { dict } = useI18n();` translate header, the AI notice, count (interpolated singular/plural), error/loading/empty. Keep `fetchEscalations`/`handleAction` unchanged.
3. **EscalationCard.tsx** — `const { dict } = useI18n();` `SOURCE_LABELS` → `dict.admin.escalations.sourceLabels`, `ageText` → `dict.admin.relativeTime`, `"Unbekannt"`, `"AI:"`, button `title`s. Keep `handleAction`, conf logic unchanged.
4. **logs/page.tsx** — `const { dict } = useI18n();` translate header, the three select PLACEHOLDERS ("Alle …"; option VALUES stay raw enum), "Filtern", count (interpolated), error/loading, pagination. Keep `fetchLogs`/params/state unchanged.
5. **LogViewer.tsx** — `const { dict, locale } = useI18n();` translate empty state, "Tokens in dieser Ansicht", table headers, expanded field labels. Parametrize the `toLocaleTimeString`/`toLocaleDateString` locale args. Keep `STATUS_LEVEL`, `EVENT_ICONS`, `agentBadgeClass`, expand logic, and the raw `log.status`/`eventType`/agent display unchanged.
6. **bookings/page.tsx** — `const { dict } = useI18n();` translate header, status filter (placeholder + display via `admin.statusLabels`; value stays enum), date placeholders, "Filtern", count, error/loading, pagination. Keep `fetchBookings`/state unchanged.
7. **BookingTable.tsx** — `const { dict, locale } = useI18n();` empty state, table headers, the status pill label via `admin.statusLabels` (keep the `●` + pill class), `NEXT_ACTIONS` labels via `dict.admin.bookings.nextActions`, "Min." unit, reminder `{count}x`, expanded field labels. Parametrize the `toLocaleDateString/Time/String("de-AT")` locale args. Keep `STATUS_PILL`, `NEXT_ACTIONS` next-values, `handleAction`, expand state unchanged.
8. Ensure de/en `admin` key sets identical (parity green).

## ACCEPTANCE CRITERIA
- Escalations (header, notice, cards, actions), Logs (filters, table, expanded rows), Bookings (filters, table, actions, expanded rows) render fully in the active locale; DE/EN toggle switches all chrome strings.
- Technical enum values (log eventType/agent/status, option values) remain raw; booking status DISPLAY localized via statusLabels.
- `pnpm typecheck` 0 errors; `pnpm test` all green; no fetch/action/pagination regressions.
- No localStorage; no new CSS class/color.

## SELF-VERIFICATION GATE (report pass/fail)
- [ ] `git diff --name-only` = only the 8 listed files (no StatCard, no settings/staff, no api/**, no packages/**).
- [ ] de/en `admin` key sets identical; parity green; 4a/4b/4c keys untouched.
- [ ] escalations/EscalationCard: only strings + relativeTime + plain sourceLabels; fetch/PATCH untouched.
- [ ] logs/LogViewer: only chrome strings + date-arg; technical enum values raw; fetch/badge logic untouched.
- [ ] bookings/BookingTable: only strings + statusLabels display + nextActions + date-arg; `<option value>` raw; handleAction/STATUS_PILL/NEXT_ACTIONS-next untouched.
- [ ] grep these 6 files for residual non-German/EN leftovers (e.g. Turkish) → NONE.
- [ ] German Sie; longest DE labels checked for overflow (table headers, action buttons).

## POST-PHASE VERIFICATION (local + LIVE Vercel)
### Local gate
1. `pnpm typecheck` (0) + `pnpm test` (green, count + delta vs 327).
2. `pnpm --filter @beauty-booking/web build` then `... start` on 3030.
3. Authenticated LOCAL check (login → `admin_session` cookie): for `/admin/escalations`, `/admin/logs`, `/admin/bookings` fetch with `Cookie: admin_session=<secret>; locale=de` and `...; locale=en` → assert HTTP 200, no error, German vs English chrome, zero DE/Turkish leftovers in EN.
### Commit & push
`pnpm typecheck && pnpm test && git add . && git commit -m "feat(i18n): Phase 4d — admin escalations, logs, bookings DE/EN" && git push origin main`
### LIVE Vercel verification (REQUIRED)
Poll `https://beauty-booking-os-web.vercel.app/` until 200, no "Application error". Confirm NO REGRESSION on public surfaces: `/` and `/admin/login` (de+en) still 200, no "server-side exception". Note authed 4d pages need real login → the USER should eyeball `/admin/escalations`, `/admin/logs`, `/admin/bookings` after logging in live and toggling DE/EN. Do NOT script live credentials.
If anything fails: diagnose, fix WITHIN scope, redeploy, re-verify — repeat until pass. NEVER touch architecture/frozen/logic to force a pass; if a real fix needs that, STOP and report.

## VERDICT (report)
`git diff --name-only`; test count (delta vs 327); self-verification items; residual-leftover grep; local authed results (escalations/logs/bookings de/en); LIVE health table (`/`, `/admin/login` × de/en) + commit SHA; flag every date-locale-arg change; pages for user to eyeball live; overflow note. Do NOT start 4e.
