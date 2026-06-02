# CLAUDE CODE PROMPT — Beauty Booking OS i18n Sprint · PHASE 4b (Admin: Front Desk + Leads + Clients)

> Copy-paste into Claude Code at the repo root.
> Phases 1-3, prod fix, Standort fix, and Phase 4a are DONE (327 tests green, live site healthy).
> Build ONLY Phase 4b. Do not start 4c.
> HARD RULE: do NOT change system architecture or break the system. If any assumption is wrong, STOP and report.

## ROLE & MODE
Senior frontend architect executing PHASE 4b. Loop: STEP 0 verify → execute → self-verification gate → LOCAL gate → LIVE Vercel verification → done. Touch ONLY the TARGET FILES. Do not start 4c.

## WHAT ALREADY EXISTS (reuse, do not rebuild)
- i18n infra: `getLocale()` (async server), `getDictionary(locale)`, `Dictionary = typeof de`. Both `de.json`/`en.json` typed against `Dictionary` → any key added to one MUST be in the other or typecheck fails.
- Client components: `const { dict, locale } = useI18n();` then `dict.admin.*`. No `t()` helper. Provider is in root layout, wraps all `/admin/*`.
- Phase 4a already added the `admin` namespace with `admin.nav`, `admin.login`, `admin.dashboard`. This phase EXTENDS `admin` with new sub-namespaces (do not modify existing 4a keys).
- Server admin pages already use `export const dynamic = "force-dynamic"` (front-desk, clients already have it).

## SCOPE — 4b surfaces ONLY
- `app/admin/front-desk/page.tsx` (server), `app/admin/front-desk/FrontDeskBoard.tsx` (client), `app/admin/front-desk/LeadCard.tsx` (client)
- `app/admin/leads/page.tsx` (client) + `components/admin/LeadTable.tsx` (client — READ it in STEP 0; translate it too)
- `app/admin/clients/page.tsx` (server), `app/admin/clients/[identifier]/page.tsx` (server wrapper — READ it in STEP 0), `app/admin/clients/[identifier]/ClientProfileView.tsx` (client)
Do NOT touch any other admin page/component (calendar, waiting-list, rebooking, settings, staff, escalations, logs, bookings = 4c/4d).

## HARD CONSTRAINTS
- `packages/**` FROZEN; `app/api/**`, `middleware.ts`, DB schema, `DatePicker.tsx`, all customer-facing files untouched.
- Do NOT change data fetching (`useEffect`, server `db` queries, `getCustomers`), the kanban PATCH/status logic, `statusToLane`, filter logic, pagination logic, control flow, props shape, or API paths. String/label changes + locale-aware label maps + date-locale-arg ONLY.
- No localStorage/sessionStorage. CSS: only existing `var(--color-*)` tokens / existing classes — keep markup & classNames identical.
- German = formal Sie. No `lib/vienna-helpers.ts` changes; for the existing `Intl.DateTimeFormat("de-AT", …)` / `toLocaleString("de-AT")` calls, ONLY parametrize the locale arg as `locale === "de" ? "de-AT" : "en-GB"` — add no new date logic. (Flag these in the verdict.)
- 327 tests must stay green.
- Staff-facing free-text data (lead `rawMessage`, booking `notes`) is NOT translated — it is real data shown as-is.

## STEP 0 — VERIFY (read-only; STOP if mismatch)
1. Read all 8 scope files INCLUDING the two not yet seen: `components/admin/LeadTable.tsx` and `app/admin/clients/[identifier]/page.tsx`. Confirm which are server vs client and enumerate their hardcoded German strings.
2. Confirm client components (`FrontDeskBoard`, `LeadCard`, `LeadsPage`, `LeadTable`, `ClientProfileView`) are under the root `I18nProvider` (they are) so `useI18n()` works.
3. Confirm server pages (`front-desk/page.tsx`, `clients/page.tsx`, `clients/[identifier]/page.tsx`) can use `getDictionary(await getLocale())`.
If anything differs (e.g., LeadTable has structure not described), STOP and report before editing.

## TARGET FILES
- `apps/web/lib/i18n/dictionaries/de.json` (extend `admin`)
- `apps/web/lib/i18n/dictionaries/en.json` (extend `admin` — identical keys)
- `apps/web/app/admin/front-desk/page.tsx`
- `apps/web/app/admin/front-desk/FrontDeskBoard.tsx`
- `apps/web/app/admin/front-desk/LeadCard.tsx`
- `apps/web/app/admin/leads/page.tsx`
- `apps/web/components/admin/LeadTable.tsx`
- `apps/web/app/admin/clients/page.tsx`
- `apps/web/app/admin/clients/[identifier]/page.tsx`
- `apps/web/app/admin/clients/[identifier]/ClientProfileView.tsx`
- `apps/web/lib/i18n/__tests__/` (parity stays green; add small assertion if useful)
DO NOT TOUCH anything else.

