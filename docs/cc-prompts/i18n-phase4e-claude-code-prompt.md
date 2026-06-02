# CLAUDE CODE PROMPT — Beauty Booking OS i18n Sprint · PHASE 4e (Admin: Settings)

> Copy-paste into Claude Code at the repo root.
> Phases 1-3, prod fix, Standort, 4a-4d are DONE (327 tests green, live healthy).
> Build ONLY Phase 4e (Settings). Do not start 4f (Staff).
> HARD RULE: this is the most logic-heavy admin form. Do NOT change ANY logic, state, effects, save/discard flow, or the operating-hours/service editing. String/label changes ONLY. If anything is unclear, STOP and report.

## ROLE & MODE
Senior frontend architect, PHASE 4e. Loop: STEP 0 verify → execute → self-verification gate → LOCAL gate → LIVE Vercel verification → done. Touch ONLY the TARGET FILES. Do not start 4f.

## WHAT ALREADY EXISTS (reuse)
- i18n infra: client `const { dict, locale } = useI18n();` → `dict.admin.*`. No `t()`. Provider wraps `/admin/*`.
- `admin` namespace has many sub-namespaces (4a-4d). EXTEND with `settings` (don't modify existing keys).
- Reuse `admin.calendar.daysLong` (added in 4c) for the weekday labels here instead of duplicating.

## SCOPE — Settings ONLY
- `app/admin/settings/SettingsPageClient.tsx` (client) — header + save/discard buttons.
- `app/admin/settings/SettingsView.tsx` (client) — the full settings form.
- `app/admin/settings/page.tsx` has NO strings (just renders the client) → do NOT touch it.
Do NOT touch staff or any other surface.

## HARD CONSTRAINTS (this phase is high-risk — read carefully)
- `packages/**` FROZEN; `app/api/**`, `middleware.ts`, DB schema, customer-facing files untouched.
- Do NOT change: `loadAll`, `saveAll`, `discardAll`, the `triggerSave`/`triggerDiscard`/`onSave`/`onDiscard` wiring, all `useEffect`s, `updateService`, `addService`, `parsePrice`/`formatPrice`, the operating-hours open/close logic (the `"0900"`/`"1800"` string format and the `slice` time conversions MUST stay byte-identical), service PATCH bodies, `scrollTo`, `activeSection` logic, or any state shape.
- The booking-rules `<select>` `<option value={…}>` numeric values MUST stay; only the DISPLAY text is translated.
- No localStorage. CSS: only existing `var(--color-*)` / existing classes; keep markup/classNames identical.
- German Sie. For the closed-dates `toLocaleDateString("de-AT", …)` call, ONLY parametrize the locale arg as `locale === "de" ? "de-AT" : "en-GB"` (flag it). No other date logic.
- 327 tests stay green.

## STEP 0 — VERIFY (read-only; STOP if mismatch)
1. Confirm `SettingsView.tsx` and `SettingsPageClient.tsx` are client components under the provider, with the German strings described.
2. Confirm `admin.calendar.daysLong` exists with all 7 weekday full names (from 4c) to reuse for `WEEKDAY_LABELS`.
3. Confirm the operating-hours value format is `"0900"`-style (HHmm, no colon) — you will NOT change it, only translate labels.
If anything differs, STOP and report.

## TARGET FILES
- `apps/web/lib/i18n/dictionaries/de.json` (extend `admin`)
- `apps/web/lib/i18n/dictionaries/en.json` (extend `admin` — identical keys)
- `apps/web/app/admin/settings/SettingsPageClient.tsx`
- `apps/web/app/admin/settings/SettingsView.tsx`
DO NOT TOUCH anything else.

## IMPLEMENTATION STEPS
1. **Dictionaries — extend `admin.settings`** (BOTH files, identical keys, German verbatim, faithful EN, Sie):
   - `header` → `breadcrumb` ("Studio-Einstellungen"), `title` ("Einstellungen"), `discard` ("Verwerfen"), `save` ("Änderungen speichern"), `saving` ("Wird gespeichert...").
   - `nav` → `services` ("Leistungen & Preise"), `hours` ("Öffnungszeiten"), `closed` ("Geschlossene Tage"), `rules` ("Buchungsregeln").
   - `load` → `loading` ("Lädt..."), `errorTitle` ("Fehler beim Laden"), `loadError` ("Einstellungen konnten nicht geladen werden."), `saved` ("Gespeichert ✓"), `saveFailed` ("Speichern fehlgeschlagen."), `savingInline` ("Wird gespeichert...").
   - `services` → `title` ("Leistungen & Preise"), `activeCount` (`{count} aktive Leistungen`), `add` ("+ Leistung hinzufügen"), col headers `name, duration` ("Dauer (Min)"), `price` ("Preis (€)"), `category`, placeholders `namePlaceholder` ("Leistungsname"), `categoryPlaceholder` ("Kategorie"), `pricePlaceholder` ("0.00").
   - `hours` → `title` ("Öffnungszeiten"), `hint` (Standard week / exceptions note), `open` ("geöffnet"). (Weekday names come from `admin.calendar.daysLong`.)
   - `closed` → `title` ("Geschlossene Tage & Feiertage"), `hint`, `add` ("+ Tag hinzufügen"), `labelPlaceholder` ("Bezeichnung (z.B. Staatsfeiertag)"), `empty` ("Keine geschlossenen Tage eingetragen."), `remove` ("Entfernen").
   - `rules` → `title` ("Buchungsregeln"), `hint`, labels `minAdvance` ("Minimale Vorlaufzeit"), `cancellation` ("Stornierung bis"), `maxFollowUp` ("Max. Nachfassversuche"), `recoveryWait` ("Wartezeit Rückgewinnung (Std.)"), and option-display keys: `hoursImmediate` ("0 Stunden (sofort buchbar)"), `hours2/4/12/24` ("X Stunden"), `anytime` ("Jederzeit"), `cancel24/48` ("X Stunden vor Termin"), `attempts1` ("1 Versuch"), `attempts2/3` ("X Versuche"), `recovery24/48/72` ("X Stunden"), `recovery168` ("1 Woche").
2. **SettingsPageClient.tsx** — `const { dict } = useI18n();` translate breadcrumb, title, "Verwerfen", and the save button (`saving`/`save`). Keep `handleSave`/`handleDiscard`/`saveCount`/`discardCount` logic unchanged.
3. **SettingsView.tsx** — `const { dict, locale } = useI18n();` Replace `WEEKDAY_LABELS` lookups with `dict.admin.calendar.daysLong`. Translate: the loading/error/saveMessage strings (map the internal `setSaveMessage("Gespeichert ✓")` etc. and `setError(...)` to dict values), the side-nav labels array, all section titles + hints, the service table headers + placeholders + add button + active count, the hours "geöffnet" label, the closed-dates title/hint/add/placeholder/empty/remove + the date display (locale-arg), and the booking-rules labels + every `<option>` display text (keep numeric values). Keep EVERY function and effect and the operating-hours `"0900"`/slice logic byte-identical.
4. Ensure de/en `admin` key sets identical (parity green).

## ACCEPTANCE CRITERIA
- Settings header + all 4 sections (services table, opening hours, closed dates, booking rules) render fully in the active locale; DE/EN toggle switches every label.
- Saving/discarding still works exactly as before; operating-hours editing, service add/edit/remove, closed-date add/remove all unchanged in behavior.
- Booking-rules option values unchanged (numeric); only display localized.
- `pnpm typecheck` 0 errors; `pnpm test` all green; NO settings save/load regressions.
- No localStorage; no new CSS class/color.

## SELF-VERIFICATION GATE (report pass/fail)
- [ ] `git diff --name-only` = only the 4 listed files (no page.tsx, no staff, no api/**, no packages/**).
- [ ] de/en `admin` key sets identical; parity green; 4a-4d keys untouched.
- [ ] Diff of SettingsView shows ONLY string/label substitutions + the one date-locale-arg — NO change to `loadAll`/`saveAll`/`discardAll`/effects/`updateService`/`addService`/hours-format/PATCH bodies.
- [ ] Booking-rules `<option value>` numerics unchanged.
- [ ] `WEEKDAY_LABELS` now sourced from `admin.calendar.daysLong`; weekdays still render correctly.
- [ ] German Sie; longest DE labels checked for overflow (side-nav, rules labels, option text).

## POST-PHASE VERIFICATION (local + LIVE Vercel)
### Local gate
1. `pnpm typecheck` (0) + `pnpm test` (green, count + delta vs 327).
2. `pnpm --filter @beauty-booking/web build` then `... start` on 3030.
3. Authenticated LOCAL check (login → `admin_session` cookie): fetch `/admin/settings` with `Cookie: admin_session=<secret>; locale=de` and `...; locale=en` → assert HTTP 200, no error, German vs English, zero DE leftovers in EN. If feasible, exercise a save round-trip locally to confirm no behavior regression (optional but recommended given this is the riskiest form).
### Commit & push
`pnpm typecheck && pnpm test && git add . && git commit -m "feat(i18n): Phase 4e — admin settings DE/EN" && git push origin main`
### LIVE Vercel verification (REQUIRED)
Poll `https://beauty-booking-os-web.vercel.app/` until 200, no "Application error". Confirm NO REGRESSION on public surfaces (`/`, `/admin/login` de+en still 200, no "server-side exception"). Note the authed Settings page needs real login → the USER should eyeball `/admin/settings` after logging in live, toggle DE/EN, and do a quick save to confirm it still works. Do NOT script live credentials.
If anything fails: diagnose, fix WITHIN scope, redeploy, re-verify — repeat until pass. NEVER touch architecture/frozen/logic to force a pass; if a real fix needs that, STOP and report.

## VERDICT (report)
`git diff --name-only`; test count (delta vs 327); self-verification items; local authed `/admin/settings` de/en result (+ save round-trip if done); LIVE health table (`/`, `/admin/login` × de/en) + commit SHA; flag the date-locale-arg change; overflow note; explicit statement that save/discard behavior is unchanged. Do NOT start 4f.
