# Sprint — Phase 0 Step 3: Hardcoded Content → Config-Driven + Port Stabilization

**Workstream:** Website Redesign Foundation
**Phase:** 0 (Foundation — before any design tool)
**Step:** 3 of 4
**Prerequisites:**
- Phase 0 Step 1 complete (token pipeline via `tailwind.config.ts` + `branding.json`)
- Phase 0 Step 2 complete (runtime multi-tenant CSS injection via `layout.tsx`)
**Backend status:** FROZEN. Do not touch `packages/agents/**`, `packages/core/**`, `packages/shared/**`.

---

## Context

Phase 0 Steps 1 and 2 proved that the same codebase can render two different brand palettes purely via env configuration. Multi-tenant branding works at the visual token level.

But the multi-tenant promise still breaks at the content level. Several hardcoded strings live directly in component JSX:

- **Header.tsx** — salon name "Vienna Glow Studio" hardcoded
- **HeroSection.tsx** — all hero text hardcoded (may stay hardcoded for now — see scope note below)
- **CTASection.tsx** — WhatsApp number `+4312345678` and pre-filled message hardcoded
- **Footer.tsx** — opening hours, phone, address, salon info all hardcoded
- **booking/thank-you/page.tsx** — phone `+43 1 234 5678` and WhatsApp link hardcoded
- **booking/page.tsx** — uses `NEXT_PUBLIC_SALON_NAME` env var as fallback (inconsistent pattern)

The good news: `clients/{slug}/client.config.json` already contains almost all the content data needed (salon name, contact info, operating hours, GDPR data controller info, channels, etc.). We do NOT need to extend the schema — the data is already there, it's just not being read.

This step creates a `loadClientConfig()` utility mirroring the Phase 0 Step 1 `loadBranding()` pattern, and refactors the above components to consume it. No schema changes. No visual changes. Pure content-source refactor.

**Also in this step:** Fix the port drift problem. Currently `pnpm dev` auto-increments the port when 3000 is occupied (3001, 3099, etc.), which made the Phase 0 Step 2 smoke test nearly give a false positive. We'll hard-pin the dev port to 3030 so the behavior is deterministic across sessions.

---

## Schema Asymmetry — Critical To Handle

The two `client.config.json` files are not identical. This is a feature, not a bug — different salons have different capabilities. But it means component code MUST handle optional fields gracefully. Known differences:

**Only in `demo-salon` (Growth package):**
- `contact.instagramHandle`
- `contact.whatsappNumber`
- `contact.googleMapsUrl`
- `channels.whatsapp: true`

**In `elegant-nails-vienna` (Starter package):**
- None of the above
- `channels.whatsapp: false`
- Has `prompts.json` (NOT our concern — backend territory, do not touch)

**Rule:** Any component that displays WhatsApp, Instagram, or Google Maps content MUST first check the corresponding field exists. If missing, the UI element is not rendered. No placeholder, no "not available" text, no fallback to hardcoded defaults. It simply doesn't appear.

If this rule is violated, rendering Elegant Nails Vienna will crash or show "undefined" in the UI.

---

## Task

1. Stabilize the dev server port to 3030 across all environments.
2. Create `loadClientConfig()` utility that reads and types `client.config.json`.
3. Refactor components that currently have hardcoded content to read from the loaded client config.
4. Ensure optional fields (`instagramHandle`, `whatsappNumber`, `googleMapsUrl`) are handled conditionally — no crashes on Elegant Nails Vienna.
5. Keep `HeroSection` hardcoded for now (scope note below).
6. Verify both salons render correctly via smoke tests.

---

## Scope Notes — What's In and What's Out

**IN scope for this step:**
- `apps/web/lib/load-client-config.ts` (new)
- `apps/web/lib/__tests__/load-client-config.test.ts` (new)
- `apps/web/components/Header.tsx` (refactor)
- `apps/web/components/CTASection.tsx` (refactor)
- `apps/web/components/Footer.tsx` (refactor)
- `apps/web/app/booking/page.tsx` (refactor — use loaded config, remove `NEXT_PUBLIC_SALON_NAME` fallback)
- `apps/web/app/booking/thank-you/page.tsx` (refactor)
- Root `package.json` or `apps/web/package.json` (port pin to 3030)
- Smoke test script: `apps/web/scripts/smoke-multitenant.sh` or `.mjs` (new — helper for quick verification)

