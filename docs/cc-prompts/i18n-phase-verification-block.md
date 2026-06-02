# REUSABLE BLOCK — Post-Phase Verification (append to EVERY phase prompt)

> Paste at the END of each phase prompt, AFTER "FINISH WITH".
> Standing rule: every phase is verified BOTH locally AND on the LIVE Vercel URL.
> A phase is NOT done until the live site passes. But NEVER break the system architecture
> or frozen zones to force a pass — if a real fix would require that, STOP and report.

---

## POST-PHASE VERIFICATION (local + LIVE Vercel)

### Step 1 — Local gate (no Playwright)
1. `pnpm typecheck` → 0 errors; `pnpm test` → all green (report exact count + delta).
2. Production-runtime local check (catches more than `dev`): `pnpm --filter @beauty-booking/web build` then `pnpm --filter @beauty-booking/web start` on port 3030.
3. Multi-tenant smoke for the default slug: `node apps/web/scripts/smoke-multitenant.mjs demo-salon`. If the change is multi-tenant-sensitive, also verify `elegant-nails-vienna` by temporarily flipping the gitignored `apps/web/.env.local` slug, rerun smoke, then RESTORE it (confirm `git status` clean for it).
4. Locale HTTP smoke on touched pages: `curl -s -H "Cookie: locale=de" http://localhost:3030/<page>` and `... locale=en ...` → assert HTTP 200, no "Application error", `<html lang>` matches, expected DE/EN string present.

### Step 2 — Commit & push (triggers Vercel deploy)
Run the FINISH commands (commit + `git push origin main`). Note the commit SHA.

### Step 3 — LIVE Vercel verification (REQUIRED — this is the real test)
Production URL: `https://beauty-booking-os-web.vercel.app`
1. Poll until the new deploy is live: every ~15s (timeout ~6 min), `curl -sS -o /dev/null -w "%{http_code}" https://beauty-booking-os-web.vercel.app/` until it returns `200` and the body no longer contains `Application error` / `server-side exception`.
2. For EACH page this phase touched, fetch the LIVE url twice and assert:
   ```bash
   curl -s -H "Cookie: locale=de" https://beauty-booking-os-web.vercel.app/<page>   # expect lang="de", no error
   curl -s -H "Cookie: locale=en" https://beauty-booking-os-web.vercel.app/<page>   # expect lang="en", no error
   ```
   Assert per page: HTTP 200; NO "Application error"/"server-side exception"; `<html lang>` matches the cookie; a known DE string in the DE fetch and the EN equivalent in the EN fetch.
   > Note: production serves the DEMO salon only (env `NEXT_PUBLIC_DEFAULT_CLIENT_SLUG`). Multi-tenant (elegant-nails) is verified LOCALLY in Step 1, not on this URL.
3. If the deploy is not detectable within the timeout, report "deploy pending — manual confirm needed" rather than claiming success.

### Step 4 — Keep going until it passes (within bounds)
If LIVE verification fails (site errors, wrong/missing content, wrong lang): diagnose, fix WITHIN this phase's scope, redeploy, re-verify. Repeat until the live URL passes.
**HARD LIMIT:** never modify system architecture, frozen zones (`packages/**`, `/api/lead`, `middleware.ts`, DB schema), public function signatures, or sensitive files beyond the phase's allowed edits to force a pass. If a genuine fix would require any of that, STOP and report — do not hack around it.

### Step 5 — Report
Verdict must include: local gate results (typecheck/test/build/smoke), and a LIVE Vercel table (page × locale → HTTP / lang / DE-EN string / errors) with the commit SHA and the deploy URL checked. State clearly whether the live site PASSED.
