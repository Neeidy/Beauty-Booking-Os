# Sprint — Phase 0 Step 2: Multi-Tenant Runtime CSS Injection

**Workstream:** Website Redesign Foundation
**Phase:** 0 (Foundation — before any design tool)
**Step:** 2 of 4
**Prerequisite:** Phase 0 Step 1 complete (token pipeline via `tailwind.config.ts` + `branding.json`)
**Backend status:** FROZEN. Do not touch `packages/agents/**`, `packages/core/**`, `packages/shared/**`.

---

## Context

Phase 0 Step 1 established `branding.json` as the single source of truth for design tokens and wired `tailwind.config.ts` to read from it at build time. That solved the build-time token problem.

But there's still a runtime problem: `apps/web/app/globals.css` has a hardcoded `:root` block with CSS custom properties (`--color-primary`, `--color-secondary`, etc.) that match the demo-salon brand. These values are used throughout components via `style={{ color: "var(--color-primary)" }}` inline styles. If a different salon slug is used at runtime, the components still render demo-salon colors because the CSS vars are statically defined in `globals.css`.

Elegant Nails Vienna has its own `branding.json` with a completely different palette (navy `#1A1A2E`, red `#E94560`), but that palette is never injected into the running app. The multi-tenant clone test fails at the frontend layer: you can clone a salon via config, but the UI always looks like demo-salon.

This step fixes that. We will inject the correct CSS custom properties at runtime based on the active client slug, so the same code renders different brands depending on env configuration. No components change. No `globals.css` values change. Only the mechanism by which the `:root` values get set.

---

## Task

Move brand color CSS custom properties out of `globals.css` and into a runtime-injected `<style>` block in the root layout. The layout reads the client slug from `NEXT_PUBLIC_DEFAULT_CLIENT_SLUG`, loads the corresponding `branding.json` via the existing `loadBranding()` utility, and emits a `:root` block with that brand's tokens directly into the HTML `<head>`.

Result: changing the env var and restarting `pnpm dev` produces a visually different brand with zero code changes and zero build changes.

---

## Target Files

**Modified:**
- `apps/web/app/layout.tsx` — inject runtime CSS custom properties from loaded branding
- `apps/web/app/globals.css` — remove the brand color `:root` block (font vars stay)
- `apps/web/lib/load-branding.ts` — add a helper that converts loaded tokens into a CSS string

**Created:**
- `apps/web/lib/branding-to-css.ts` — pure function that takes a `BrandTokens` object and returns a CSS `:root { ... }` string. Unit-testable.
- `apps/web/lib/__tests__/branding-to-css.test.ts` — unit tests for the converter
- `apps/web/__tests__/e2e/multi-tenant-branding.spec.ts` — Playwright test that verifies different slugs produce different CSS output

**Not touched:**
- Any file under `apps/web/components/**` (components must remain unchanged)
- Any file under `packages/**` (backend frozen)
- `tailwind.config.ts` (build-time pipeline is already correct from Step 1)

---

## Steps

### 1. Read current state first

Report the content of these files before modifying anything:

```
cat apps/web/app/layout.tsx
cat apps/web/app/globals.css
cat apps/web/lib/load-branding.ts
cat clients/demo-salon/branding.json
cat clients/elegant-nails-vienna/branding.json
```

Confirm the following before proceeding:
- `layout.tsx` is a server component (no `"use client"` directive at top)
- `globals.css` has a `:root` block with `--color-*` custom properties
- `load-branding.ts` exports `loadBranding()` and the `BrandTokens` type from Step 1
- Both `branding.json` files have the `colors` object with `primary`, `secondary`, `accent`, `background`, `text`, `textMuted`

If any of these assumptions are wrong, STOP and report what you found.

### 2. Create the CSS converter utility

Create `apps/web/lib/branding-to-css.ts`:

- Export a pure function `brandingToCss(tokens: BrandTokens): string`
- Function takes a `BrandTokens` object and returns a string containing a `:root { ... }` CSS block
- The block must include ALL color properties:
  - `--color-primary: {tokens.colors.primary};`
  - `--color-secondary: {tokens.colors.secondary};`
  - `--color-accent: {tokens.colors.accent};`
  - `--color-background: {tokens.colors.background};`
  - `--color-text: {tokens.colors.text};`
  - `--color-text-muted: {tokens.colors.textMuted};`
- The function must NOT include font variables (those stay in `globals.css` because fonts are loaded by Next.js font optimization, not from `branding.json`)
- The function must be deterministic: same input → byte-identical output
- Do not use template engines or heavy libraries — plain string concatenation is fine
- Add basic input validation: if any color value is missing or not a string, throw a descriptive Error

