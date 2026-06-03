# CLAUDE CODE PROMPT — Redesign the language toggle (collapsible flag switcher, fixed alignment)

> Copy-paste into Claude Code at the repo root.
> This is a focused UI redesign of the LANGUAGE TOGGLE only. The i18n system (cookie + locale resolution) must keep working unchanged. Do NOT break the system. If anything is unclear, STOP and report.

## PROBLEM (diagnosed)
`.floating-controls` in `apps/web/app/globals.css` is `position: fixed; top: 16px; right: 20px; z-index: 200`. Both `ThemeToggle` (right:20px) and `LocaleToggle` (right:72px, a wide horizontal "DE · EN" pill) are pinned TOP-RIGHT, so on the landing page they overlap the header's "Jetzt buchen" CTA, and the alignment is poor on mobile, web, and admin.

## GOAL
Replace the language toggle with a small, on-brand, **collapsible flag switcher** that is cleanly aligned on EVERY page (landing, booking, thank-you, GDPR/legal, and all admin pages) on BOTH mobile and desktop, never overlapping the header CTA / booking topbar / admin sidebar / theme toggle / any FAB.

### Visual & behavior spec
- **Collapsed:** a small, rounded control (~36-40px tall) showing ONLY the CURRENT locale's flag (+ optional tiny chevron). Compact — not a wide text pill.
- **Expanded (on click/tap):** a small popover with two clearly-tappable options, each a flag + label: `🇦🇹 Deutsch` and `🇬🇧 English` (rendered as SVG flags, see below). Selecting one sets the locale and collapses. Clicking outside or pressing Esc collapses without changing.
- **Flags = inline SVG, NOT emoji.** Emoji flags (🇦🇹/🇬🇧) do NOT render as flags on Windows/Chrome-on-Windows (they show "AT"/"GB"). Use small inline SVGs:
  - DE → **Austria**: three equal horizontal bands red / white / red (Austrian red ≈ `#C8102E`).
  - EN → **United Kingdom**: a compact Union Jack SVG.
  Keep each flag ~18-22px wide with subtle rounded corners / 1px border so it reads as a flag chip.
- **Active state:** mark the currently-selected option (e.g. ring/check/bold) in the expanded list.
- **Accessibility:** the collapsed button has `aria-haspopup`/`aria-expanded` and an `aria-label` ("Sprache wählen / Choose language"); options are real `<button>`s with `aria-label`; Esc closes; focus-visible styles.

### Positioning requirement (the actual fix)
Reposition so it NEVER collides with page chrome on any page/viewport. Recommended approach: move the floating control cluster OUT of the top-right (where the header CTA lives) to a **bottom-right** fixed position, keeping the language switcher and the theme toggle together as a small neat cluster (stacked or in a row), with comfortable spacing and mobile safe-area padding. You may relocate the shared `.floating-controls` (both toggles move together) — that is acceptable and fixes alignment globally in one place. Whatever placement you choose, it MUST be verified (see verification) to not overlap: the landing header / "Jetzt buchen", the `.booking-topbar`, the admin sidebar/header, the theme toggle, and the `tweaks-fab` (bottom:20px right:20px — check if it's even rendered; avoid it).

## HARD CONSTRAINTS
- Keep the i18n behavior IDENTICAL: locale persisted via the `locale` cookie (`document.cookie`, no localStorage), then `router.refresh()`. Resolution via existing `getLocale`/`useI18n` unchanged. Only `de`/`en`.
- `packages/**`, `app/api/**`, `middleware.ts`, DB schema, frozen zones — untouched.
- Styling: use existing design tokens `var(--color-*)`, `var(--radius-*)`, `var(--shadow-*)` for the control's chrome to stay on-brand (the design system has no language toggle, so adding this control's CSS is allowed — but no off-brand hardcoded colors except the flag SVG fills, which are flag colors). You MAY add new CSS classes for this control in `globals.css` and remove the old `.floating-controls`-as-pill usage for the toggle.
- Must render correctly in BOTH light and dark theme (the `data-theme` ThemeToggle exists).
- 327 tests stay green; `pnpm typecheck` 0 errors.

