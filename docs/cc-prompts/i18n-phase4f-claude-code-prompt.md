# CLAUDE CODE PROMPT — Beauty Booking OS i18n Sprint · PHASE 4f (Admin: Staff) — FINAL ADMIN PHASE

> Copy-paste into Claude Code at the repo root.
> Phases 1-3, prod fix, Standort, 4a-4e are DONE (327 tests green, live healthy). This is the LAST admin i18n phase.
> Build ONLY Phase 4f. HARD RULE: this is a CRUD form — do NOT change ANY logic, fetch, state, or CRUD flow. String/label changes ONLY. If anything is unclear, STOP and report.

## ROLE & MODE
Senior frontend architect, PHASE 4f. Loop: STEP 0 verify → execute → self-verification gate → LOCAL gate → LIVE Vercel verification (now incl. authed login) → done. Touch ONLY the TARGET FILES.

## WHAT ALREADY EXISTS (reuse)
- i18n infra: server `getDictionary(await getLocale())`; client `const { dict, locale } = useI18n();` → `dict.admin.*`. No `t()`. Provider wraps `/admin/*`.
- `admin` namespace has all 4a-4e sub-namespaces (397 keys). EXTEND with `staff` (don't modify existing keys).

## SCOPE — Staff ONLY
- `app/admin/staff/page.tsx` (server) — header.
- `app/admin/staff/StaffManagementView.tsx` (client) — the full team CRUD view, including the inner `StaffCard` sub-component in the same file.
Do NOT touch any other surface.

## HARD CONSTRAINTS (CRUD form — high-risk)
- `packages/**` FROZEN; `app/api/**`, `middleware.ts`, DB schema, customer-facing files untouched.
- Do NOT change: `loadAll`, `handleToggleActive`, `handleUpdateServices`, `handleUpdateName`, `handleDelete`, `handleAdd`, the `fetch` calls + bodies + the `?id=` DELETE query, all state, the `StaffCard` edit/save/cancel logic, `getTenureLabel`'s date math, `AVATAR_GRADIENTS`, or any control flow.
- Save/status messages that embed the member name MUST use placeholder interpolation (`{name}`) — never concatenate translated fragments. Same for the `confirm(...)` delete dialog and the active/inactive count.
- No localStorage. CSS: only existing `var(--color-*)` / existing classes; keep markup/classNames identical.
- German Sie. No date-helper changes (getTenureLabel uses plain arithmetic — just localize its return strings via dict + interpolation).
- 327 tests stay green.

## STEP 0 — VERIFY (read-only; STOP if mismatch)
1. Confirm `staff/page.tsx` (server) has header strings: breadcrumb "Mitarbeiter:innen", title "Team", "Verfügbarkeit exportieren".
2. Confirm `StaffManagementView.tsx` is client, under the provider, containing `StaffManagementView` + inner `StaffCard`, with the German strings (toolbar, add form, card actions, edit form, tenure labels, save/error messages, confirm dialog).
If anything differs, STOP and report.

## TARGET FILES
- `apps/web/lib/i18n/dictionaries/de.json` (extend `admin.staff`)
- `apps/web/lib/i18n/dictionaries/en.json` (extend `admin.staff` — identical keys)
- `apps/web/app/admin/staff/page.tsx`
- `apps/web/app/admin/staff/StaffManagementView.tsx`
DO NOT TOUCH anything else.

## IMPLEMENTATION STEPS
1. **Dictionaries — extend `admin.staff`** (BOTH files, identical keys, German verbatim, faithful EN, Sie):
   - `header` → `breadcrumb` ("Mitarbeiter:innen"), `title` ("Team"), `exportAvailability` ("Verfügbarkeit exportieren").
   - `tenure` → `new` ("Neu im Team"), `months` (`{count} Mon. im Team`), `yearsOne` ("Seit 1 Jahr dabei"), `yearsMany` (`Seit {count} Jahren dabei`).
   - `toolbar` → `searchPlaceholder`, `countActive` (`{active} aktiv`), `countActiveInactive` (`{active} aktiv · {inactive} inaktiv`), `add` ("+ Mitarbeiter:in hinzufügen").
   - `messages` → `loadError`, `deactivated` (`{name} deaktiviert.`), `activated` (`{name} aktiviert.`), `updated` (`{name} aktualisiert.`), `saved` ("Gespeichert ✓"), `saveError` ("Fehler beim Speichern."), `deleted` (`{name} gelöscht.`), `deleteError` ("Fehler beim Löschen."), `added` ("Teammitglied hinzugefügt ✓"), `addError` ("Fehler beim Hinzufügen."), `nameRequired` ("Name und Titel sind erforderlich."), `confirmDelete` (`{name} wirklich löschen?`).
   - `loading` ("Lädt..."), `errorTitle` ("Fehler beim Laden").
   - `addForm` → `title` ("Neues Teammitglied"), `name`, `titleLabel`, `namePlaceholder` ("z.B. Maria"), `titlePlaceholder` ("z.B. Nageldesignerin"), `services` ("Leistungen"), `adding` ("Wird hinzugefügt..."), `submit` ("Hinzufügen"), `cancel` ("Abbrechen"), `addCardCta` ("+ Neue:n Mitarbeiter:in hinzufügen").
   - `card` → `allServices` ("Alle Leistungen"), `edit` ("Bearbeiten"), `delete` ("Löschen"), `name`, `titleLabel`, `services`, `save` ("Speichern"), `cancel` ("Abbrechen").
2. **staff/page.tsx** (server) — `const dict = getDictionary(await getLocale());` translate the header via `dict.admin.staff.header.*`. Keep rendering of `<StaffManagementView/>` unchanged.
3. **StaffManagementView.tsx** (client) — `const { dict } = useI18n();` in BOTH `StaffManagementView` and `StaffCard`. Translate:
   - `getTenureLabel` return values via `dict.admin.staff.tenure` (interpolated months/years; keep the 1-vs-many split).
   - All `setSaveMessage(...)`/`setError(...)` strings via `dict.admin.staff.messages.*` (interpolate `{name}`).
   - The `confirm(...)` dialog via `messages.confirmDelete` (interpolated).
   - Toolbar (search placeholder, the count badge via `countActive`/`countActiveInactive`, add button), loading/error states, the add-form (title, labels, placeholders, services, buttons), the "+ Neue:n…" add card, and in `StaffCard`: tenure, "Alle Leistungen", Bearbeiten/Löschen, edit-form labels, Speichern/Abbrechen.
   - Keep EVERY handler, fetch, body, state, and the StaffCard edit/save/cancel flow byte-identical.
4. Ensure de/en `admin` key sets identical (parity green).

## ACCEPTANCE CRITERIA
- Staff page header + toolbar + cards + add form + edit form + all save/error/confirm messages render in the active locale; DE/EN toggle switches every label.
- Add / edit / toggle-active / delete still work exactly as before; messages interpolate the member name correctly in both locales.
- `pnpm typecheck` 0 errors; `pnpm test` all green; no staff CRUD regressions.
- No localStorage; no new CSS class/color.

## SELF-VERIFICATION GATE (report pass/fail)
- [ ] `git diff --name-only` = only the 4 listed files.
- [ ] de/en `admin` key sets identical; parity green; 4a-4e keys untouched.
- [ ] Diff shows ONLY string/label substitutions — NO change to handlers/fetch/bodies/state/StaffCard flow/`getTenureLabel` math.
- [ ] Name-bearing messages + confirm dialog + counts use interpolation (no fragment concat).
- [ ] German Sie; longest DE labels checked for overflow (toolbar buttons, card actions, "+ Neue:n Mitarbeiter:in").

## POST-PHASE VERIFICATION (local + LIVE Vercel, now with authed login)
### Local gate
1. `pnpm typecheck` (0) + `pnpm test` (green, count + delta vs 327).
2. `pnpm --filter @beauty-booking/web build` then `... start` on 3030.
3. Authenticated LOCAL check (login → `admin_session` cookie via local `ADMIN_SECRET`): fetch `/admin/staff` with `locale=de` and `locale=en` → HTTP 200, no error, German vs English, zero DE leftovers in EN.
### Commit & push
`pnpm typecheck && pnpm test && git add . && git commit -m "feat(i18n): Phase 4f — admin staff DE/EN (admin panel i18n complete)" && git push origin main`
### LIVE Vercel verification (REQUIRED — authed login is now authorized)
The user authorized live admin login. Use the admin password from your environment — read `ADMIN_SECRET` from `apps/web/.env.local` (its value is `beauty2025`). DO NOT hardcode or commit this secret into any tracked/committed file; use it only at runtime for verification.
1. Poll `https://beauty-booking-os-web.vercel.app/` until 200, no "Application error" (deploy live).
2. Authenticate against LIVE: `POST https://beauty-booking-os-web.vercel.app/api/admin/auth/login` with `{ "password": "<ADMIN_SECRET>" }`, capture the `admin_session` cookie from the response.
   - If login returns 401 (production `ADMIN_SECRET` differs from local), report it and fall back to: public-surface regression check (`/`, `/admin/login` de+en still 200, no error) + ask the user to eyeball.
3. With the cookie, fetch LIVE `/admin/staff` with `Cookie: admin_session=<secret>; locale=de` and `...; locale=en` → assert HTTP 200, no "server-side exception", `<html lang>` matches, German vs English content. Also confirm `/` and `/admin/login` still healthy (no regression).
If anything fails: diagnose, fix WITHIN scope, redeploy, re-verify — repeat until pass. NEVER touch architecture/frozen/logic to force a pass; if a real fix needs that, STOP and report.

## VERDICT (report)
`git diff --name-only`; test count (delta vs 327); self-verification items; local authed `/admin/staff` de/en; LIVE authed `/admin/staff` de/en result (or 401 fallback note) + public health (`/`, `/admin/login`) + commit SHA; overflow note; explicit statement that staff CRUD behavior is unchanged AND that admin panel i18n is now COMPLETE (4a-4f).