**OUT of scope for this step — DO NOT TOUCH:**
- `apps/web/components/HeroSection.tsx` — hero copy ("Schönheit, die bleibt.") stays hardcoded. Reason: hero copy is a brand/marketing decision that belongs in the upcoming redesign phase with the design tool, not in a generic config schema. Forcing it into `client.config.json` now would require a schema field we'd immediately rewrite. Leave it alone.
- `apps/web/components/ServicesSection.tsx` — already config-driven via `services.json`, correct as-is.
- Any admin component (`components/admin/**`)
- Any backend package
- `tailwind.config.ts`
- `globals.css`
- `layout.tsx` (unless port env var plumbing forces a minor change — but try to avoid)
- `prompts.json` in `elegant-nails-vienna/` — backend territory
- Schema of `client.config.json` — no new fields, no renames, no restructuring

---

## Steps

### 1. Read current state first

Before any changes, inspect and report:

```
cat apps/web/components/Header.tsx
cat apps/web/components/HeroSection.tsx
cat apps/web/components/CTASection.tsx
cat apps/web/components/Footer.tsx
cat apps/web/app/booking/page.tsx
cat apps/web/app/booking/thank-you/page.tsx
cat apps/web/lib/load-branding.ts
cat package.json | grep -A 5 '"scripts"'
cat apps/web/package.json | grep -A 10 '"scripts"'
```

Confirm:
- All listed components exist at those paths
- `Header.tsx` contains the literal string "Vienna Glow Studio"
- `Footer.tsx` contains hardcoded opening hours
- `CTASection.tsx` contains `+4312345678` or similar
- `booking/thank-you/page.tsx` contains `+43 1 234 5678` or `wa.me/4312345678`
- The `dev` script exists somewhere — note whether it's in root `package.json` or `apps/web/package.json`
- `loadBranding` is importable from `@/lib/load-branding` or `../../lib/load-branding`

If any of these assumptions are wrong, STOP and report the actual state. Do not guess.

### 2. Pin the dev port to 3030

Find the `dev` script that currently runs Next.js. It will be either in root `package.json` (probably using a filter like `pnpm --filter @beauty/web dev`) or in `apps/web/package.json`.

Modify the script that directly invokes Next.js (`next dev`) to include an explicit port:

```
"dev": "next dev --port 3030"
```

If the script passes through pnpm filter, make sure the underlying script in `apps/web/package.json` is the one that gets the `--port 3030` flag. The root script can stay as-is.

Do NOT add a `PORT=3030` env var approach — an explicit CLI flag is more reliable across shells (Windows PowerShell handles env vars differently than bash).

After the change, verify by running:
```
pnpm dev
```
in the background, waiting 5 seconds, then curling:
```
curl -s -o /dev/null -w "%{http_code}" http://localhost:3030/
```
Expected: `200`. If it's not 200, STOP and report. Kill the dev server after confirming.

### 3. Create `loadClientConfig()` utility

Create `apps/web/lib/load-client-config.ts`:

**Type definition:**

```typescript
export type ClientConfig = {
  clientName: string;
  slug: string;
  timezone: string;
  packageType: "starter" | "growth" | "premium";
  languages: string[];
  defaultLanguage: string;
  channels: {
    website: boolean;
    instagramDm: boolean;
    whatsapp: boolean;
    email: boolean;
  };
  bookingRules: {
    allowAfterHoursLeadCapture: boolean;
    reminderHoursBefore: number[];
    rescheduleWindowHours: number;
    maxBookingsPerSlot: number;
    minAdvanceBookingHours: number;
    cancellationPolicyHours: number;
    recoveryWaitHours: number;
    maxFollowUpAttempts: number;
  };
  operatingHours: {
    [day: string]: { open: string; close: string } | null;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
    // Optional — only present in Growth/Premium packages:
    instagramHandle?: string;
    whatsappNumber?: string;
    googleMapsUrl?: string;
  };
  gdpr: {
    dataControllerName: string;
    dataControllerEmail: string;
    privacyPolicyUrl: string;
    dataRetentionDays: number;
    consentRequired: string[];
    marketingConsentOptional: boolean;
  };
  features: {
    aiIntake: boolean;
    aiBooking: boolean;
    aiFollowUp: boolean;
    instagramDmFlow: boolean;
    recoveryFlow: boolean;
    multiLanguage: boolean;
    advancedReporting: boolean;
  };
};
```

