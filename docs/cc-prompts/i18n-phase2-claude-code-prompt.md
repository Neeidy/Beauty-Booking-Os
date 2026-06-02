# CLAUDE CODE PROMPT — Beauty Booking OS i18n Sprint · PHASE 2 (Booking Flow)

> Copy-paste this whole block into Claude Code at the repo root.
> Phase 1 is DONE and committed (321 tests green). Build ONLY Phase 2. Do not start Phase 3.
> Decisions below are LOCKED. Do not re-litigate. If any assumption is wrong, STOP and report before editing.

---

## ROLE & MODE
You are a senior frontend architect executing PHASE 2 of the DE/EN i18n sprint. Loop: STEP 0 verify → execute exactly as specced → self-verification gate → full test gate → commit & push → SHORT verdict report. Touch ONLY the TARGET FILES. Do not begin Phase 3.

## WHAT ALREADY EXISTS (Phase 1 — reuse, do not rebuild)
- `apps/web/lib/i18n/locales.ts` → `Locale = "de"|"en"`, `LOCALES`, `FALLBACK_LOCALE="en"`, `normalizeLocale()`.
- `apps/web/lib/i18n/dictionary.ts` → `type Dictionary = typeof de`, `getDictionary(locale)`. Both `de.json`/`en.json` are typed against `Dictionary`, so **any key you add to one file MUST be added to the other or typecheck fails.**
- `apps/web/lib/i18n/server.ts` → `async getLocale()` (cookie → config `defaultLocale` → `"en"`).
- `apps/web/lib/i18n/I18nProvider.tsx` → `"use client"`, `useI18n()` returns `{ locale, dict }`. **No `t()` helper — access strings directly, e.g. `dict.booking.stepLeistung`.** Provider is mounted in `app/layout.tsx` and wraps ALL routes, so client components under `/booking` can call `useI18n()`.
- `apps/web/lib/i18n/dictionaries/de.json` + `en.json` already have namespaces: `meta, nav, hero, services, gallery, team, testimonials, trust, standort, cta, footer`. Keys are camelCase; emoji live inline inside the string values. **Match this style.** You will ADD a new top-level `booking` namespace (and nothing else).
- Access patterns to reuse:
  - Server component: `const dict = getDictionary(await getLocale());` then `dict.booking.*`. Add `export const dynamic = "force-dynamic";`.
  - Client component: `const { dict, locale } = useI18n();` then `dict.booking.*`.

## SCOPE — Booking flow only
Customer-facing booking surfaces: the booking page chrome, the multi-step `BookingForm`, the `SlotPicker` (incl. its waiting-list sub-form), the Zod validation messages, and the thank-you page. GDPR/Datenschutz pages are Phase 3 — do NOT touch them.

## HARD CONSTRAINTS (re-verify each in the gate)
- `packages/**` FROZEN (incl. `packages/integrations/email/**`). `app/api/lead/route.ts` DO NOT MODIFY. `middleware.ts` DO NOT MODIFY. DB schema FROZEN.
- `apps/web/components/DatePicker.tsx` — **leave fully untouched** (its German weekday/aria labels stay; out of Phase 2 scope).
- `localStorage`/`sessionStorage` FORBIDDEN. CSS: only existing `var(--color-*)` tokens / existing classes — no new colors/classes.
- Keep/add `export const dynamic = "force-dynamic"` on every route you touch; never remove one.
- German = formal **Sie** throughout. Date/time logic stays as-is — do NOT introduce new date helpers and do NOT touch `lib/vienna-helpers.ts`.
- `"claude-sonnet-4-20250514"` stays exactly as-is wherever present.

## SENSITIVE FILES — `BookingForm.tsx` and `SlotPicker.tsx`
These are sensitive. The rule is **string-only**: replace hardcoded display literals with dictionary lookups. Do NOT change state, effects, control flow, props shape, the reservation/countdown logic, the submit flow, or the step logic. There are exactly THREE explicitly-approved minimal exceptions, listed below — make ONLY these, nothing more:

