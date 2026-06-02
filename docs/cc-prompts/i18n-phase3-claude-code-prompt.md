# CLAUDE CODE PROMPT — Beauty Booking OS i18n Sprint · PHASE 3 (GDPR / Legal pages)

> Copy-paste this whole block into Claude Code at the repo root.
> Phases 1 & 2 are DONE and committed (327 tests green). Build ONLY Phase 3. Do not start Phase 4 (admin).
> Decisions below are LOCKED. If any assumption is wrong, STOP and report before editing.

---

## ROLE & MODE
Senior frontend architect executing PHASE 3 of the DE/EN i18n sprint. Loop: STEP 0 verify → execute exactly as specced → self-verification gate → full test gate → POST-PHASE RUNTIME VERIFICATION → commit & push → SHORT verdict. Touch ONLY the TARGET FILES. Do not begin Phase 4.

## WHAT ALREADY EXISTS (reuse, do not rebuild)
- i18n infra in `apps/web/lib/i18n/`: `getLocale()` (async; cookie → config `defaultLocale` → "en"), `getDictionary(locale)`, `Dictionary = typeof de`. Both `de.json`/`en.json` typed against `Dictionary` → **any key added to one MUST be added to the other or typecheck fails.**
- Server component pattern: `const dict = getDictionary(await getLocale());` + `export const dynamic = "force-dynamic";`.
- No `t()` helper — access strings directly: `dict.legal.*`.
- Existing dictionary namespaces: `meta, nav, hero, services, gallery, team, testimonials, trust, standort, cta, footer, booking`. You will ADD one new top-level namespace: `legal` (and nothing else).

## SCOPE — the 4 legal/GDPR customer pages (all server components)
`/datenschutz`, `/gdpr/export`, `/gdpr/delete`, `/review-thanks`. Two objectives per page:
- **(A) i18n:** translate every customer-facing German string to dictionary lookups (DE + EN, Sie-register).
- **(B) Multi-tenant fix (prevents a later fix sprint):** these pages currently HARDCODE the salon name, email, and address. Replace those with config values so they work for any tenant. This is an explicitly-approved secondary objective for this phase.

## HARD CONSTRAINTS
- `packages/**` FROZEN. `app/api/**` DO NOT MODIFY. `middleware.ts` DO NOT MODIFY. DB schema FROZEN. `DatePicker.tsx` untouched.
- No `localStorage`/`sessionStorage`. CSS: only existing `var(--color-*)` tokens / existing classes — no new colors/classes.
- Add `export const dynamic = "force-dynamic"` to every page you touch.
- Preserve each page's existing `robots: { index: false, follow: false }` metadata.
- German = formal Sie. Keep all `mailto:` links functional (localize only the human-readable subject text, keep the address from config).
- Do NOT touch date logic / `vienna-helpers.ts`. `"claude-sonnet-4-20250514"` unchanged.

## CONFIG SOURCES for objective (B)
From `loadClientConfig()`:
- Salon display name → `config.clientName`
- Data controller legal name → `config.gdpr.dataControllerName`
- GDPR contact email → `config.gdpr.dataControllerEmail`
- Address → `config.contact.address`
Render these from config; never hardcode "Vienna Glow Studio", "datenschutz@viennaglowstudio.at", or "Mariahilfer Straße 45…" in JSX. If an optional field were missing, render gracefully (no crash) — but these four fields exist in both salon configs.

---

## STEP 0 — VERIFY BEFORE EDITING (read-only; STOP if mismatch)
1. The four files exist and are server components with static `metadata` (no `force-dynamic` yet):
   - `apps/web/app/datenschutz/page.tsx` (hardcodes name + email "datenschutz@viennaglowstudio.at" + address "Mariahilfer Straße 45, 1060 Wien")
   - `apps/web/app/gdpr/export/page.tsx` (hardcodes email in `mailto:` + title)
   - `apps/web/app/gdpr/delete/page.tsx` (hardcodes email in `mailto:` + title)
   - `apps/web/app/review-thanks/page.tsx` (hardcodes "Vienna Glow Studio" in title)
2. `getLocale`/`getDictionary` exist as described; dictionaries have no `legal` namespace yet.
3. Confirm `config.gdpr.dataControllerEmail`, `config.gdpr.dataControllerName`, `config.contact.address`, `config.clientName` exist in `clients/demo-salon/client.config.json` AND `clients/elegant-nails-vienna/client.config.json`.
If anything differs, STOP and report. Otherwise proceed.

## TARGET FILES
EDIT:
- `apps/web/lib/i18n/dictionaries/de.json` (add `legal` namespace)
- `apps/web/lib/i18n/dictionaries/en.json` (add `legal` namespace — identical keys)
- `apps/web/app/datenschutz/page.tsx`
- `apps/web/app/gdpr/export/page.tsx`
- `apps/web/app/gdpr/delete/page.tsx`
- `apps/web/app/review-thanks/page.tsx`

DO NOT TOUCH any other file.

## IMPLEMENTATION STEPS (ordered)
1. **Dictionaries — add `legal` namespace** to BOTH files (identical keys, German verbatim from the components, faithful concise EN, Sie-register). Suggested structure:
   - `legal.meta` → `datenschutzTitle`, `exportTitle`, `deleteTitle`, `reviewThanksTitle` (use `{clientName}` placeholder where the title includes the salon name)
   - `legal.datenschutz` → `heading`, `subtitle` (mentions DSGVO/Austrian law), `controllerHeading`, `controllerBody` (with `{name}`, `{address}`, `{email}` placeholders), `purposeHeading`, `purposeBody`, `rightsHeading`, `rightsBody`, `exportBtn`, `deleteBtn`, `storageHeading`, `storageBody`, `backHome`
   - `legal.export` → `heading`, `intro`, `emailLabel`, `mailtoSubject` ("Datenauskunft DSGVO"), `note` (30-day JSON note), `backLink`
   - `legal.delete` → `heading`, `intro`, `emailLabel`, `mailtoSubject` ("Löschanfrage DSGVO"), `note`, `backLink`
   - `legal.reviewThanks` → `heading`, `body`, `rebookCta`, `homeCta`