**Loader function:**

Mirror the existing `loadBranding()` pattern exactly:

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadClientConfig(slug?: string): ClientConfig {
  const resolvedSlug = slug
    || process.env.NEXT_PUBLIC_DEFAULT_CLIENT_SLUG
    || "demo-salon";

  const configPath = join(
    process.cwd(),
    "clients",
    resolvedSlug,
    "client.config.json"
  );

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as ClientConfig;

    // Minimal sanity checks — not a full Zod schema, just guard against
    // missing critical fields that would crash components downstream.
    if (!parsed.clientName || typeof parsed.clientName !== "string") {
      throw new Error(`Invalid client.config.json at ${configPath}: missing clientName`);
    }
    if (!parsed.contact?.phone || !parsed.contact?.email) {
      throw new Error(`Invalid client.config.json at ${configPath}: missing contact info`);
    }

    return parsed;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to load client config for slug "${resolvedSlug}": ${err.message}`);
    }
    throw err;
  }
}
```

Make sure the file has no `"use client"` directive — it's a build-time / server-side utility.

### 4. Write unit tests for `loadClientConfig()`

Create `apps/web/lib/__tests__/load-client-config.test.ts` using Vitest.

Test cases (minimum 5):

1. **Loads demo-salon correctly** — Call `loadClientConfig("demo-salon")`, assert `clientName === "Vienna Glow Studio"`, assert `contact.whatsappNumber` is defined
2. **Loads elegant-nails-vienna correctly** — Call `loadClientConfig("elegant-nails-vienna")`, assert `clientName === "Elegant Nails Vienna"`, assert `contact.whatsappNumber` is `undefined`
3. **Default slug fallback** — Call `loadClientConfig()` with no argument and no env var, assert it loads demo-salon
4. **Invalid slug throws descriptive error** — Call `loadClientConfig("nonexistent-salon")`, assert it throws with the slug name in the message
5. **Optional fields are truly optional** — Assert that elegant-nails-vienna's config has `contact.phone` defined but `contact.instagramHandle` undefined, and that this does NOT cause a type error or runtime crash

Use Vitest `describe`/`it`/`expect`. No mocking of the filesystem — actually read the real JSON files from `clients/`. The test env will have `process.cwd()` set to the repo root (or close enough — if path resolution fails, switch to reading files relative to `__dirname` instead and document the deviation in the report).

### 5. Refactor `Header.tsx`

Current state: contains literal `"Vienna Glow Studio"` string.

- Add import: `import { loadClientConfig } from "@/lib/load-client-config"` (adjust path if alias isn't configured — use relative path)
- Make sure the component is (or remains) a server component. If it's currently `"use client"`, check whether any client-only hooks/handlers require it. If not, remove the directive. If yes, you'll need to pass the config as a prop from a parent server component — in that case, load the config in `layout.tsx` or the specific page that uses Header, and pass `clientName` as a prop. **Prefer the server component approach** — simpler, no prop drilling.
- Replace the hardcoded salon name with `config.clientName`
- Preserve ALL existing styling, layout, Tailwind classes, and the navigation structure

If Header has any other hardcoded salon-specific strings (e.g., "Leistungen" is German for "Services" which is brand-agnostic, but check for salon-name-adjacent tags or descriptions), replace them too. If there are strings that are brand-independent (German nav labels like "Leistungen", "Kontakt"), leave them alone — they're i18n concerns, not client config concerns.

### 6. Refactor `CTASection.tsx`

Current state: contains hardcoded WhatsApp number and pre-filled message.

- Load client config via `loadClientConfig()`
- **Conditional rendering**: the WhatsApp button should ONLY render if BOTH of these are true:
  - `config.channels.whatsapp === true`
  - `config.contact.whatsappNumber` is a non-empty string
- If the WhatsApp button is not rendered, the remaining CTA (online booking button) should still be visible and well-laid-out — don't leave a visual gap
- Replace the hardcoded number with `config.contact.whatsappNumber` when rendered
- The pre-filled WhatsApp message can stay hardcoded for now (it's generic German: "Hallo, ich möchte einen Termin buchen") — it's not salon-specific content, it's UX copy
- Preserve all Tailwind classes and layout

### 7. Refactor `Footer.tsx`

Current state: all data hardcoded (opening hours, phone, address, salon info).

- Load client config via `loadClientConfig()`
- Replace:
  - Salon name → `config.clientName`
  - Address → `config.contact.address`
  - Phone → `config.contact.phone`
  - Email → `config.contact.email`
  - Opening hours → iterate `config.operatingHours` and render each day. Handle `null` (closed day) by showing "Geschlossen" or similar
- **Conditional rendering for optional contact fields:**
  - Instagram link: only if `config.contact.instagramHandle` is defined
  - Google Maps link: only if `config.contact.googleMapsUrl` is defined
  - WhatsApp link: only if `config.channels.whatsapp === true` AND `config.contact.whatsappNumber` is defined
- Legal links (`/datenschutz`, `/impressum`) stay as-is — those are routes, not content
- Preserve the 3-column layout and all Tailwind classes

**Opening hours rendering helper:** You may want to create a small inline helper like:

```typescript
function formatDay(day: string): string {
  const map: Record<string, string> = {
    monday: "Montag",
    tuesday: "Dienstag",
    wednesday: "Mittwoch",
    thursday: "Donnerstag",
    friday: "Freitag",
    saturday: "Samstag",
    sunday: "Sonntag",
  };
  return map[day] ?? day;
}
```

This is OK to put directly in `Footer.tsx` — don't over-engineer with a separate file.

### 8. Refactor `booking/page.tsx`

Current state: uses `NEXT_PUBLIC_SALON_NAME` env var with fallback to `"Beauty Studio"`. Inconsistent with the new pattern.

- Replace env var usage with `loadClientConfig().clientName`
- Remove the `NEXT_PUBLIC_SALON_NAME` reference entirely
- Leave the breadcrumb, heading, and subtext strings alone — they're German UX copy, not client-specific

### 9. Refactor `booking/thank-you/page.tsx`

Current state: hardcoded phone `+43 1 234 5678` and WhatsApp link `wa.me/4312345678`.

- Load client config via `loadClientConfig()`
- Phone link: use `config.contact.phone`
- Email link: use `config.contact.email` (instead of the current `NEXT_PUBLIC_CONTACT_EMAIL` env var)
- WhatsApp link:
  - Only render if `config.channels.whatsapp && config.contact.whatsappNumber`
  - Strip the `+` and non-digits from `whatsappNumber` to build the `wa.me/` URL
  - If WhatsApp is disabled (Elegant Nails case), don't render the WhatsApp contact option at all
- Preserve the checkmark SVG, heading "Vielen Dank!", layout, and all Tailwind classes

### 10. Create a smoke test script

Create `apps/web/scripts/smoke-multitenant.mjs` (Node ESM script, no shell dependencies — portable across Windows and Linux):

```javascript
#!/usr/bin/env node
/**
 * Multi-tenant smoke test.
 * Assumes dev server is already running on port 3030.
 * Runs ONCE — to test both salons, run this script twice with different env:
 *
 *   NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=demo-salon pnpm dev        (terminal 1)
 *   node apps/web/scripts/smoke-multitenant.mjs demo-salon     (terminal 2)
 *
 * Then stop, restart dev with elegant-nails-vienna, run again.
 */

const expectedContent = {
  "demo-salon": {
    clientName: "Vienna Glow Studio",
    phone: "+43 1 234 5678",
    hasWhatsApp: true,
    primaryColor: "#2D2926",
  },
  "elegant-nails-vienna": {
    clientName: "Elegant Nails Vienna",
    phone: "+43 1 987 6543",
    hasWhatsApp: false,
    primaryColor: "#1A1A2E",
  },
};

const slug = process.argv[2];
if (!slug || !expectedContent[slug]) {
  console.error(`Usage: node smoke-multitenant.mjs <demo-salon|elegant-nails-vienna>`);
  process.exit(1);
}

const expected = expectedContent[slug];
const url = "http://localhost:3030/";

try {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FAIL: HTTP ${res.status} from ${url}`);
    process.exit(1);
  }
  const html = await res.text();

  const checks = [
    {
      name: "clientName in page",
      pass: html.includes(expected.clientName),
      detail: `expected "${expected.clientName}"`,
    },
    {
      name: "phone in page",
      pass: html.includes(expected.phone),
      detail: `expected "${expected.phone}"`,
    },
    {
      name: "primary color in injected style",
      pass: html.includes(`--color-primary: ${expected.primaryColor}`),
      detail: `expected CSS var "--color-primary: ${expected.primaryColor}"`,
    },
    {
      name: expected.hasWhatsApp ? "WhatsApp link present" : "WhatsApp link absent",
      pass: expected.hasWhatsApp
        ? html.includes("wa.me/")
        : !html.includes("wa.me/"),
      detail: expected.hasWhatsApp
        ? "expected wa.me/ link in HTML"
        : "expected NO wa.me/ link in HTML",
    },
  ];

  let allPassed = true;
  for (const c of checks) {
    const icon = c.pass ? "PASS" : "FAIL";
    console.log(`[${icon}] ${c.name} — ${c.detail}`);
    if (!c.pass) allPassed = false;
  }

  if (!allPassed) {
    console.error(`\nSmoke test FAILED for slug "${slug}"`);
    process.exit(1);
  }
  console.log(`\nSmoke test PASSED for slug "${slug}"`);
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  console.error("Is the dev server running on port 3030?");
  process.exit(1);
}
```

This script is not a Vitest test — it's a manual verification tool. It requires the dev server to be running. Don't integrate it into `pnpm test`.

### 11. Verification — the must-pass gate

Run in this exact order. STOP and report on the first failure.

1. **TypeScript check:**
   ```
   pnpm --filter @beauty/web typecheck
   ```
   (or `pnpm --filter @beauty/web tsc --noEmit` if no explicit script)

2. **Unit tests:**
   ```
   pnpm test
   ```
   Must show: **225/225 passing** (220 from previous step + 5 new `load-client-config` tests). Report exact count.

3. **Build:**
   ```
   pnpm --filter @beauty/web build
   ```
   Must succeed for BOTH env configurations. Build once with default env, then:
   ```
   NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=elegant-nails-vienna pnpm --filter @beauty/web build
   ```
   If the second build fails with a type error about missing `instagramHandle` or `whatsappNumber`, the conditional rendering logic is wrong — fix the component (not the types).

4. **Port pin smoke test:**
   ```
   pnpm dev &
   sleep 5
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3030/
   kill %1
   ```
   Expected: `200`. If the server starts on a different port, port pinning failed — fix the script.

5. **Multi-tenant content smoke test — demo-salon:**
   ```
   NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=demo-salon pnpm dev &
   sleep 5
   node apps/web/scripts/smoke-multitenant.mjs demo-salon
   kill %1
   ```
   All 4 checks must PASS. Capture the output.

6. **Multi-tenant content smoke test — elegant-nails-vienna:**
   ```
   NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=elegant-nails-vienna pnpm dev &
   sleep 5
   node apps/web/scripts/smoke-multitenant.mjs elegant-nails-vienna
   kill %1
   ```
   All 4 checks must PASS. This includes:
   - "Elegant Nails Vienna" text in HTML
   - Phone `+43 1 987 6543` in HTML
   - `--color-primary: #1A1A2E` in injected style
   - **NO `wa.me/` link in HTML** (because Elegant Nails has `whatsapp: false`)

   **This is the critical gate.** If check #4 fails on elegant-nails-vienna (WhatsApp link still present), the conditional rendering in `CTASection` or `Footer` or `thank-you` is broken. Fix before committing.