Import the `BrandTokens` type from `./load-branding`.

### 3. Write unit tests for the converter

Create `apps/web/lib/__tests__/branding-to-css.test.ts` using Vitest:

Test cases (minimum):
1. **Happy path — demo-salon tokens** — Pass a full demo-salon-shaped `BrandTokens` object, assert the output contains all six `--color-*` lines with the correct values
2. **Happy path — elegant-nails tokens** — Pass navy/red tokens, assert the output reflects those values (NOT demo-salon values)
3. **Different inputs produce different outputs** — Call the function twice with different tokens, assert strings are not equal
4. **Missing color throws** — Pass an object missing `colors.primary`, assert it throws
5. **Non-string color throws** — Pass `colors.primary: 123`, assert it throws
6. **Output contains `:root` selector** — Assert the returned string includes `:root {`
7. **Output is valid CSS-ish** — Assert the string has matching braces and ends with `}`

Use Vitest `describe`/`it`/`expect`. No mocking needed — the function is pure.

### 4. Update `load-branding.ts` (optional helper export)

In `apps/web/lib/load-branding.ts`, re-export the converter for convenience:

```typescript
export { brandingToCss } from "./branding-to-css";
```

This is optional cosmetic change — callers can import from either location. Do this only if it fits the existing file structure cleanly. If `load-branding.ts` currently has only the loader and type, leave it alone and import `brandingToCss` directly where needed.

### 5. Modify `apps/web/app/layout.tsx`

This is the runtime injection point.

- Import `loadBranding` and `brandingToCss` from `@/lib/load-branding` (or adjust path based on existing imports)
- At the top of the default exported `RootLayout` function (before the return), call:
  ```typescript
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CLIENT_SLUG || "demo-salon";
  const branding = loadBranding(slug);
  const brandCss = brandingToCss(branding);
  ```