1. **Add `const { dict, locale } = useI18n();`** near the top of each component (and inside `WaitingListForm`, which also needs `useI18n()`).
2. **Zod schema wiring (BookingForm only):** swap the static schema for a localized one built from the dict (see STEP 4). Only the resolver construction line changes; the form fields, validation rules, `.refine`, and all error-render sites stay identical.
3. **Locale to API (BookingForm only):** the body currently sends `language: "de"` hardcoded → send the active locale instead: `language: locale`. (No other change to the request. Flag this in the verdict.)

## DO NOT TRANSLATE (staff-facing data, must stay German)
Inside `BookingForm.onSubmit`, the strings assembled into `rawMessage` / `notes` are read by salon staff in the admin panel, NOT shown to the customer. **Keep them German, hardcoded, exactly as-is:** `"Mitarbeiter-Wunsch: …"`, and the `messageParts` labels `"Name:"`, `"Leistung:"`, `"Termin: … um …"`, `"Notiz:"`. Do not route these through the dictionary.

---

## STEP 0 — VERIFY BEFORE EDITING (read-only; STOP if mismatch)
1. `apps/web/components/BookingForm.tsx` — `"use client"`, imports `{ bookingFormSchema, type BookingFormData }` from `../lib/booking-form-schema`, uses `resolver: zodResolver(bookingFormSchema)`, has the `STEPS`/`step` state and German step UI strings.
2. `apps/web/components/SlotPicker.tsx` — `"use client"`, contains MIXED-language status strings (Turkish: "Saatler yüklenemedi…", "Önce tarih seçin", "Müsait saatler yükleniyor…", "Dolu", "Bu slot az önce doldu.", "Rezervasyon süresi doldu…", "Bu gün için müsait saat bulunmuyor"; German: "Dieser Tag ist nicht verfügbar…", "Warteliste beitreten", etc.) plus the inner `WaitingListForm`.
3. `apps/web/lib/booking-form-schema.ts` — single `bookingFormSchema` + `BookingFormData`; confirm it is imported ONLY by `BookingForm.tsx` (grep). 
4. `apps/web/app/booking/page.tsx` and `apps/web/app/booking/thank-you/page.tsx` — server components, module-level `loadClientConfig()`, static `metadata`, German UI strings.
5. Confirm `useI18n` returns `{ locale, dict }` and there is NO `t()` helper.
If anything differs, STOP and report. Otherwise proceed.

## TARGET FILES
EDIT:
- `apps/web/lib/i18n/dictionaries/de.json` (add `booking` namespace)
- `apps/web/lib/i18n/dictionaries/en.json` (add `booking` namespace — identical keys)
- `apps/web/lib/booking-form-schema.ts` (localized schema factory)
- `apps/web/components/BookingForm.tsx` (string-only + 3 approved exceptions)
- `apps/web/components/SlotPicker.tsx` (string-only)
- `apps/web/app/booking/page.tsx` (locale + dict + generateMetadata + force-dynamic)
- `apps/web/app/booking/thank-you/page.tsx` (locale + dict + generateMetadata + force-dynamic)
- `apps/web/lib/i18n/__tests__/` (add a Phase-2 test file, e.g. `booking-schema.test.ts`)

DO NOT TOUCH any other file. Especially not `DatePicker.tsx`, `app/api/**`, `packages/**`, `middleware.ts`.