---

## Acceptance Criteria

All must be true before commit:

- [ ] `dev` script pinned to port 3030, verified via curl
- [ ] `apps/web/lib/load-client-config.ts` exists with typed loader
- [ ] `apps/web/lib/__tests__/load-client-config.test.ts` exists with ≥5 passing tests
- [ ] `Header.tsx` uses `config.clientName`, no literal "Vienna Glow Studio" remains
- [ ] `CTASection.tsx` conditionally renders WhatsApp based on `channels.whatsapp` + `contact.whatsappNumber`
- [ ] `Footer.tsx` renders opening hours from `config.operatingHours`, phone/email/address from config, conditional Instagram/WhatsApp/Maps links
- [ ] `booking/page.tsx` no longer references `NEXT_PUBLIC_SALON_NAME`
- [ ] `booking/thank-you/page.tsx` uses config for phone, email, conditional WhatsApp
- [ ] `HeroSection.tsx` is untouched (out of scope)
- [ ] `ServicesSection.tsx` is untouched (already config-driven)
- [ ] No file under `components/admin/**` is touched
- [ ] No file under `packages/**` is touched
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` shows 225/225 passing
- [ ] Build succeeds for BOTH slugs
- [ ] `curl http://localhost:3030/` returns 200 (port pinning works)
- [ ] `smoke-multitenant.mjs demo-salon` — all 4 checks PASS
- [ ] `smoke-multitenant.mjs elegant-nails-vienna` — all 4 checks PASS (especially "no WhatsApp link")

