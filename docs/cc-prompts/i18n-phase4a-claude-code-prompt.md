# CLAUDE CODE PROMPT — Beauty Booking OS i18n Sprint · PHASE 4a (Admin: infra + Sidebar + Login + Dashboard)

> Copy-paste into Claude Code at the repo root.
> Phases 1-3 + prod fix + Standort fix are DONE (327 tests green, live site healthy).
> Phase 4 = full admin panel i18n, split into sub-phases. This is 4a (the first slice). Build ONLY 4a.
> HARD RULE: do NOT change system architecture or break the system. If any assumption is wrong, STOP and report.

## ROLE & MODE
Senior frontend architect executing PHASE 4a. Loop: STEP 0 verify → execute → self-verification gate → LOCAL gate → LIVE Vercel verification → done. Touch ONLY the TARGET FILES. Do not start 4b.

## WHAT ALREADY EXISTS (reuse, do not rebuild)
- i18n infra in `apps/web/lib/i18n/`: `getLocale()` (async server), `getDictionary(locale)`, `Dictionary = typeof de`. Both `de.json`/`en.json` typed against `Dictionary` → any key added to one MUST be added to the other or typecheck fails.
- Client components use `const { dict, locale } = useI18n();` then `dict.<ns>.*`. No `t()` helper.
- `I18nProvider` is mounted in the ROOT `app/layout.tsx` and wraps ALL routes including `/admin/*`, so admin CLIENT components can call `useI18n()` directly. The `LocaleToggle` (floating-controls) already appears on admin pages too.
- Existing dictionary namespaces: `meta, nav, hero, services, gallery, team, testimonials, trust, standort, cta, footer, booking, legal`. ADD one new top-level namespace: `admin` (and nothing else this phase).

## SCOPE — 4a surfaces ONLY
- `components/admin/Sidebar.tsx` (client) — nav labels, footer actions, brand.
- `app/admin/login/page.tsx` (client) — all UI strings.
- `app/admin/dashboard/page.tsx` (client) — all UI strings + the German helper functions (greeting, status labels, relative-time, table headers, stat labels, error text).
- `app/admin/layout.tsx` (server) — pass salon name to Sidebar; optionally localize metadata title.
Do NOT touch any other admin page/component (those are 4b/4c/4d).

## HARD CONSTRAINTS (do not break the system)
- `packages/**` FROZEN; `app/api/**`, `middleware.ts`, DB schema, `DatePicker.tsx`, all customer-facing files untouched.
- Do NOT change auth logic, the logout fetch, the data-fetching `useEffect`s, API paths, state shape, or control flow. String/label changes + locale-aware label helpers ONLY.
- No localStorage/sessionStorage. CSS: only existing `var(--color-*)` tokens / existing classes — keep markup & classNames identical.
- German = formal Sie. `"claude-sonnet-4-20250514"` untouched. No `lib/vienna-helpers.ts` changes.
- 327 tests must stay green.

## STEP 0 — VERIFY (read-only; STOP if mismatch)
1. `Sidebar.tsx` is `"use client"`, has hardcoded German `NAV_ITEMS`/`NAV_SECONDARY` labels, brand `"Vienna Glow Studio"`, footer `"Website ansehen"` / `"Abmelden"` / `"Admin Panel"`.
2. `login/page.tsx` is `"use client"` (with a `<Suspense>` wrapper), strings: `"Falsches Passwort. Bitte versuchen Sie es erneut."`, `"Passwort"`, `"Admin-Passwort eingeben"`, `"Wird angemeldet…"`, `"Anmelden"`, `"Admin Panel"`, `"Beauty Booking OS · Admin"`. Brand uses `process.env.NEXT_PUBLIC_SALON_NAME`.
3. `dashboard/page.tsx` is `"use client"`, has helper fns `getGreeting`, `getStatusLabel`, `getTodayLabel`, `formatWhen` with hardcoded German, plus inline strings (stat labels, table headers, empty states, error text, "KI-Kosten heute", "Eskalation(en)").
4. `app/admin/layout.tsx` is a server component rendering `<Sidebar/>`; metadata title uses `NEXT_PUBLIC_SALON_NAME`.
5. Confirm `useI18n()` works in these (they are under the root `I18nProvider`).
If anything differs, STOP and report.