- In the JSX, inside `<head>` (or directly as a child of `<html>` if there's no explicit `<head>` — Next.js 15 App Router handles this), add a `<style>` tag:
  ```tsx
  <style dangerouslySetInnerHTML={{ __html: brandCss }} />
  ```
- Place the `<style>` tag BEFORE any other stylesheet links so that `globals.css` (which imports Tailwind) can still override via specificity if needed. In practice, `globals.css` will no longer define these variables, so order doesn't matter functionally, but correct ordering is still good hygiene.
- Keep all existing font loading (`Playfair_Display`, `Inter` from `next/font/google`) exactly as it is. Do not change font handling.
- The layout must remain a server component — no `"use client"` directive.

### 6. Modify `apps/web/app/globals.css`

- Find the `:root` block that contains the `--color-*` custom properties
- Remove ONLY the `--color-*` lines (and the comment added in Step 1 that references them)
- Keep `--font-heading` and `--font-body` CSS vars if they exist — those are linked to Next.js font loading, not to `branding.json`, and must stay
- If the `:root` block becomes empty after removing colors, remove the entire block
- Do NOT touch any other CSS in this file (Tailwind imports, `@config` directive, any global resets, any utility overrides)

Add a comment at the top of the file (after any `@import` lines):

```css
/* Brand color CSS custom properties are injected at runtime by
   apps/web/app/layout.tsx via brandingToCss(). Do not redefine them here. */
```

### 7. Write Playwright E2E test for multi-tenant rendering

Create `apps/web/__tests__/e2e/multi-tenant-branding.spec.ts`:

Test scenario:
1. Start the app with `NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=demo-salon`
2. Navigate to `/`
3. Assert the injected `<style>` tag in `<head>` contains `--color-primary: #2D2926` (demo-salon brown)
4. Assert it does NOT contain `#1A1A2E` (elegant-nails navy)

Since Playwright spins up a single dev server per test run, testing two different env values in a single run is tricky. Use this pragmatic approach instead:

- Write ONE test that asserts the current env produces the expected branding for that env
- Read `process.env.NEXT_PUBLIC_DEFAULT_CLIENT_SLUG` in the test
- If it's `demo-salon` (or unset), assert demo-salon colors
- If it's `elegant-nails-vienna`, assert elegant-nails colors
- Include a second test that verifies the `<style>` tag exists at all and has non-empty content

Also create `apps/web/__tests__/e2e/README.md` (if it doesn't exist) with a short note explaining that multi-tenant switching is verified by running the test suite twice with different env values, and document the exact commands:

```
# Test demo-salon branding
NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=demo-salon pnpm --filter @beauty/web test:e2e multi-tenant-branding

# Test elegant-nails branding
NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=elegant-nails-vienna pnpm --filter @beauty/web test:e2e multi-tenant-branding
```

If Playwright is not yet configured for `apps/web` or the e2e script doesn't exist, STOP at this substep and report what's missing. Do not invent Playwright config — that's a separate scoped task.

### 8. Verification — the must-pass gate

Run in this exact order. STOP and report on the first failure.

1. **TypeScript check:**
   ```
   pnpm --filter @beauty/web typecheck
   ```
   (or whatever the project's typecheck script is — if it doesn't exist, run `pnpm --filter @beauty/web tsc --noEmit`)

2. **Unit tests (must include the new branding-to-css tests):**
   ```
   pnpm test
   ```
   Must show: previous 213 tests STILL passing + 7 new tests (from step 3) = 220 passing. If the count is different, report exactly which tests passed/failed/were added.

3. **Build:**
   ```
   pnpm --filter @beauty/web build
   ```
   Must succeed. If it fails, report the full error output before attempting a fix.

4. **Dev server smoke test (demo-salon):**
   ```
   NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=demo-salon pnpm dev &
   sleep 5
   curl -s http://localhost:3030/ | grep -o "color-primary:[^;]*"
   kill %1
   ```
   Expected output: `color-primary: #2D2926` (demo-salon brown)

5. **Dev server smoke test (elegant-nails-vienna):**
   ```
   NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=elegant-nails-vienna pnpm dev &
   sleep 5
   curl -s http://localhost:3030/ | grep -o "color-primary:[^;]*"
   kill %1
   ```
   Expected output: `color-primary: #1A1A2E` (elegant-nails navy)

   **This is THE critical test.** If steps 4 and 5 return the same value, the injection is not working and the whole step has failed. STOP and report.

6. **E2E test (if Playwright is configured):**
   ```
   NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=demo-salon pnpm --filter @beauty/web test:e2e multi-tenant-branding
   ```
   Must pass.

---

## Acceptance Criteria

All of these must be true before committing:

- [ ] `apps/web/lib/branding-to-css.ts` exists and exports a pure `brandingToCss()` function
- [ ] `apps/web/lib/__tests__/branding-to-css.test.ts` exists with at least 7 test cases, all passing
- [ ] `apps/web/app/layout.tsx` loads branding at request time and injects a `<style>` tag with runtime CSS custom properties
- [ ] `apps/web/app/globals.css` no longer contains `--color-*` custom properties in its `:root` block
- [ ] `apps/web/app/globals.css` still contains `--font-*` vars (fonts unchanged)
- [ ] No file under `apps/web/components/**` has been modified
- [ ] No file under `packages/**` has been modified
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` shows 220/220 passing (213 original + 7 new unit tests)
- [ ] `pnpm --filter @beauty/web build` succeeds
- [ ] Smoke test with `NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=demo-salon` returns `#2D2926` in the rendered HTML
- [ ] Smoke test with `NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=elegant-nails-vienna` returns `#1A1A2E` in the rendered HTML
- [ ] The two smoke tests return DIFFERENT values (proving multi-tenant injection works)

---

## What NOT To Do

- Do NOT modify any component file (Header, HeroSection, ServicesSection, CTASection, Footer, BookingForm, admin/*). Components already use `var(--color-*)` — they don't need to know injection changed.
- Do NOT move font loading out of `layout.tsx` or change how `next/font/google` works
- Do NOT add a client-side branding loader or any `"use client"` directive
- Do NOT introduce a new state management library, context provider, or theme provider
- Do NOT touch `tailwind.config.ts` — the build-time pipeline from Step 1 is correct and independent
- Do NOT commit if any acceptance criterion fails
- Do NOT invent Playwright configuration if it doesn't exist — report and stop

---

## Finish With

```
pnpm test && \
pnpm --filter @beauty/web build && \
git add . && \
git commit -m "feat(web): phase 0 step 2 — runtime multi-tenant CSS injection via layout.tsx" && \
git push
```

---

## Notes for the Architect Review (Post-Execution)

When reporting back, include:

1. Output of smoke tests 4 and 5 (the two `curl | grep` commands) — these prove the injection works
2. New test count (should be 220 total)
3. Any deviation from these steps and why (like the `git mv` vs `mv` deviation last time — that's fine, just document it)
4. Whether Playwright was already configured or if step 7 had to be skipped
5. Screenshot or description of what `/` looks like under each slug (if dev server was accessible)

This step unlocks Step 3 (hardcoded content → config) and Step 4 (clone test). Do not start those until this one is reviewed and approved.