## IMPLEMENTATION STEPS (ordered)
1. **Dictionaries — add a `booking` namespace** to BOTH `de.json` and `en.json` (identical key sets). Cover every customer-facing string in the four files. Suggested structure (extract the German verbatim from the components; write faithful concise EN; Sie-register):
   - `booking.back` ("← Zurück")
   - `booking.meta.bookTitle` (page `<title>`, with `{clientName}` placeholder), `booking.meta.bookDescription`, `booking.meta.thanksTitle`, `booking.meta.thanksDescription`
   - `booking.steps` → `service`, `appointment`, `data`, `confirmation` (the `STEPS` stepper labels: Leistung/Termin/Daten/Bestätigung)
   - `booking.step1` → `title`, `sub`, `staffLabel`, `staffAny` ("Egal — nächster verfügbarer"), `next`, `pickServiceFirst`
   - `booking.step2` → `title`, `subAvailableFor` (use `{service}` / `{duration}` placeholders), `back`, `next`, `pickSlotHint`
   - `booking.step3` → `title`, `sub`, `nameLabel`, `namePlaceholder`, `emailLabel`, `emailPlaceholder`, `phoneLabel`, `phonePlaceholder`, `notesLabel`, `optional`, `notesPlaceholder`, `back`, `next`
   - `booking.step4` → `title`, `sub`, `service`, `duration`, `staff`, `date`, `time`, `customer`, `total`, `payOnSite`, `back`, `submit` ("Termin verbindlich buchen"), `submitting` ("Wird gesendet…"), `unit` ("Min")
   - `booking.gdpr` → `dataProcessing` (with the inline link text split if needed — keep the `<a>` working), `privacyLink` ("Datenschutzerklärung lesen"), `reminders`, `marketing`
   - `booking.errors` (form-level submit errors raised inside `onSubmit`) → `pickTime`, `pickValidSlot`, `generic`, `connection`
   - `booking.slots` → `pickDateFirst`, `loading`, `loadError`, `retry`, `dayUnavailable`, `noSlots`, `full` ("Dolu"), `reservedCountdown` (use `{minutes}`/`{seconds}` placeholders), `slotJustTaken`, `reserveFailed`, `connectionError`, `reservationExpired`, `allBooked`, `joinWaitlist`, `onWaitlist`
   - `booking.waitlist` → `namePlaceholder`, `emailPlaceholder`, `phonePlaceholder`, `gdprConsent`, `submit` ("Auf Warteliste eintragen"), `submitting` ("Bitte warten..."), `errNameEmail`, `errGdpr`, `errGeneric`, `errNetwork`
   - `booking.thanks` → all thank-you page strings: `heading`, `lead` (with `{hours}`=24 or keep static), `questions`, `rebookHeading`, `rebookText`, `rebookCta`, `reviewCta`, `backHome`, `privacy`
2. **`booking-form-schema.ts` → localized factory.** Replace the static schema with a factory that takes the messages from the dict and returns the schema. Keep the exported type stable. Pattern:
   ```ts
   import { z } from "zod";
   import type { Dictionary } from "./i18n/dictionary";   // adjust relative path

   export function makeBookingFormSchema(dict: Dictionary) {
     const e = dict.booking.schema;   // add a booking.schema.* group with the message keys below
     return z.object({
       customerName: z.string().min(2, e.nameMin),
       customerEmail: z.string().email(e.emailInvalid).optional().or(z.literal("")),
       customerPhone: z.string().min(6, e.phoneInvalid).optional().or(z.literal("")),
       serviceId: z.string().min(1, e.servicePick),
       notes: z.string().max(500, e.notesMax).optional(),
       gdprDataProcessing: z.literal(true, { errorMap: () => ({ message: e.gdprRequired }) }),
       gdprReminders: z.boolean(),
       gdprMarketing: z.boolean(),
     }).refine((d) => d.customerEmail || d.customerPhone, { message: e.contactRequired, path: ["customerEmail"] });
   }

   export type BookingFormData = z.infer<ReturnType<typeof makeBookingFormSchema>>;
   ```
   Add the matching `booking.schema` group to BOTH dictionaries: `nameMin, emailInvalid, phoneInvalid, servicePick, notesMax, gdprRequired, contactRequired` (German values = the current hardcoded messages, verbatim).
3. **`BookingForm.tsx`** — string-only + the 3 approved exceptions:
   - Add `const { dict, locale } = useI18n();`.
   - Build the schema once: `const schema = useMemo(() => makeBookingFormSchema(dict), [dict]);` and use `resolver: zodResolver(schema)`. Update the import to `makeBookingFormSchema`. The error-render `<span>{errors.X.message}</span>` sites stay UNCHANGED (messages are already localized by the schema).
   - Replace every customer-facing literal (stepper labels via a `STEPS` built from `dict.booking.steps`, step titles/subs, field labels/placeholders, buttons, the summary labels, the GDPR consent texts, and the `setSubmitError(...)` strings) with `dict.booking.*`. Use placeholder interpolation for `{service}`, `{duration}`, etc. — no string concatenation of translated fragments.
   - Change `language: "de"` → `language: locale` in the submit body. (Flag in verdict.)
   - Summary date: keep the EXISTING `toLocaleDateString` call; only parametrize its locale arg as `locale === "de" ? "de-AT" : "en-GB"`. Do not add any other date logic. (Flag in verdict.)
   - DO NOT translate the `rawMessage`/`notes` staff labels (see "DO NOT TRANSLATE").
