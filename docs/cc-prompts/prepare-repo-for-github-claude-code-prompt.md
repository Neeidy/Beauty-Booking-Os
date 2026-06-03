# CLAUDE CODE PROMPT — Prepare repo for public GitHub (security, README, metadata) — SYSTEM MUST NOT BREAK

> Copy-paste into Claude Code at the repo root.
> Remote is github.com/Neeidy/beauty-booking-os. Goal: make the repo safe + presentable to publish/share. Mostly docs/metadata + one security redaction. Do NOT change app code or behavior. If STEP 0 surfaces anything unexpected, STOP and report.

## ROLE & MODE
Senior engineer preparing a repo for public GitHub. Loop: STEP 0 audit → execute → verification gate (typecheck + test) → commit & push → report. Touch ONLY what's listed.

---

## PART 1 — SECURITY (do this first; highest priority)

### 1a. Leaked admin password — redact (REQUIRED)
The admin password `<ADMIN_SECRET — set in env>` was committed inside archived prompt docs:
- `docs/cc-prompts/i18n-phase4f-claude-code-prompt.md`
- `docs/cc-prompts/locale-toggle-redesign-claude-code-prompt.md`
Replace every occurrence of the literal `<ADMIN_SECRET — set in env>` in these (and ANY other tracked file — grep the whole repo) with `<ADMIN_SECRET — set in env>`. Do NOT leave the real value anywhere in tracked files.

### 1b. Secret scan (REQUIRED — report findings)
- Confirm `.env`, `.env.local`, `.env.*.local` are NOT tracked: `git ls-files | grep -E '^\.env'` → must return ONLY `.env.example` (or nothing). If a real `.env` is tracked, STOP and report.
- Grep the working tree (tracked files) for real secrets — expect ONLY placeholders in `.env.example`:
  `git grep -nE 'sk-ant-[A-Za-z0-9]{8}|eyJhbGciOiJ[A-Za-z0-9_-]{20}|re_[A-Za-z0-9]{12}|SERVICE_ROLE_KEY=eyJ[A-Za-z0-9]|postgresql://[^ ]*:[^ ]*@' -- . ':(exclude).env.example'` → expect ZERO. Report anything found.
- **Scan git HISTORY** for a previously-committed real `.env` or secrets:
  `git log --all --full-history --oneline -- .env .env.local "**/.env" "**/.env.local"` and `git log --all -p -S 'sk-ant-' -- . | head` and same for `SERVICE_ROLE_KEY=eyJ`. Report whether any real secret ever entered history.

### 1c. ACTION-FOR-USER note (put in the verdict, CC cannot do these)
Because `<ADMIN_SECRET — set in env>` is already in the pushed history, redacting the file does NOT remove it from history. State clearly in the verdict that the user must:
- **Rotate `ADMIN_SECRET`** to a new strong random value in Vercel (Project → Settings → Env) AND in local `.env.local`. (This makes the leaked value useless — the practical fix.)
- If history 1b finds any OTHER real secret (Supabase/Anthropic/Resend/DB), rotate those keys too.
- (Optional/advanced) scrub git history with `git filter-repo`/BFG if they want the leaked string gone from history entirely — rotation is sufficient for safety.

---