2. **`datenschutz/page.tsx`** — add `force-dynamic`; convert `metadata` → `generateMetadata()` (localized title via `legal.meta.datenschutzTitle` + `clientName`, keep `robots` noindex). In the component: `const dict = getDictionary(await getLocale()); const config = loadClientConfig();`. Replace all German strings with `dict.legal.datenschutz.*`. Replace hardcoded name/address/email with `config.gdpr.dataControllerName` / `config.contact.address` / `config.gdpr.dataControllerEmail` (interpolate into `controllerBody`; keep the `mailto:` href using the config email). Keep markup/classes identical.
3. **`gdpr/export/page.tsx`** — `force-dynamic`; `generateMetadata()` (localized, noindex); `dict` + `config`. Translate strings via `dict.legal.export.*`; `mailto:` href uses `config.gdpr.dataControllerEmail` with `?subject=` set to `dict.legal.export.mailtoSubject`; show the email text from config (not hardcoded).
4. **`gdpr/delete/page.tsx`** — same as step 3 using `dict.legal.delete.*`.
5. **`review-thanks/page.tsx`** — `force-dynamic`; `generateMetadata()` (localized title via `legal.meta.reviewThanksTitle` + `clientName`); translate via `dict.legal.reviewThanks.*`. (This page has no contact info to config-drive beyond the title.)
6. Parity: ensure de.json and en.json `legal` key sets are identical. The existing parity test will then stay green; no new unit test is strictly required, but if a `legal`-specific assertion is trivial, add it to the existing i18n test file.

## ACCEPTANCE CRITERIA
- All four pages render fully in the active locale; DE/EN toggle switches every string.
- No hardcoded "Vienna Glow Studio", "datenschutz@viennaglowstudio.at", or "Mariahilfer Straße 45…" remains in these four files (all from config now).
- `mailto:` links still work and point to the config email; subjects are localized.
- Titles/metadata localized; `robots` noindex preserved.
- `elegant-nails-vienna` shows ITS name/email/address with NO code change.
- `pnpm typecheck` → 0 errors; `pnpm test` → all green (parity included).
- No localStorage/sessionStorage; no new CSS class/color; `force-dynamic` on all four routes.

## SELF-VERIFICATION GATE (report each pass/fail)
- [ ] `git diff --name-only` shows ONLY the 6 listed files.
- [ ] de.json / en.json `legal` key sets identical (parity green).
- [ ] `grep -RniE "Vienna Glow|viennaglowstudio|Mariahilfer" apps/web/app/datenschutz apps/web/app/gdpr apps/web/app/review-thanks` returns NOTHING (all config-driven).
- [ ] No leftover hardcoded German UI string in the four files (spot-check).
- [ ] `force-dynamic` + `robots` noindex on all four pages.
- [ ] No localStorage/sessionStorage; only `var(--color-*)`/existing classes.
- [ ] German Sie-register; longest DE legal strings checked for overflow in the card.

## POST-PHASE RUNTIME VERIFICATION (do this yourself — NO Playwright)
After the gate, before declaring done, run a runtime smoke. Do not install Playwright/browser.
1. Start dev server in background; poll until `http://localhost:3030/` returns 200 (timeout ~40s):
   ```bash
   pnpm --filter @beauty-booking/web dev &
   ```
2. Existing multi-tenant smoke (default slug): `node apps/web/scripts/smoke-multitenant.mjs demo-salon`.
3. Locale-aware HTTP smoke — for EACH page (`/datenschutz`, `/gdpr/export`, `/gdpr/delete`, `/review-thanks`), fetch twice:
   ```bash
   curl -s -H "Cookie: locale=de" http://localhost:3030/<page>   # expect lang="de"
   curl -s -H "Cookie: locale=en" http://localhost:3030/<page>   # expect lang="en"
   ```
   Assert per page: HTTP 200 (no "Application error"/"Internal Server Error"); `<html lang>` matches the cookie; a known DE string present in the DE fetch and the EN equivalent in the EN fetch (e.g. datenschutz DE "Datenschutz & Einwilligung" vs EN "Privacy & Consent"; delete DE "Löschanfrage" vs EN "Request Deletion"); the config email (`datenschutz@viennaglowstudio.at` for demo) appears (proves config-driven render).
4. Capture dev server stdout/stderr during fetches; confirm no uncaught errors / hydration warnings / i18n context errors.
5. Kill the dev server.

## COMPLETENESS AUDIT (so no fix-sprint is needed later)
Before committing, explicitly confirm and report: every string on all four pages is translated (zero German leftovers in EN mode), every previously-hardcoded salon detail is now from config, and both locales render error-free at runtime. If ANY item is incomplete, fix it now within these target files; do not defer.

## FINISH WITH
```bash
pnpm typecheck && pnpm test && git add . && git commit -m "feat(i18n): Phase 3 — localized + config-driven GDPR/legal pages" && git push origin main
```
Then print a SHORT verdict: `git diff --name-only`; exact passing test count (delta vs 327); each self-verification item pass/fail; the runtime verification table (page × locale → HTTP / lang / DE-EN string / errors); confirmation that the completeness audit passed; any layout-overflow note. Do NOT begin Phase 4.