## IMPLEMENTATION STEPS
1. **Dictionaries — extend `admin`** in BOTH files (identical keys; German verbatim; faithful EN; Sie-register). Add SHARED label maps to avoid drift, plus per-surface groups:
   - `admin.statusLabels` → booking/lead statuses used across surfaces: `pending, reminded, confirmed, completed, cancelled, no_show, rescheduled` (e.g. DE "Ausstehend"/"Bestätigt"/…, EN "Pending"/"Confirmed"/…). Used by LeadCard? (no), ClientProfileView (yes), dashboard (already 4a — leave), LeadTable (if it shows status).
   - `admin.sourceLabels` → `web_form, google, google_business, phone, instagram_dm, instagram` (with the emoji prefix kept, e.g. "🌐 Web"/"📱 Google"…). Used by LeadCard, clients page, LeadTable.
   - `admin.relativeTime` → `justNow, minutesAgo {m}, hoursAgo {h}, daysAgo {d}` (note LeadCard uses "Min/Std/Tagen" units).
   - `admin.frontDesk` → `breadcrumb` ("Lead Management"), `title` ("Front Desk"), `export`, `newLead`, `columns` {new, contacted, qualified, booked, lost}, `searchPlaceholder`, `filterAll, filterWeb, filterGoogle, filterPhone, filterInstagram`, `errorStatusUpdate`, `addLead`.
   - `admin.leadCard` → `unknown` ("Unbekannt"), `highIntent`, `aiPrefix` ("AI:"), button titles {contacted, lost, qualified, book, details, restore}.
   - `admin.leads` → `breadcrumb` ("CRM"), `title`, `refresh`, label `search/status/channel/from/to`, `allStatus, allChannels`, `resultsInfo` (`{total}`,`{page}`,`{totalPages}`), `loadError`, `loading`, `back`, `next`. (Status/channel option visible text uses `admin.statusLabels`/`admin.sourceLabels`; the `<option value>` MUST stay the raw enum.)
   - `admin.clients` → `breadcrumb`, `title` ("Kunden"), `activeSuffix` (`{count} aktiv`), `export`, `newCustomer`, `searchPlaceholder`, filter chips `all, vip {count}, active90, inactive180, new30`, `emptyTitle, emptyText`, table headers {customer, appointments, revenue, lastVisit, nextAppointment, source}, `vip`.
   - `admin.clientProfile` → `languageLabels` {de, tr, en} (the NAMES of languages — DE "Deutsch/Türkisch/Englisch", EN "German/Turkish/English"), `unknown`, `customerSince` (`{date}`), kv labels {email, phone, language, showRate}, actions {call, email}, stats {totalAppointments, completed, cancelled, noShows}, `historyTab` (`{count}`), `emptyHistory`. (Booking-row status uses `admin.statusLabels`.)
   - If `clients/[identifier]/page.tsx` or `LeadTable.tsx` have additional strings (e.g. "not found", column headers), add matching keys under `admin.clients`/`admin.leads`.