## TARGET FILES
- `apps/web/lib/i18n/dictionaries/de.json` (add `admin` namespace)
- `apps/web/lib/i18n/dictionaries/en.json` (add `admin` namespace — identical keys)
- `apps/web/components/admin/Sidebar.tsx`
- `apps/web/app/admin/login/page.tsx`
- `apps/web/app/admin/dashboard/page.tsx`
- `apps/web/app/admin/layout.tsx`
- `apps/web/lib/i18n/__tests__/` (extend parity or add a small admin-keys test if useful)
DO NOT TOUCH anything else.

## IMPLEMENTATION STEPS
1. **Dictionaries — add `admin` namespace** to BOTH files (identical keys; German verbatim from the components; faithful concise EN; Sie-register). Suggested structure:
   - `admin.nav` → `dashboard, frontDesk, calendar, clients, waitingList, team, rebooking, settings, logs, leads, bookings, escalations, viewWebsite, logout, adminPanel`
   - `admin.login` → `passwordLabel, passwordPlaceholder, submit, submitting, wrongPassword, adminPanel, footer`
   - `admin.dashboard` → `greetingMorning, greetingDay, greetingEvening` (each with `{name}` or fixed "Admin"), `escalationsSuffixOne`/`escalationsSuffixMany` (or use interpolation), `statErrorReload`, stat labels (`todayAppointments, weekRevenue, newLeads, pending, remindersUp` with `{count}`, `weekBookings` with `{count}`, `weekLeads` with `{count}`, `confirmationNeeded, allDone`), `apptToday, toCalendar, noApptToday`, table headers (`time, customer, service, staff, status`), `newLeads, showAll, noLeads, request` (default intent), `aiCostToday` (with `{cost}`/`{tokens}` placeholders), and status labels (`statusConfirmed, statusPending, statusCancelled, statusNoShow, statusCompleted`), relative-time (`justNow, minutesAgo` `{m}`, `hoursAgo` `{h}`, `daysAgo` `{d}`).
2. **Sidebar.tsx** — add `const { dict } = useI18n();`. Replace `NAV_ITEMS`/`NAV_SECONDARY` label strings and footer strings with `dict.admin.nav.*` (build the arrays inside the component, or map labels by key). For the brand: accept a new optional prop `brandName?: string` and render `{brandName ?? "Beauty Booking OS"}` instead of the hardcoded `"Vienna Glow Studio"`; keep `"Admin Panel"` sub from `dict.admin.nav.adminPanel`. Keep `usePathname`, the `active` logic, `escalationCount` badge, and `handleLogout` EXACTLY as-is.
3. **layout.tsx** — `import { loadClientConfig }`; pass `brandName={loadClientConfig().clientName}` to `<Sidebar/>`. (Server component; safe.) Keep `getEscalationCount` and everything else unchanged. Optionally localize the metadata title suffix if trivial, else leave.
4. **login/page.tsx** — add `const { dict } = useI18n();` inside `LoginForm` (it is under the provider). Replace all UI strings with `dict.admin.login.*`. Keep the brand env usage, the `fetch` to `/api/admin/auth/login`, `window.location.href` redirect, Suspense wrapper, and state/flow unchanged.
5. **dashboard/page.tsx** — add `const { dict, locale } = useI18n();`. Convert the helper functions to take the dict (e.g. `getStatusLabel(status, dict)`, `getGreeting(dict)`, `formatWhen(iso, dict)`) and return localized strings using interpolation. For `getTodayLabel`, keep `toLocaleDateString` but parametrize the locale arg as `locale === "de" ? "de-AT" : "en-GB"` (do not add new date logic). Replace all inline strings (stat labels, table headers, empty states, error, escalation pill, KI-Kosten) with `dict.admin.dashboard.*`. Keep ALL `useEffect` fetches, state, and the disabled buttons exactly as-is. (Flag the date-locale-arg change in the verdict.)
6. Ensure de/en `admin` key sets are identical (parity test stays green); add a tiny assertion if helpful.

