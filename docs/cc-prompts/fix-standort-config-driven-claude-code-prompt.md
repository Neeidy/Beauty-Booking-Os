# CLAUDE CODE PROMPT — Fix Task: StandortSection config-driven contact + hours

> Copy-paste into Claude Code at the repo root. Focused corrective task (NOT a numbered phase).
> Goal: the landing "Standort/Kontakt" section must show the ACTIVE TENANT's contact details and hours
> from config, not demo values baked into the i18n dictionary. Closes the multi-tenant gap where
> elegant-nails-vienna shows demo's phone/address.
> HARD RULE: do NOT change the system architecture or break the system. Changes are config/string-only.
> If any assumption is wrong, STOP and report before editing.

## ROLE & MODE
Senior frontend architect. Loop: STEP 0 verify → execute → self-verification gate → LOCAL gate → LIVE Vercel verification → only then done. Touch ONLY the TARGET FILES.

## BACKGROUND (the defect)
In Phase 1, salon CONTACT DATA (phone, email, address, instagram, map name/address) was placed into the i18n dictionary (`standort.*`) and the `tel:`/`mailto:` hrefs were left hardcoded to the demo salon. Contact data is TENANT data, not translatable copy — it belongs in `client.config.json`. As a result `elegant-nails-vienna` renders the demo salon's phone/email/address. Fix: read contact + hours from `loadClientConfig()`; keep only LABELS in the dictionary.

## SCOPE DECISIONS (locked)
- Config-drive: phone, email, address, instagram, the `tel:`/`mailto:` hrefs, the opening-hours table, the map name, the map address.
- KEEP generic from dictionary (no config field — acknowledged demo flavor): the transport lines (U3 / Bus 57A / Parkgarage) and `mapBadge`.
- DROP the hardcoded Thursday "Abendtermine 🌙" tag — does not generalize.
- Do NOT add new config schema fields. Do NOT config-drive Services/Team/Testimonials (separate later task).

## HARD CONSTRAINTS (do not break the system)
- `packages/**` FROZEN; `app/api/**`, `middleware.ts`, DB schema, `DatePicker.tsx` untouched.
- Do NOT change `loadClientConfig` / `loadBranding` signatures or the `resolveClientFile` path logic added in the prod fix — just CALL `loadClientConfig()`.
- No localStorage/sessionStorage. CSS: only existing `var(--color-*)` tokens / existing classes — keep markup & classNames identical.
- German strings stay Sie-register. No date-helper changes; hours come straight from config string values.
- Optional config fields render conditionally — never crash if missing (`instagramHandle` is ABSENT for elegant-nails).
- 327 tests must stay green.

## STEP 0 — VERIFY (read-only; STOP if mismatch)
1. `apps/web/components/sections/StandortSection.tsx` is an async server component reading `dict.standort` and currently uses `s.address`, `s.phone`, `s.email`, `s.instagram`, `s.mapName`, `s.mapAddr`, `s.eveningTag`, hardcoded `tel:+4312345678` / `mailto:hello@viennaglowstudio.at`, and a hardcoded 7-row hours table.
2. `loadClientConfig()` (in `apps/web/lib/load-client-config.ts`) is sync and returns `clientName`, `contact.{phone,email,address,instagramHandle?}`, `operatingHours` (keys `monday`..`sunday`, value `{open:"HH:MM",close:"HH:MM"}|null`).
3. `standort.*` keys are referenced ONLY in `StandortSection.tsx` (grep to confirm) so removing data keys is safe.
4. demo `operatingHours` uses `"09:00"`-style strings, elegant-nails `"10:00"`-style; both `sunday: null`. elegant-nails has NO `contact.instagramHandle`.
If anything differs, STOP and report.

## TARGET FILES
- `apps/web/components/sections/StandortSection.tsx`
- `apps/web/lib/i18n/dictionaries/de.json`
- `apps/web/lib/i18n/dictionaries/en.json`
DO NOT TOUCH anything else.

