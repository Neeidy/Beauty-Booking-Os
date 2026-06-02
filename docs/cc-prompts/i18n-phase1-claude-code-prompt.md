# CLAUDE CODE PROMPT — Beauty Booking OS i18n Sprint · PHASE 1

> Copy-paste this whole block into Claude Code at the repo root.
> Decisions below are LOCKED after a full read-only analysis. Do not re-litigate them.
> Build ONLY Phase 1. Do not start Phase 2.

---

## ROLE & MODE
You are a senior frontend architect executing PHASE 1 of a DE/EN internationalization sprint on this repo.
Operate in a tight loop: STEP 0 verify → execute exactly as specced → self-verify gate → run full test gate → commit & push → report diff + test count. Do NOT touch anything outside the TARGET FILES list. If any assumption below is wrong, STOP and report before editing.

## LOCKED ARCHITECTURE DECISIONS (do not change)
- **Approach:** lightweight, type-safe dictionary (`de.json` / `en.json`) + a React Context provider + cookie persistence. **No i18n library. No URL/path-prefix routing change.**
- **Supported locales:** `"de"` and `"en"` ONLY.
- **Locale source:** a NEW config field `defaultLocale` in `client.config.json`, **decoupled from the existing `defaultLanguage`** (which agents use — leave it untouched).
- **Resolution order:** cookie `locale` → config `defaultLocale` → `"en"` fallback. `defaultLanguage` is NEVER used for UI locale resolution.
- **Normalization:** any value other than `de`/`en` (e.g. `tr`, empty, malformed) → `"en"`.
- **Proof surface for Phase 1:** the LANDING PAGE only (Header + 6 section components). No booking/admin/GDPR surfaces in this phase.

## HARD CONSTRAINTS (re-verify each in the self-verification gate)
- `packages/**` is FROZEN — never modify (this includes the Resend email templates in `packages/integrations/email/**`).
- `apps/web/app/api/lead/route.ts` — DO NOT MODIFY; request/response contract stays byte-identical.
- SENSITIVE files NOT touched in Phase 1: `apps/web/components/BookingForm.tsx`, `apps/web/components/SlotPicker.tsx`, `apps/web/components/DatePicker.tsx`. Leave them fully untouched.
- `middleware.ts` — do NOT modify (rate-limit + admin auth live there).
- `localStorage` / `sessionStorage` / any browser storage — FORBIDDEN. Locale persistence = cookie only (`document.cookie`).
- CSS: only existing `var(--color-*)` tokens and existing classes (reuse `.floating-controls` / `.theme-toggle` from `ThemeToggle.tsx`). No new colors, no invented classes.
- Keep/add `export const dynamic = "force-dynamic"` on every route you touch; never remove an existing one.
- No DB schema changes, no migrations.
- The AI model string `"claude-sonnet-4-20250514"` stays exactly as-is wherever it appears.
- Date/time formatting stays in `lib/vienna-helpers.ts` (`formatToParts` + `Date.UTC`). Do NOT duplicate or replace it in the i18n layer. i18n handles UI strings only.

## i18n QUALITY RULES
- German uses the formal **Sie** register throughout (e.g. "Buchen Sie Ihren Termin"). Never informal "du". Existing copy already uses Sie — keep it.
- Set `<html lang>` and page metadata (`<title>`/description) to match the active locale.
- Use placeholder interpolation for dynamic values (`{name}`, `{count}`) — never string-concatenate translated fragments.
- German runs ~30% longer than English; verify nav items, headings, buttons do not overflow/wrap badly in EITHER locale. Report any layout risk.

## MULTI-TENANT RULES (non-negotiable)
- No hardcoded salon NAME/contact/colors in JSX — `clientName` etc. keep coming from config. (UI label strings ARE allowed to live in the dictionaries; that is the point of this sprint.)
- Must work for both `demo-salon` AND `elegant-nails-vienna` with no code changes.
- Optional config fields stay conditionally rendered — never crash on a missing field.

