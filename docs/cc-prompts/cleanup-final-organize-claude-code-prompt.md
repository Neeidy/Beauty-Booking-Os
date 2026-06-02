# CLAUDE CODE PROMPT — FINAL repo organization (docs tidy + pixel-agents + known-issues) — SYSTEM MUST NOT BREAK

> Copy-paste into Claude Code at the repo root.
> Goal: bring the repo to its FINAL clean layout — delete stale docs, organize keepers into folders, remove the local pixel-agents dir, and create the missing docs/known-issues.md. NONE of this touches application code or behavior. All deletions are docs/junk (recoverable via git history). If STEP 0 finds a real reference to anything being deleted/moved, STOP and report.

## ROLE & MODE
Senior engineer, final cleanup. Loop: STEP 0 verify → execute → verification gate (typecheck + test + build) → commit & push → LIVE check. Touch ONLY what's listed.

## HARD CONSTRAINTS
- Do NOT touch: `packages/**`, `app/api/**`, `middleware.ts`, DB schema, `apps/web/**` source, `docs/Beauty Os Design/**` (design source of truth), `docs/cc-prompts/**`, `docs/sprints/**`, `pnpm-lock.yaml`, `.env*`.
- Do NOT move `docs/sprint-log.md` (CLAUDE.md points to that exact path) — leave it at `docs/sprint-log.md`.
- Do NOT delete `node_modules`. Do NOT touch `docs/NOTLAR.txt` (gitignored personal notes).
- Filenames contain spaces/parentheses — quote them properly.
- No code-behavior change. 327 tests stay green; build passes.

## STEP 0 — VERIFY (read-only; STOP if a real reference is found)
1. Grep the codebase + CLAUDE.md for references to any docs file you're about to DELETE or MOVE (other than the known external-URL "docs/" in webhook comments and next-env.d.ts). Expect none. Example:
   `grep -rn "master-prompt\|claude-md-housekeeping\|dora-ai-salon\|google-stitch\|website-redesign-handoff\|road map\|startup_os_beauty\|api-reference\|client-onboarding\|deployment-checklist\|developer-notes\|system-walkthrough\|beauty-booking-os-walkthrough\|Full_Build_Manual" apps packages CLAUDE.md --include=*.ts --include=*.tsx --include=*.json --include=*.md` → expect ZERO code/config hits. If something IS referenced, STOP and report.
2. Confirm `docs/known-issues.md` does NOT yet exist (it will be created).
3. Confirm `pixel-agents/` is gitignored / not tracked (`git ls-files pixel-agents | wc -l` → 0).

## TASKS