## IMPLEMENTATION STEPS
1. **StandortSection.tsx** — add `import { loadClientConfig } from "@/lib/load-client-config";` and `const config = loadClientConfig();`. Keep `const dict = getDictionary(await getLocale()); const s = dict.standort;` for LABELS only.
   - Contact list: address → `config.contact.address`; phone text → `config.contact.phone` with `href={`tel:${config.contact.phone.replace(/\s/g, "")}`}`; email text → `config.contact.email` with `href={`mailto:${config.contact.email}`}`; instagram line → render ONLY if `config.contact.instagramHandle` is truthy, showing that handle.
   - Hours table: iterate `["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]`. Day label = `s.days[key]`; if `config.operatingHours[key]` is null → time cell `—` + `<span className="hours-status closed">{s.statusClosed}</span>`; else time cell `` `${oh.open} – ${oh.close}` `` + `<span className="hours-status open">{s.statusOpen}</span>`. Remove the hardcoded times and the Thursday `eveningTag` markup.
   - Map: `map-name` → `config.clientName`; `map-addr` → `config.contact.address`. Keep `map-badge` = `s.mapBadge` and the three transport spans = `s.transportU3/Bus/Park`.
   - Keep all classNames, structure, and the booking CTA unchanged.
2. **de.json + en.json** — under `standort`, REMOVE the now-unused data keys: `address`, `phone`, `email`, `instagram`, `mapName`, `mapAddr`, `eveningTag`. KEEP: `caption`, `heading`, `days.*`, `statusOpen`, `statusClosed`, `hoursNote`, `cta`, `mapBadge`, `transportU3`, `transportBus`, `transportPark`. Remove from BOTH files identically (keeps parity test + `Dictionary` type consistent).

## ACCEPTANCE CRITERIA
- Landing Standort section shows the ACTIVE tenant's phone/email/address/hours/map from config.
- demo-salon: phone "+43 1 234 5678", address "Mariahilfer Straße 45, 1060 Wien", instagram line present.
- elegant-nails-vienna: phone "+43 1 987 6543", address "Favoritenstraße 22, 1040 Wien", NO instagram line, hours reflect 10:00-start — with NO code change.
- `tel:`/`mailto:` point to active tenant.
- `pnpm typecheck` 0 errors; `pnpm test` all green; no hardcoded demo contact remains in the file.

## SELF-VERIFICATION GATE (report pass/fail)
- [ ] `git diff --name-only` = only the 3 target files.
- [ ] `grep -nE "viennaglowstudio|\\+4312345678|Mariahilfer|hello@viennaglow" apps/web/components/sections/StandortSection.tsx` → NOTHING.
- [ ] de/en `standort` key sets identical; removed keys gone from both; parity test green.
- [ ] instagram line conditional; no crash when `instagramHandle` undefined.
- [ ] No CSS/class/markup changes beyond data swaps; no localStorage; loadClientConfig signature untouched.

## POST-TASK VERIFICATION (local + LIVE Vercel)
### Local gate
1. `pnpm typecheck` (0) + `pnpm test` (all green, report count).
2. `pnpm --filter @beauty-booking/web build` then `... start` on 3030.
3. Smoke BOTH salons: `node apps/web/scripts/smoke-multitenant.mjs demo-salon` (all 4 PASS); then temporarily flip gitignored `apps/web/.env.local` slug to `elegant-nails-vienna`, restart, `node apps/web/scripts/smoke-multitenant.mjs elegant-nails-vienna` (all 4 PASS incl. phone "+43 1 987 6543"), then RESTORE `.env.local` to `demo-salon` (confirm `git status` clean for it).
### Commit & push
`pnpm typecheck && pnpm test && git add . && git commit -m "fix(multitenant): config-drive Standort contact + hours (was demo-hardcoded in i18n dict)" && git push origin main`
### LIVE Vercel verification (REQUIRED)
Poll `https://beauty-booking-os-web.vercel.app/` (~15s interval, ~6 min timeout) until HTTP 200 and body has no "Application error". Then fetch `/` with `Cookie: locale=de` and `locale=en`:
- assert HTTP 200, no "server-side exception", `<html lang>` matches, and the demo contact (phone "+43 1 234 5678" / "Mariahilfer") renders in the Standort section.
- (Multi-tenant elegant-nails is verified locally above — production serves demo only.)
If the live site errors or content is wrong: diagnose, fix WITHIN scope, redeploy, re-verify — repeat until it passes. **Never** touch architecture/frozen zones/signatures to force a pass; if a real fix needs that, STOP and report.

## VERDICT (report)
`git diff --name-only`; test count (delta vs 327); self-verification items; local smoke for BOTH salons (4 checks each); LIVE Vercel table (`/` × de/en → HTTP / lang / contact rendered / errors) with commit SHA; explicit "live site PASSED" statement.