## TARGET FILES (expected)
- `apps/web/components/LocaleToggle.tsx` (rewrite as the collapsible flag switcher; keep it `"use client"`, keep `useI18n` + cookie + `router.refresh()`).
- `apps/web/app/globals.css` (add the toggle/popover styles; adjust/relocate the floating cluster).
- `apps/web/app/layout.tsx` ONLY if you need to restructure how `<LocaleToggle/>` + `<ThemeToggle/>` are mounted (e.g. wrap both in one positioned cluster). Keep the `I18nProvider` wrapping intact.
- Do NOT touch `ThemeToggle.tsx` logic (you may move its position via the shared wrapper/CSS, but keep its behavior).
Report in STEP 0 the exact files you'll change.

## STEP 0 — VERIFY (read-only; STOP if mismatch)
1. Read `LocaleToggle.tsx`, `ThemeToggle.tsx`, the `.floating-controls`/`.theme-toggle` rules in `globals.css`, and the landing `Header.tsx` (to see the CTA it currently overlaps).
2. Check whether `tweaks-fab`/`tweaks-panel` is actually rendered anywhere (grep) so you avoid colliding bottom-right.
3. Confirm the locale cookie + `router.refresh()` mechanism (don't change it).

## ACCEPTANCE CRITERIA
- Language switcher is a compact collapsible flag control; collapsed shows current flag (Austria for DE, Union Jack for EN); expanded lets you pick either; selection sets the cookie and re-renders.
- Flags are inline SVG (render correctly on Windows).
- No overlap with header CTA / booking topbar / admin sidebar / theme toggle / FAB on landing, booking, thank-you, GDPR, and admin pages — at mobile (~390px) AND desktop (~1280px) widths.
- Works in light + dark theme; locale persists across reloads; DE/EN still switches all content.
- `pnpm typecheck` 0; `pnpm test` green.

## POST-TASK VERIFICATION (this is a VISUAL fix — verify visually, iterate until correct)
### Local + screenshots
1. `pnpm typecheck` (0) + `pnpm test` (green).
2. `pnpm --filter @beauty-booking/web build` then `... start` on 3030.
3. **Visual check via screenshots.** Install Playwright locally if needed (`pnpm dlx playwright install chromium` or add `@playwright/test` as a devDep) and capture screenshots of the language control area at TWO viewports — mobile `390x844` and desktop `1280x800` — for: `/`, `/booking`, `/admin/login`, and (logging in with the admin password from `apps/web/.env.local` `ADMIN_SECRET`, value `<ADMIN_SECRET — set in env>`) `/admin/dashboard`. Capture in BOTH locales (set `locale=de`/`en` cookie) and BOTH themes if feasible. INSPECT the screenshots: confirm the collapsed control and its expanded popover do not overlap the header CTA, sidebar, theme toggle, or page content, and look aligned. If any overlap/misalignment remains, FIX and re-screenshot — repeat until clean. (Playwright is dev-only; do not ship it. If you genuinely cannot run a browser, say so and hand the visual sign-off to the user with exact things to check — do not claim visual success unverified.)
### Commit & push
`pnpm typecheck && pnpm test && git add . && git commit -m "feat(ui): collapsible flag language switcher + fixed global alignment" && git push origin main`
### LIVE Vercel verification
Poll `https://beauty-booking-os-web.vercel.app/` until 200, no "Application error". Confirm `/`, `/booking`, `/admin/login` still load (de+en) with no error. Note that final visual sign-off on a real phone + desktop browser is the USER's — list exactly what to check (collapsed flag shows, expands, switches language, no overlap on landing/booking/admin, mobile + web).

## VERDICT (report)
`git diff --name-only`; test count (delta vs 327); the files changed and why; the chosen placement + how it avoids each collision; screenshot findings per viewport/page (or an explicit note if screenshots couldn't run); LIVE health table + commit SHA; the exact checklist for the user's phone/desktop eyeball. Iterate until the control is correct before declaring done.