## ACCEPTANCE CRITERIA
- Sidebar, login, and dashboard render fully in the active locale; toggling DE/EN switches every string on these surfaces.
- Sidebar brand shows the tenant name from config (demo: "Vienna Glow Studio"); no hardcoded salon name remains in Sidebar.
- Dashboard status labels, greeting, relative-time, table headers, stat labels all localized; numbers/fetches unchanged.
- `pnpm typecheck` 0 errors; `pnpm test` all green; no auth/flow/markup regressions.
- No localStorage; no new CSS class/color.

## SELF-VERIFICATION GATE (report pass/fail)
- [ ] `git diff --name-only` = only the listed target files (no other admin page, no api/**, no packages/**, no middleware).
- [ ] de/en `admin` key sets identical; parity green.
- [ ] Sidebar: only labels + brand-prop changed; `usePathname`/active/badge/logout untouched.
- [ ] login: only strings changed; auth fetch/redirect/Suspense untouched.
- [ ] dashboard: only strings + locale-aware label helpers + date-locale-arg; all `useEffect`/state/fetch untouched.
- [ ] German Sie-register; longest DE nav/labels checked for sidebar overflow in both locales.

## POST-PHASE VERIFICATION (local + LIVE Vercel)
### Local gate
1. `pnpm typecheck` (0) + `pnpm test` (all green, report count + delta vs 327).
2. `pnpm --filter @beauty-booking/web build` then `... start` on 3030.
3. Authenticated admin check LOCALLY: log in at `http://localhost:3030/admin/login` (POST `/api/admin/auth/login` with the local `ADMIN_SECRET`, capture the `admin_session` cookie), then `curl -s -H "Cookie: admin_session=<secret>" -H "Cookie: locale=de" http://localhost:3030/admin/dashboard` and the same with `locale=en`. Assert HTTP 200, no error, German vs English content. Also fetch `/admin/login` (public) in both locales.
### Commit & push
`pnpm typecheck && pnpm test && git add . && git commit -m "feat(i18n): Phase 4a — admin shell (sidebar, login, dashboard) DE/EN + config brand" && git push origin main`
### LIVE Vercel verification (REQUIRED)
Poll `https://beauty-booking-os-web.vercel.app/` until HTTP 200 with no "Application error" (deploy live). Then:
- Fetch `https://beauty-booking-os-web.vercel.app/admin/login` with `Cookie: locale=de` and `locale=en` → assert HTTP 200, no "server-side exception", `<html lang>` matches, DE string ("Passwort"/"Anmelden") vs EN equivalent present. (This public page proves the admin bundle renders live.)
- Confirm the public site (`/`) still returns 200 with no error (no regression).
- Authenticated admin pages on live require a real login — note in the verdict that the user should eyeball `/admin/dashboard` after logging in on the live URL; do NOT script live credentials.
If anything fails: diagnose, fix WITHIN scope, redeploy, re-verify — repeat until pass. NEVER touch architecture/frozen zones/auth/signatures to force a pass; if a real fix needs that, STOP and report.

## VERDICT (report)
`git diff --name-only`; test count (delta vs 327); self-verification items; local authed dashboard de/en result + `/admin/login` de/en; LIVE Vercel table (`/admin/login` × de/en + `/` health) with commit SHA; flag the dashboard date-locale-arg change; any sidebar overflow note. Do NOT start 4b.
