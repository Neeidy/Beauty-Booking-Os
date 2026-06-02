# CLAUDE CODE PROMPT — Repo cleanup (remove cruft, trim CLAUDE.md) — SYSTEM MUST NOT BREAK

> Copy-paste into Claude Code at the repo root.
> Goal: remove committed junk + dead code, archive stray prompt files, trim CLAUDE.md, and drop the local .next cache — WITHOUT changing any app behavior. Every removal below is verified-unused. If a grep in STEP 0 finds a real reference to anything you're about to delete, STOP and report instead of deleting it.

## ROLE & MODE
Senior engineer doing a safe cleanup. Loop: STEP 0 verify → execute the listed removals/edits → verification gate (typecheck + test + build) → commit & push → LIVE check. Touch ONLY what's listed.

## HARD CONSTRAINTS
- Do NOT touch: `packages/**`, `app/api/**`, `middleware.ts`, DB schema, `apps/web/components/sections/**` (these ARE used), `docs/Beauty Os Design/**` (design source of truth), `docs/beauty_booking_customer_presentation.pptx`, `pnpm-lock.yaml`, `.env*`, any source file that's imported.
- Do NOT delete `node_modules` (keep it — deleting forces a reinstall).
- Do NOT delete `Redesign.md` or `README`-type files. Only the exact targets below.
- No code-behavior changes. 327 tests must stay green; build must pass.

## STEP 0 — VERIFY (read-only; STOP if any reference found)
1. Confirm these 5 legacy components are NOT imported anywhere (grep). They are superseded by `components/sections/*`:
   `apps/web/components/HeroSection.tsx`, `ServicesSection.tsx`, `CTASection.tsx`, `Footer.tsx`, `GalerieTeamSection.tsx`.
   Run e.g. `grep -rn "components/\(HeroSection\|ServicesSection\|CTASection\|Footer\|GalerieTeamSection\)\"" apps/web | grep -v "/sections/"`. Expect ZERO hits. If any hit → STOP, report, do not delete that file.
2. Confirm `apps/web/components/BookingForm.rar`, the `{` file, the `Beauty OS/` dir, and `.gstack/` are NOT referenced by any source/config (`grep -rn "Beauty OS\|\.gstack\|BookingForm.rar" apps packages --include=*.ts --include=*.tsx --include=*.json`). Expect none. If referenced → STOP.
3. Confirm `git ls-files` currently tracks: `apps/web/components/BookingForm.rar`, `{`, `Beauty OS/` (11 files), `.gstack/` (14 files).

## TASKS

### A. Remove committed junk (git rm)
```bash
git rm apps/web/components/BookingForm.rar
git rm -- '{'
git rm -r "Beauty OS"
git rm -r .gstack
```

### B. Remove dead legacy components (git rm) — only after STEP 0 confirms 0 imports
```bash
git rm apps/web/components/HeroSection.tsx \
       apps/web/components/ServicesSection.tsx \
       apps/web/components/CTASection.tsx \
       apps/web/components/Footer.tsx \
       apps/web/components/GalerieTeamSection.tsx
```

### C. Update `.gitignore`
Append (avoid re-committing these in future):
```
# Cleanup additions
*.rar
.gstack/
Beauty OS/
```
(`pixel-agents/`, `.next/`, `node_modules/`, `*.tsbuildinfo`, `.turbo/`, `.vercel` are already ignored — leave them.)

### D. Archive stray CC-prompt files into docs/cc-prompts/
Move (do NOT delete) the root-level prompt docs so they're preserved but out of the root:
```bash
mkdir -p docs/cc-prompts
git mv 2>/dev/null *-claude-code-prompt.md docs/cc-prompts/ || mv *-claude-code-prompt.md docs/cc-prompts/
mv i18n-phase-verification-block.md docs/cc-prompts/ 2>/dev/null || true
git add docs/cc-prompts
```
Notes: these files are currently UNTRACKED, so `git mv` may not apply — use `mv` then `git add docs/cc-prompts`. Move ONLY files matching `*-claude-code-prompt.md` plus `i18n-phase-verification-block.md`. Do NOT move `CLAUDE.md`, `Redesign.md`, or anything else. (This very prompt file may be among them — that's fine.)

### E. Trim CLAUDE.md (remove 3 stale/redundant sections only)
Open `CLAUDE.md` and DELETE these three sections in full, including each one's surrounding `---` separator (keep ONE separator between the remaining neighbors so structure stays valid):
- `## V2 SPRINT SEQUENCE` and its table (redundant — line 2 already points to `docs/sprint-log.md`).
- `## GSTACK` and its entire skills table.
- `## STAFF PAGE — BACKLOG (not started)` and its bullets.
In place of the STAFF PAGE BACKLOG section, you MAY add a single line under SYSTEM STATUS or near the end: `Known issues & deferred fixes → docs/known-issues.md`.
Do NOT touch any other CLAUDE.md section (ACTIVE CONSTRAINTS, VERIFIED IMPORT PATTERNS, CRITICAL FUNCTION SIGNATURES, OPERATING HOURS, TECH STACK, PROJECT STRUCTURE, DATABASE TABLES, AI AGENT RULES, SECURITY RULES, GDPR, DEBUGGING, SESSION END CHECKLIST). Verify CLAUDE.md still reads coherently.

### F. Drop the local build cache (NOT a git operation — it's gitignored, regenerates on build)
```bash
rm -rf apps/web/.next
```

## VERIFICATION GATE (this proves nothing broke)
1. `pnpm typecheck` → 0 errors (proves removing the dead components broke no import).
2. `pnpm test` → all green, report count (must stay 327).
3. `pnpm --filter @beauty-booking/web build` → succeeds (regenerates `.next`, proves the app builds without the removed files).
4. `git status` → only intended changes; `git diff --cached --stat` should show: deleted (BookingForm.rar, `{`, Beauty OS/*, .gstack/*, 5 legacy components), modified (.gitignore, CLAUDE.md), added (docs/cc-prompts/*). Nothing under packages/**, app/api/**, components/sections/**, or DB.

## COMMIT & PUSH
```bash
pnpm typecheck && pnpm test && git add -A && git commit -m "chore: repo cleanup — remove committed junk (rar, Obsidian vault, gstack artifacts, stray file), dead legacy landing components; archive CC prompts to docs/cc-prompts; trim CLAUDE.md" && git push origin main
```

## LIVE VERCEL CHECK
Poll `https://beauty-booking-os-web.vercel.app/` until 200, no "Application error". Confirm `/`, `/booking`, and `/admin/login` still return 200 in both `locale=de` and `locale=en` with no "server-side exception" — i.e. the cleanup caused no runtime regression. (Removing dead code shouldn't change runtime; this is the safety confirmation.)

## VERDICT (report)
`git diff --cached --stat` (or post-commit `git show --stat`); typecheck result; exact test count (vs 327); build result; confirmation that ONLY the listed files changed and nothing under frozen/used paths; LIVE health table (`/`, `/booking`, `/admin/login` × de/en) + commit SHA; how many KB/files removed from the repo and that `.next` was dropped locally. If STEP 0 found any reference to a deletion target, report it and skip that deletion rather than risk breakage.