### A. Remove the local pixel-agents directory (gitignored, unused)
```bash
rm -rf pixel-agents
```
(It's already in `.gitignore`, so this is a local-disk removal only — no git change.)

### B. Delete stale docs (git rm — recoverable via history)
```bash
git rm "docs/beauty-booking-os-master-prompt.md" \
       "docs/claude-md-housekeeping.md" \
       "docs/dora-ai-salon-website-prompt.md" \
       "docs/google-stitch-salon-website-prompt.md" \
       "docs/google-stitch-vienna-glow-studio-prompt.md" \
       "docs/website-redesign-handoff.md" \
       "docs/spirint v2 road map.txt" \
       "docs/startup_os_beauty_booking_vienna (1).pdf"
```

### C. Organize keeper guides into docs/guides/
```bash
mkdir -p docs/guides
git mv "docs/api-reference.md"               "docs/guides/api-reference.md"
git mv "docs/client-onboarding.md"           "docs/guides/client-onboarding.md"
git mv "docs/deployment-checklist.md"        "docs/guides/deployment-checklist.md"
git mv "docs/developer-notes.md"             "docs/guides/developer-notes.md"
git mv "docs/system-walkthrough-guide.md"    "docs/guides/system-walkthrough-guide.md"
git mv "docs/beauty-booking-os-walkthrough.md" "docs/guides/beauty-booking-os-walkthrough.md"
git mv "docs/Beauty_Booking_OS_Full_Build_Manual_TR.pdf" "docs/guides/Beauty_Booking_OS_Full_Build_Manual_TR.pdf"
```
(Leave at `docs/` root: `sprint-log.md`, `beauty_booking_customer_presentation.pptx`, `NOTLAR.txt`, and the `Beauty Os Design/`, `cc-prompts/`, `sprints/` folders.)

### D. Create docs/known-issues.md (the earlier record step never ran)
Create `docs/known-issues.md` with EXACTLY this content:
```markdown
# Known Issues & Deferred Fixes

Status as of the i18n sprint completion. The app is stable (327 tests green, live healthy on Vercel, demo-salon). The items below are intentionally DEFERRED — not fixed — to avoid risk to the working demo.

## Deferred functional bugs

### 1. Slot availability is per-salon, not per-staff
- **Where:** `apps/web/app/api/booking/slots/route.ts` and the reservation conflict check in `apps/web/app/api/booking/reservations/route.ts`.
- **Behavior:** A time slot is marked unavailable if ANY booking/active-reservation overlaps it for the whole salon (`clientId`). No per-staff dimension, so the salon shows a time as "full" after a single booking even if other staff are free. `maxBookingsPerSlot` is also not honored (capacity effectively 1).
- **Root cause:** `bookings` has no `staffId` column — the requested staff is free text in `bookings.notes`. `slot_reservations` likewise has no `staffId`.
- **Why deferred:** A correct fix needs a `staffId` column on `bookings` (+ `slot_reservations`) — a DB schema change, which is FROZEN. A notes-parsing approximation would be fragile and risks the booking flow.
- **Recommended fix (when schema unfreezes):** add `staffId` to `bookings`/`slot_reservations`, pass selected staff to the slots + reservation endpoints, scope availability/conflict checks by staff.

### 2. Reservation expires while the user fills later booking steps ("Rezervasyon süresi doldu")
- **Where:** `apps/web/lib/slot-reservations.ts` (`ACTIVE_TTL_MINUTES = 10`), `apps/web/components/SlotPicker.tsx`, `apps/web/app/api/booking/submit/route.ts` (409 on expired reservation).
- **Behavior:** The 10-minute hold's countdown runs only while SlotPicker is mounted (step 2). After advancing to steps 3-4 the countdown stops and there is no keepalive, but the server-side reservation still expires at 10 minutes — so a slow user is rejected at submit with 409 after filling the whole form. (DB exclusion constraint separately prevents true double-booking.)
- **Why deferred:** The reservation flow is the most fragile, revenue-critical path; not touched before the demo. Normal-speed users (<10 min) are unaffected.
- **Recommended fix (low risk):** bump `ACTIVE_TTL_MINUTES` (10 → 25-30), a single constant. Robust alternative: a keepalive that extends the reservation while the form is open + surfacing remaining time on later steps.

## Minor / cosmetic findings (none demo-breaking)
- BookingForm `useEffect` reading `?source=google_business` has no `[]` dependency array (runs every render; harmless but should be `[]`).
- Dashboard "Wochenumsatz" stat is a hardcoded "—" placeholder, never populated.
- operatingHours format inconsistency: file configs use `"HH:MM"`, the admin SettingsView writes `"HHmm"`; `/api/booking/slots` normalizes both at read.

## Deferred feature (not a bug)
- **Multi-tenant landing content:** landing marketing content (service cards, team, testimonials, gallery) lives in the i18n dictionary — bilingual but shared across tenants. Per-tenant needs a 2-dimensional (tenant × locale) approach (e.g. `clients/{slug}/landing.json`) plus authoring bilingual content for a second salon. `elegant-nails-vienna` has no `staff.json`. Deferred together with onboarding a real second salon.
```

### E. Add a CLAUDE.md pointer to known-issues
In `CLAUDE.md`, under `## SYSTEM STATUS` (or near the top), add ONE line:
`Known issues & deferred fixes → docs/known-issues.md`
Do not change anything else in CLAUDE.md.

## VERIFICATION GATE
1. `pnpm typecheck` → 0 errors.
2. `pnpm test` → all green (report count; must stay 327).
3. `pnpm --filter @beauty-booking/web build` → succeeds.
4. Sanity: the app source under `apps/web/**`, `packages/**`, `docs/Beauty Os Design/**`, `docs/cc-prompts/**`, `docs/sprints/**`, and `docs/sprint-log.md` are UNCHANGED. `git status` shows only: deleted stale docs, moved guides (renames), new `docs/guides/`, new `docs/known-issues.md`, modified `CLAUDE.md`. `pixel-agents/` removal is local-only (gitignored → not in the diff).

## COMMIT & PUSH
```bash
pnpm typecheck && pnpm test && git add -A && git commit -m "chore: final docs organization — prune stale docs, move guides to docs/guides, add known-issues.md, remove local pixel-agents" && git push origin main
```

## LIVE VERCEL CHECK
Poll `https://beauty-booking-os-web.vercel.app/` until 200, no "Application error". Confirm `/`, `/booking`, `/admin/login` still 200 (de+en), no "server-side exception" — docs-only changes must cause zero runtime change; this is the safety confirmation.

## VERDICT (report)
Post-commit `git show --stat`; typecheck result; test count (vs 327); build result; the final `docs/` tree (so the layout is visible); confirmation that no app/source/frozen path changed; LIVE health table (`/`, `/booking`, `/admin/login` × de/en) + commit SHA; confirm `pixel-agents/` removed locally and `docs/known-issues.md` created. If STEP 0 found any reference to a target, report it and skip that item.
```