2. **front-desk/page.tsx** (server) — `const dict = getDictionary(await getLocale());` translate header strings via `dict.admin.frontDesk.*`. Keep the `db` query + `statusToLane` + columns build unchanged.
3. **FrontDeskBoard.tsx** (client) — `const { dict } = useI18n();` Build `COLUMN_CONFIG` titles from `dict.admin.frontDesk.columns`; translate toolbar (search placeholder, filter chips), the error string, and "+ Lead hinzufügen". Keep `onStatusChange` PATCH logic, `statusToLane`, `filterLead`, and state exactly as-is.
4. **LeadCard.tsx** (client) — `const { dict } = useI18n();` Replace `SOURCE_LABEL` lookups with `dict.admin.sourceLabels`, `formatWhen` → locale-aware via `dict.admin.relativeTime`, `"Unbekannt"`, `"High Intent"`, `"AI:"`, and the button `title` attributes via `dict.admin.leadCard.*`. Keep `move()`, `confColor`, intent logic unchanged.
5. **leads/page.tsx** (client) — `const { dict, locale } = useI18n();` translate header, filter labels, the status/channel `<option>` DISPLAY text (value stays enum: `s === "" ? dict.admin.leads.allStatus : dict.admin.statusLabels[s]`), results info (interpolated), error/loading, pagination. Keep `fetchLeads`, params, state, pagination logic unchanged.
6. **LeadTable.tsx** (client) — `const { dict, locale } = useI18n();` translate column headers and any status/source/relative-time rendering via the shared maps; parametrize any `Intl`/`toLocaleString` date locale arg. Keep row data + props unchanged.
7. **clients/page.tsx** (server) — `const dict = getDictionary(await getLocale());` translate header (with `activeSuffix` count), toolbar chips, empty state, table headers; `formatDate` → parametrize locale arg; revenue `toLocaleString("de-AT", …)` → parametrize locale arg; `SOURCE_BADGE` → `dict.admin.sourceLabels`. Keep `getCustomers` and all data logic unchanged.
8. **clients/[identifier]/page.tsx** (server) — translate any UI strings (e.g. not-found/error); ensure `force-dynamic` present; pass data to `ClientProfileView` unchanged.
9. **ClientProfileView.tsx** (client) — `const { dict, locale } = useI18n();` replace `LANGUAGE_LABELS`, `STATUS_CONFIG` labels (via `dict.admin.statusLabels`, keep cssClass), `"Unbekannt"`, "Kundin seit {date}", kv labels, action buttons, stat labels, history tab, empty history; parametrize the `Intl.DateTimeFormat("de-AT")` locale args. Keep `getInitials` and structure unchanged.
10. Ensure de/en `admin` key sets identical (parity green).

## ACCEPTANCE CRITERIA
- Front Desk (board + cards + filters), Leads (filters + table + pagination), Clients (list + profile) render fully in the active locale; DE/EN toggle switches every string on these surfaces.
- Status/source/relative-time labels localized via shared maps; enum `<option value>`s and all data/fetch logic unchanged.
- `pnpm typecheck` 0 errors; `pnpm test` all green; no kanban/fetch/pagination regressions.
- No localStorage; no new CSS class/color.

## SELF-VERIFICATION GATE (report pass/fail)
- [ ] `git diff --name-only` = only the listed target files (no other admin surface, no api/**, no packages/**, no middleware).
- [ ] de/en `admin` key sets identical; parity green; 4a keys untouched.
- [ ] FrontDeskBoard/LeadCard: only labels/titles changed; PATCH/status/filter logic untouched.
- [ ] leads/LeadTable: only display strings + enum-label maps + date-locale-arg; fetch/pagination untouched; `<option value>` still raw enum.
- [ ] clients/profile: only strings + label maps + date-locale-arg; `getCustomers`/data untouched.
- [ ] German Sie-register; longest DE labels checked for overflow (kanban column heads, table headers, filter chips).

## POST-PHASE VERIFICATION (local + LIVE Vercel)
### Local gate
1. `pnpm typecheck` (0) + `pnpm test` (all green, count + delta vs 327).
2. `pnpm --filter @beauty-booking/web build` then `... start` on 3030.
3. Authenticated LOCAL check: log in (POST `/api/admin/auth/login` with local `ADMIN_SECRET`, capture `admin_session` cookie), then for `/admin/front-desk`, `/admin/leads`, `/admin/clients` fetch with `Cookie: admin_session=<secret>; locale=de` and `...; locale=en` → assert HTTP 200, no error, German vs English content, zero DE leftovers in EN.
### Commit & push
`pnpm typecheck && pnpm test && git add . && git commit -m "feat(i18n): Phase 4b — admin front-desk, leads, clients DE/EN" && git push origin main`
### LIVE Vercel verification (REQUIRED)
Poll `https://beauty-booking-os-web.vercel.app/` until HTTP 200, no "Application error" (deploy live). Then:
- These 4b pages are auth-gated, so confirm NO REGRESSION on public surfaces: `/` and `/admin/login` (de + en) still return 200 with no "server-side exception".
- Note in the verdict that authenticated 4b pages need a real login — the USER should eyeball `/admin/front-desk`, `/admin/leads`, `/admin/clients` after logging in on the live URL and toggling DE/EN. Do NOT script live credentials.
If anything fails: diagnose, fix WITHIN scope, redeploy, re-verify — repeat until pass. NEVER touch architecture/frozen zones/auth/logic to force a pass; if a real fix needs that, STOP and report.

## VERDICT (report)
`git diff --name-only`; test count (delta vs 327); self-verification items; local authed results for front-desk/leads/clients (de/en, DE-leftover check); LIVE Vercel health table (`/`, `/admin/login` × de/en) with commit SHA; flag every date-locale-arg change; note which authed pages the user should eyeball live; any overflow note. Do NOT start 4c.