## PART 2 — README.md (create at repo root)
Write a professional, portfolio-grade `README.md`. Accurate to this repo (don't invent features). Include, in this order:
1. **Title** "Beauty Booking OS" + one-line tagline (multi-tenant, AI-assisted, bilingual salon booking platform).
2. **Links row**: Live demo → https://beauty-booking-os-web.vercel.app · Booking flow → /booking · (interactive showcase → docs/showcase/index.html once moved in Part 4).
3. **Overview** (2-3 sentences): config-driven multi-tenant platform — premium storefront + full admin back-office — built end to end.
4. **Key features** (bulleted): premium storefront + guided 4-step booking with live slot availability & hold-timer reservations & waiting list; full admin (dashboard, lead Kanban, CRM, calendar, settings, staff, rebooking, AI logs); AI agents (Claude) for lead intake/classification with confidence scoring + human-review escalation, all Zod-validated + cost-logged; full DE/EN i18n (formal "Sie", cookie-based, 730 parity-locked keys); GDPR (Austrian law — consent, export, anonymisation); multi-tenant via per-salon config.
5. **Tech stack** (table or list): Next.js 15 (App Router, TS), React 19, Supabase/PostgreSQL + Drizzle, Zod, BullMQ + Redis, Anthropic Claude API, Resend, pnpm + Turborepo monorepo, Vitest + Playwright, Vercel.
6. **Monorepo structure** (concise tree): `apps/web` (Next.js app), `packages/*` (db, core, agents, shared, config), `clients/{slug}` (per-tenant config), `docs/`.
7. **Getting started**: prerequisites (Node ≥20, pnpm ≥9); `pnpm install`; copy `.env.example` → `.env` and fill values (point to Supabase/Anthropic/Resend); `pnpm dev` (web on **port 3030**); `pnpm test`; `pnpm typecheck`; `pnpm build`.
8. **Internationalisation / Multi-tenant / GDPR**: a short paragraph each.
9. **Testing**: ~327 automated tests (Vitest); note the design-system/i18n parity tests.
10. **Deployment**: Vercel + Supabase; env vars set in the Vercel dashboard (never committed).
11. **Status / known issues**: link to `docs/known-issues.md`.
12. **License**: reference the LICENSE (Part 3).
13. **Author**: "Built by **Yigitcan Uk**" — LinkedIn https://www.linkedin.com/in/yigitcanuk/ · GitHub https://github.com/Neeidy.
Keep it clean, scannable, with sensible headings and a couple of badges (e.g. shields.io for Next.js / TypeScript / License) if easy. Do NOT fabricate metrics beyond what's in CLAUDE.md/known-issues.

## PART 3 — LICENSE (create at repo root)
Add a `LICENSE` file. Default: a short **proprietary / all-rights-reserved** notice (this is a real product showcased for portfolio):
`Copyright (c) 2026 Yigitcan Uk. All rights reserved. This source is published for portfolio and demonstration purposes; it may not be reused, redistributed, or used commercially without written permission.`
(If the owner later prefers MIT, that's a one-file swap — note this in the verdict.)
Set `"license"` in package.json accordingly (`"UNLICENSED"` for proprietary).

## PART 4 — package.json metadata + root tidy
- Root `package.json`: add `"description"`, `"author": "Yigitcan Uk"`, `"license": "UNLICENSED"`, `"repository": { "type": "git", "url": "https://github.com/Neeidy/beauty-booking-os.git" }`, and `"keywords"`. Keep `"private": true`. Do NOT change scripts/deps/engines.
- Move the interactive showcase: `git mv beauty-booking-os-portfolio.html docs/showcase/index.html` (create `docs/showcase/`), and reference it from the README. (If the file is untracked, `mkdir -p docs/showcase && mv ... && git add docs/showcase`.)
- `Redesign.md` (stale root design doc): move to `docs/Redesign.md` (`git mv Redesign.md docs/Redesign.md`). Do not delete.
- If any stray `*-claude-code-prompt.md` remain at the repo ROOT, move them to `docs/cc-prompts/`.

## PART 5 — .gitignore hardening
Confirm `.gitignore` already covers: `node_modules/`, `.next/`, `.turbo/`, `.vercel`, `*.tsbuildinfo`, `.env`/`.env.local`/`.env*.local`, `.gstack/`, `Beauty OS/`, `pixel-agents/`, `*.rar`. ADD if missing: `.claude/settings.local.json` (local editor/agent config — should not be public). Do NOT ignore `.env.example`, `CLAUDE.md`, or `docs/`.

## VERIFICATION GATE
1. `git ls-files | grep -E '^\.env'` → only `.env.example`.
2. `git grep -n <ADMIN_SECRET — set in env>` → ZERO hits (redaction complete).
3. `pnpm typecheck` → 0 errors; `pnpm test` → all green (report count; docs/metadata changes must not affect tests).
4. `git status` / `git diff --stat` shows only: redacted prompt docs, new `README.md`, new `LICENSE`, `package.json` (metadata only), moved `docs/showcase/index.html` + `docs/Redesign.md`, `.gitignore` (maybe +1 line). NOTHING under `apps/web/**` source, `packages/**`, `clients/**`, or any code path.

## COMMIT & PUSH
```bash
pnpm typecheck && pnpm test && git add -A && git commit -m "chore: prepare repo for GitHub — README, LICENSE, package metadata, redact leaked secret, tidy root" && git push origin main
```

## VERDICT (report)
`git show --stat`; the secret-scan results (1b) incl. history finding; confirmation `git grep <ADMIN_SECRET — set in env>` is zero; typecheck/test; the final root + docs/ layout; and a clear **ACTION FOR USER** block: rotate `ADMIN_SECRET` (and any history-leaked keys) on Vercel + `.env.local`, and decide public/private + license. Do not claim the repo is "secret-free in history" — be precise about what redaction does vs. what rotation does.