4. **`SlotPicker.tsx`** — pure string-only. Replace every status/UI literal (the Turkish ones AND the German ones) with `dict.booking.slots.*`. Add `const { dict } = useI18n();` to `SlotPicker` and to `WaitingListForm` (use `dict.booking.waitlist.*` there). The countdown line uses `{minutes}`/`{seconds}` interpolation. No logic/effect/ref/control-flow changes.
5. **`booking/page.tsx`** — add `export const dynamic = "force-dynamic";`. Replace static `metadata` with `export async function generateMetadata(): Promise<Metadata>` reading `getDictionary(await getLocale())` + `loadClientConfig().clientName` (interpolate into `booking.meta.bookTitle`). In the component, `const dict = getDictionary(await getLocale());` and translate the "← Zurück" link via `dict.booking.back`. Keep `config.clientName` in the brand spots.
6. **`thank-you/page.tsx`** — same pattern: `force-dynamic`, `generateMetadata`, `const dict = getDictionary(await getLocale());`, translate all UI strings via `dict.booking.thanks.*`. Keep all config-driven contact logic (whatsapp/review URL conditionals) untouched.
7. **Tests** — add `apps/web/lib/i18n/__tests__/booking-schema.test.ts`: assert `makeBookingFormSchema(getDictionary("de"))` produces the German message on an invalid name, and `("en")` produces the English one; assert the contact-required refine fires. The existing de/en parity test must stay green (it will, since you add identical keys to both).

## ACCEPTANCE CRITERIA (must all pass)
- The entire booking flow (page chrome, all 4 steps, slot picker incl. countdown + waiting list, validation errors, thank-you page) renders fully in the active locale; toggling DE/EN switches everything.
- ALL former Turkish strings in `SlotPicker` are gone (now keyed in both dictionaries).
- Zod validation messages appear in the active locale.
- `<title>`/metadata on `/booking` and `/booking/thank-you` are localized; `clientName` still comes from config.
- Staff-facing `rawMessage`/`notes` labels remain German.
- `elegant-nails-vienna` works with NO code change.
- `DatePicker.tsx` is byte-identical (untouched).
- `pnpm typecheck` → 0 errors; `pnpm test` → all green (incl. new + parity tests).
- No `localStorage`/`sessionStorage`; no new CSS class/color; reservation/countdown behavior unchanged.

## SELF-VERIFICATION GATE (report each pass/fail before committing)
- [ ] `git diff --name-only` shows ONLY the listed TARGET FILES (no `DatePicker.tsx`, no `api/**`, no `packages/**`, no `middleware.ts`).
- [ ] `BookingForm.tsx` changes are string-only + exactly the 3 approved exceptions (schema wiring, `language: locale`, date-arg) — nothing else.
- [ ] `SlotPicker.tsx` changes are string-only; no effect/ref/control-flow edits.
- [ ] de.json / en.json key sets identical (parity test green); new `booking` namespace present in both.
- [ ] Staff-facing notes labels still German.
- [ ] No localStorage/sessionStorage; only `var(--color-*)`/existing classes.
- [ ] `force-dynamic` on both touched routes.
- [ ] German is Sie-register; longest DE strings ("Termin verbindlich buchen", "Auf Warteliste eintragen", step subs) checked for overflow in the booking card in both locales.

## FINISH WITH
```bash
pnpm typecheck && pnpm test && git add . && git commit -m "feat(i18n): Phase 2 — localized booking flow (form, slots, validation, thank-you)" && git push origin main
```
Then print a SHORT verdict: `git diff --name-only`, exact passing test count (and delta vs 321), each gate item pass/fail, and explicitly flag the two value-changes (`language: locale`, the summary date locale arg) plus any layout-overflow risk you observed. Do NOT begin Phase 3.