---

## STEP 0 — VERIFY BEFORE EDITING (read-only; STOP if mismatch)
1. Confirm these files exist and match expectations:
   - `apps/web/app/layout.tsx` (hardcoded `lang="de"`, static `metadata`, mounts `<ThemeToggle/>`)
   - `apps/web/app/page.tsx` (imports from `components/sections/*`)
   - `apps/web/components/Header.tsx` + `apps/web/components/sections/{HeroSection,ServicesSection,GalleryTeamSection,TestimonialsSection,StandortSection,CtaFooterSection}.tsx`
   - `apps/web/lib/load-client-config.ts` (exposes `ClientConfig`, has `defaultLanguage`)
   - `apps/web/components/ThemeToggle.tsx` (uses `.floating-controls` / `.theme-toggle`)
2. Confirm BOTH `clients/demo-salon/client.config.json` AND `clients/elegant-nails-vienna/client.config.json` exist and are valid JSON.
3. Confirm no i18n library is installed (no next-intl / react-i18next in `package.json`).
If any of the above is wrong, STOP and report what differs. Otherwise proceed.

## TARGET FILES
NEW:
- `apps/web/lib/i18n/locales.ts`
- `apps/web/lib/i18n/dictionaries/de.json`
- `apps/web/lib/i18n/dictionaries/en.json`
- `apps/web/lib/i18n/dictionary.ts`
- `apps/web/lib/i18n/server.ts`
- `apps/web/lib/i18n/I18nProvider.tsx`
- `apps/web/components/LocaleToggle.tsx`
- `apps/web/lib/i18n/__tests__/locale.test.ts`

EDIT:
- `apps/web/app/layout.tsx`
- `apps/web/components/Header.tsx`
- `apps/web/components/sections/HeroSection.tsx`
- `apps/web/components/sections/ServicesSection.tsx`
- `apps/web/components/sections/GalleryTeamSection.tsx`
- `apps/web/components/sections/TestimonialsSection.tsx`
- `apps/web/components/sections/StandortSection.tsx`
- `apps/web/components/sections/CtaFooterSection.tsx`
- `clients/demo-salon/client.config.json` (add `"defaultLocale": "en"`)
- `clients/elegant-nails-vienna/client.config.json` (add `"defaultLocale": "en"`)

DO NOT TOUCH any other file.