---

## What NOT To Do

- Do NOT modify `HeroSection.tsx`. Hero copy stays hardcoded — it's a redesign-phase concern.
- Do NOT modify `ServicesSection.tsx`. It's already correct.
- Do NOT add new fields to `client.config.json`. The schema is sufficient for this step.
- Do NOT touch `prompts.json` in `elegant-nails-vienna/` — backend territory.
- Do NOT introduce a context provider, React context, or state library. Server components + direct loading is the pattern.
- Do NOT add `"use client"` to any component that doesn't already have it. If you need to add it for a real reason, STOP and report why.
- Do NOT change `load-branding.ts` — it's done and correct.
- Do NOT touch `tailwind.config.ts`, `globals.css`, or `layout.tsx` unless port pinning forces a minor, documented change.
- Do NOT commit if any smoke test fails.
- Do NOT delete `NEXT_PUBLIC_SALON_NAME` from `.env` or `.env.example` — just stop reading it in code. Cleaning env vars is a separate task.

---

## Finish With

```
pnpm test && \
pnpm --filter @beauty/web build && \
git add . && \
git commit -m "feat(web): phase 0 step 3 — hardcoded content migrated to client.config.json + port pinned to 3030" && \
git push
```

---

## Notes for the Architect Review (Post-Execution)

When reporting back, include:

1. Full output of both smoke test runs (`smoke-multitenant.mjs demo-salon` and `elegant-nails-vienna`) — all 4 checks for each
2. Confirmation that Elegant Nails Vienna page rendered WITHOUT any WhatsApp link (critical — this proves conditional rendering works)
3. Final test count (should be 225)
4. Whether Header/CTASection/Footer required `"use client"` adjustments, and why
5. Any deviation from the steps and the reason
6. Any opening-hours rendering edge cases encountered (null Sunday, etc.) and how they were handled
7. Whether `NEXT_PUBLIC_CONTACT_EMAIL` was removed from `booking/thank-you/page.tsx` or still referenced

**This step unlocks Phase 0 Step 4 — the frontend clone test.** Step 4 will formalize the two-salon verification into a repeatable test suite. Don't start Step 4 until this one is reviewed and approved.