## IMPLEMENTATION STEPS (ordered)
1. **`locales.ts`** — `export type Locale = "de" | "en";` `export const LOCALES: Locale[] = ["de","en"];` `export const FALLBACK_LOCALE: Locale = "en";` `export function normalizeLocale(value: unknown): Locale` (returns `en` for anything not in LOCALES).
2. **`dictionaries/de.json`** — extract EVERY user-facing landing string VERBATIM from `Header.tsx` + the 6 sections into nested keys. Suggested namespaces: `meta`, `nav`, `hero`, `services`, `gallery`, `team`, `testimonials`, `trust`, `standort`, `cta`, `footer`. Keep the hardcoded service/team/testimonial content as keyed strings (Phase 1 does not move them to config). German must be Sie-register (it already is — copy as-is).
3. **`dictionaries/en.json`** — faithful English translations of every `de.json` key, same key structure. Professional, concise salon English.
4. **`dictionary.ts`** — `import de from "./dictionaries/de.json"; import en from "./dictionaries/en.json";` derive `export type Dictionary = typeof de;` and `export function getDictionary(locale: Locale): Dictionary` returning `locale === "de" ? de : en`. (Type both files against `Dictionary` so a missing/extra key is a typecheck error.)
5. **`server.ts`** — `import { cookies } from "next/headers";` `export async function getLocale(): Promise<Locale>` (Next 15 `cookies()` is async): read `locale` cookie → `normalizeLocale`; if absent, read `loadClientConfig().defaultLocale` → `normalizeLocale`; else `FALLBACK_LOCALE`. Must never throw (wrap config read in try/catch → fallback).
6. **`I18nProvider.tsx`** — `"use client"`. Props `{ locale: Locale; dict: Dictionary; children }`. Provides context; export `useI18n()` returning `{ locale, dict }`. (Phase 1 client consumer is only LocaleToggle, but provider is the foundation for later phases.)
7. **`LocaleToggle.tsx`** — `"use client"`. Reads current locale via `useI18n()`. Renders a DE/EN switch reusing the `.theme-toggle` button style (no new class). On click: set the other locale via `document.cookie = "locale=<l>; path=/; max-age=31536000; samesite=lax"` then `useRouter().refresh()`. No localStorage.
8. **`layout.tsx`** — add `export const dynamic = "force-dynamic";`. In the component: `const locale = await getLocale(); const dict = getDictionary(locale);` set `<html lang={locale}>`. Replace static `export const metadata` with `export async function generateMetadata(): Promise<Metadata>` that returns localized `title`/`description`/OG `locale` (`de_AT` vs `en`) from `dict.meta`. Wrap `{children}` in `<I18nProvider locale={locale} dict={dict}>`, and render `<LocaleToggle/>` next to `<ThemeToggle/>` inside the existing floating-controls area.
9. **`Header.tsx` + 6 sections** — these are server components: `const dict = getDictionary(await getLocale());` then replace each hardcoded literal with the matching `dict.*` value. Keep all markup, classes, structure, images, `clientName` (from config) identical. Only strings change.
10. **`client.config.json` ×2** — add `"defaultLocale": "en"`. Do NOT change `defaultLanguage`.
11. **`__tests__/locale.test.ts`** — unit tests: (a) `normalizeLocale` maps `de`→`de`, `en`→`en`, `tr`/`""`/`undefined`→`en`; (b) cookie present → that locale; (c) cookie absent → config `defaultLocale`; (d) config missing/invalid → `en`; (e) de.json and en.json have identical key sets (parity). Mock `next/headers` `cookies()` as needed.

## ACCEPTANCE CRITERIA (must all pass)
- Clicking the toggle flips the entire landing page DE↔EN; the choice survives a full page reload (cookie).
- `<html lang>` and the tab title/metadata match the active locale.
- No cookie → demo shows `defaultLocale` (`en`); a `tr` cookie or `tr` config → `en`.
- `elegant-nails-vienna` renders correctly with NO code change.
- All German is Sie-register; no nav item / heading / button overflows or wraps badly in either locale.
- `pnpm typecheck` → 0 errors; `pnpm test` → all green including the new i18n tests.
- No `localStorage`/`sessionStorage` anywhere; only the `locale` cookie.
- No sensitive/frozen file modified.

## SELF-VERIFICATION GATE (run before committing; report each as pass/fail)
- [ ] No frozen path touched (`packages/**`, `/api/lead`, `middleware.ts`).
- [ ] `BookingForm.tsx`, `SlotPicker.tsx`, `DatePicker.tsx` untouched (git diff shows them absent).
- [ ] No localStorage/sessionStorage added; cookie only.
- [ ] Every CSS value used is an existing `var(--color-*)` token / existing class.
- [ ] `force-dynamic` present on `layout.tsx`; none removed elsewhere.
- [ ] Only the listed TARGET FILES appear in `git diff --name-only`.
- [ ] de.json / en.json key sets are identical (parity test green).
- [ ] German strings are Sie-register; spot-checked longest EN/DE strings for overflow.

## FINISH WITH
```bash
pnpm typecheck && pnpm test && git add . && git commit -m "feat(i18n): Phase 1 — DE/EN infra (cookie toggle, config defaultLocale) + localized landing page" && git push origin main
```
Then print: the `git diff --name-only`, the exact passing test count, and a one-line note on any layout-overflow risk you observed. Do NOT begin Phase 2.
