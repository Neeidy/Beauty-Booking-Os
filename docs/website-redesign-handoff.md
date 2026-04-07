# Website Redesign Handoff
**Snapshot date:** 2026-04-07  
**Author:** BuilderAgent (auto-generated from repo inspection)  
**Scope:** Customer-facing pages only (`apps/web/app/(marketing)` + booking funnel). Admin panel is out of scope for this redesign.

---

## Current Frontend State (as of 2026-04-07)

- Backend is frozen and production-ready: 213/213 tests passing, Sprints 1–8 complete.
- The web app (`apps/web`) is a **Next.js 15 App Router** project using TypeScript.
- Customer-facing pages exist and are functional but are described in CLAUDE.md as "functional MVP" — they have never been through a visual design pass.
- No design tool has been used. No Figma, no Stitch, no v0.dev artifacts exist anywhere in the repo.
- No `tailwind.config.ts` exists. Tailwind is loaded via `@import "tailwindcss"` in `globals.css` (Tailwind v4 style).
- Brand tokens are defined as CSS custom properties in `apps/web/app/globals.css` and are used via `style={{ color: "var(--color-primary)" }}` inline styles throughout all components — **not** via Tailwind utility classes.
- The font stack is: `Playfair Display` (heading, `--font-heading`) + `Inter` (body, `--font-body`) from Google Fonts, loaded in `apps/web/app/layout.tsx`.
- The `output: "standalone"` Next.js config is **commented out** locally due to Windows EPERM; it is expected to be re-enabled on Vercel/Linux for production builds.

---

## Landing Page Inventory

**File:** [apps/web/app/page.tsx](../apps/web/app/page.tsx)

- **What it renders:** Four sections in sequence — `<Header>`, `<HeroSection>`, `<ServicesSection>`, `<CTASection>`, `<Footer>`. No client-side state; entirely server-rendered.
- **Data it pulls:** `ServicesSection` statically imports `clients/demo-salon/services.json` at build time (no API call, no runtime fetch).
- **Components used:** `Header`, `HeroSection`, `ServicesSection`, `CTASection`, `Footer` — all from `apps/web/components/`.
- **Styling approach:** Inline `style` props using CSS custom properties (`var(--color-primary)` etc.) for color; Tailwind utility classes for layout/spacing/typography only (e.g., `py-20`, `max-w-6xl`, `font-heading`). No component-level Tailwind color classes.
- **Hardcoded vs config:**
  - **Hardcoded:** Salon name "Vienna Glow Studio", address "Mariahilfer Straße 45, 1060 Wien", WhatsApp number `+4312345678`, hero headline "Schönheit, die bleibt.", trust signals text, all opening hours in Footer.
  - **Config-driven:** Service names, prices, durations, categories (from `services.json`); brand colors (from `globals.css` CSS vars, which mirror `branding.json`). There is no runtime config injection — the CSS vars and `services.json` import are baked at build time.

---

## Booking Funnel Inventory

### Booking Form Page
**File:** [apps/web/app/booking/page.tsx](../apps/web/app/booking/page.tsx)

- **What it renders:** Header + max-w-2xl centered container with breadcrumb, page heading, subtext, and `<BookingForm>` component. Footer included.
- **Data it pulls:** None at page level. `BookingForm` imports `services.json` statically for the service dropdown.
- **Components used:** `Header`, `Footer`, `BookingForm`.
- **Styling approach:** Same CSS var + Tailwind pattern. `backgroundColor: "var(--color-background)"` on `<main>`.
- **Hardcoded vs config:**
  - **Hardcoded:** Page title uses `NEXT_PUBLIC_SALON_NAME` env var (falls back to `"Beauty Studio"`). Breadcrumb label "Termin buchen", heading "Termin anfragen", subtext "Füllen Sie das Formular aus — wir melden uns innerhalb von 24 Stunden…"
  - **Config-driven:** Service list in dropdown (from `services.json`). Client ID and slug from `NEXT_PUBLIC_DEMO_CLIENT_ID` / `NEXT_PUBLIC_DEFAULT_CLIENT_SLUG` env vars.

**BookingForm component details** ([apps/web/components/BookingForm.tsx](../apps/web/components/BookingForm.tsx)):
- `"use client"` — fully client-side, uses `react-hook-form` + `zodResolver`.
- Fields: Name (required), Email (optional), Phone (optional), Service dropdown (required), Preferred Date (optional), Preferred Time (optional), Notes (optional), 3 GDPR checkboxes (1 mandatory, 2 opt-in).
- On submit: POSTs to `/api/lead`, then fire-and-forgets `/api/lead/:id/classify`, then `router.push("/booking/thank-you")`.
- Schema defined in `apps/web/lib/booking-form-schema.ts`.

### Thank You Page
**File:** [apps/web/app/booking/thank-you/page.tsx](../apps/web/app/booking/thank-you/page.tsx)

- **What it renders:** Header + centered success confirmation with checkmark SVG, heading "Vielen Dank!", 24h response promise, contact options (phone, email, WhatsApp), back-to-home link. Footer not included.
- **Data it pulls:** None. Static page.
- **Components used:** `Header`, `Footer`.
- **Styling approach:** Same CSS var + Tailwind pattern. Vertically centered with `min-h-[70vh]`.
- **Hardcoded vs config:**
  - **Hardcoded:** Phone number `+43 1 234 5678` and WhatsApp link `wa.me/4312345678` are hardcoded strings — **not** pulled from config or env vars. This is a known gap.
  - **Config-driven:** Email address from `NEXT_PUBLIC_CONTACT_EMAIL` env var (falls back to `"hello@example.at"`).

---

## Component Inventory

| File | Purpose |
|---|---|
| [Header.tsx](../apps/web/components/Header.tsx) | Sticky top nav bar — salon name (hardcoded "Vienna Glow Studio"), "Leistungen" anchor link, "Kontakt" anchor link, "Jetzt Termin buchen" CTA button. Mobile: CTA only. |
| [HeroSection.tsx](../apps/web/components/HeroSection.tsx) | Full-width dark hero — eyebrow label, h1 headline, subheadline, 2 CTAs (booking link + scroll-to-services anchor), 3 trust signal chips. All text hardcoded. |
| [ServicesSection.tsx](../apps/web/components/ServicesSection.tsx) | Service grid — reads from `clients/demo-salon/services.json` at build time. Renders category headings + service cards with name, description, duration, price. "Beliebt" badge for popular items. |
| [CTASection.tsx](../apps/web/components/CTASection.tsx) | Bottom CTA band — heading, 2 buttons: online booking link + WhatsApp deep link. WhatsApp number and pre-filled message hardcoded. |
| [Footer.tsx](../apps/web/components/Footer.tsx) | 3-column footer (salon info, contact, opening hours). All data hardcoded. Links to `/datenschutz` and `/impressum` which **do not have pages yet**. |
| [BookingForm.tsx](../apps/web/components/BookingForm.tsx) | Full booking form — client component, react-hook-form, Zod validation, GDPR checkboxes, API integration. See booking funnel section above. |
| [admin/AdminHeader.tsx](../apps/web/components/admin/AdminHeader.tsx) | Admin panel top bar (separate from customer-facing Header). |
| [admin/Sidebar.tsx](../apps/web/components/admin/Sidebar.tsx) | Admin panel sidebar navigation. |
| [admin/StatCard.tsx](../apps/web/components/admin/StatCard.tsx) | KPI card widget for admin dashboard. |
| [admin/LeadTable.tsx](../apps/web/components/admin/LeadTable.tsx) | Lead list table for admin leads page. |
| [admin/BookingTable.tsx](../apps/web/components/admin/BookingTable.tsx) | Booking list table for admin bookings page. |
| [admin/LogViewer.tsx](../apps/web/components/admin/LogViewer.tsx) | Event log stream viewer for admin logs page. |
| [admin/EscalationCard.tsx](../apps/web/components/admin/EscalationCard.tsx) | Card for human escalation queue in admin. |

---

## Brand Tokens (What Exists, What's Missing)

### CSS Custom Properties (currently active in globals.css)

```css
--color-primary:     #2D2926   /* Dark brown-black — used for text, bg, borders */
--color-secondary:   #C9A96E   /* Gold — CTAs, prices, accents */
--color-accent:      #E8DDD0   /* Warm beige — section backgrounds, borders */
--color-background:  #FAFAF8   /* Near-white warm — page background */
--color-text:        #2D2926   /* Same as primary — body text */
--color-text-muted:  #6B6460   /* Warm grey — secondary text */
```

These exactly match the `colors` object in `clients/demo-salon/branding.json`.

### Font Tokens (defined in layout.tsx, loaded from Google Fonts)

| CSS Variable | Font | Usage |
|---|---|---|
| `--font-heading` | Playfair Display | Headings (via `font-heading` Tailwind class) |
| `--font-body` | Inter | Body text (via `font-sans` Tailwind class) |

### What's Missing

- **No spacing scale tokens** — all spacing is raw Tailwind classes (`py-20`, `px-4`, etc.)
- **No border-radius token** — `rounded-sm` is used throughout but hardcoded at Tailwind default
- **No shadow tokens** — only `hover:shadow-sm` used, no custom shadow scale
- **No font-size tokens** — raw Tailwind size classes (`text-sm`, `text-4xl`, etc.)
- **No transition/animation tokens**
- **Elegant Nails Vienna branding is defined in `clients/elegant-nails-vienna/branding.json`** (navy `#1A1A2E`, red `#E94560`) but its CSS vars are **not injected anywhere** — the web app is hardcoded to Vienna Glow Studio tokens in `globals.css`. There is no per-tenant CSS injection mechanism yet.

### Elegant Nails Vienna brand tokens (defined but unused in app)

```json
primary: #1A1A2E, secondary: #E94560, accent: #F5E6E8, background: #FAFAFA
Style: modern, friendly — Du-Form, emojis allowed
```

---

## Design Tool Artifacts Found

**None.** A full search of the repository for `stitch`, `v0.dev`, `.fig`, and `figma` found zero results in any project source file (`*.ts`, `*.tsx`, `*.md`, `*.json`).

The only matches were in:
- `node_modules/.pnpm/...` (third-party library type definitions — irrelevant)
- `apps/web/.next/next-server.js.nft.json` (build output — irrelevant)

No design mockups, wireframes, Figma exports, Stitch artifacts, or v0.dev-generated components exist anywhere in the repo.

---

## Open Questions for Architect Session

1. **Design tool decision**: No tool has been chosen. Options to evaluate: Google Stitch (AI-generated from brand tokens), v0.dev (component-level generation from prompts), Figma (manual design → handoff), or direct code-in-browser iteration. Each has different implications for how tokens are structured.

2. **Scope — which pages are in scope for redesign?**
   - Landing page (`/`) — confirmed in CLAUDE.md as target
   - Booking funnel (`/booking`, `/booking/thank-you`) — should these also be redesigned or just polished?
   - Legal pages (`/datenschutz`, `/impressum`) — these are linked from Footer but **pages do not exist**. Are they in scope?
   - Admin panel — explicitly out of scope (confirmed in this document's header), but should be verified with stakeholder.

3. **Brand tokens — what's the source of truth?** Currently `globals.css` (CSS vars) and `branding.json` are manually kept in sync. Before redesign, should a token pipeline be established (e.g., Style Dictionary, or Tailwind config that reads from branding.json)?

4. **Multi-tenant CSS injection**: The app currently hardcodes Vienna Glow Studio tokens in `globals.css`. For the system to be truly cloneable at the web layer, there needs to be a mechanism to inject per-client CSS vars at runtime or build time. Is this in scope for this redesign phase?

5. **Hardcoded content**: Several strings (salon name in Header, WhatsApp number in CTASection and thank-you page, phone in Footer, opening hours in Footer) are hardcoded and not env-var or config-driven. Should these be config-driven before the redesign begins, or after?

6. **Deadline / launch pressure**: Unknown. No deadline has been set in this conversation. The "Sonraki Adımlar" section in CLAUDE.md lists "Premium website redesign" as post-launch work without a date.

7. **Photography / imagery**: The current landing page has zero images (only CSS gradient textures). Does the redesign require real salon photography? If so, assets need to be sourced before or during design.

8. **Responsive breakpoints**: Current components use `sm:` and `lg:` Tailwind breakpoints only. Is the redesign expected to add `md:` or custom breakpoints?

---

## What Is NOT Decided Yet

- **No design tool has been chosen.** Neither Google Stitch, v0.dev, Figma, nor any other tool has been selected or used. No designs have been imported into the repo.
- **No new visual designs exist.** There are no mockups, wireframes, hi-fi designs, or style guides anywhere in this repository or referenced from it.
- **No token pipeline has been defined.** It is not decided whether brand tokens will be managed via `tailwind.config.ts`, CSS custom properties, Style Dictionary, or another mechanism.
- **The multi-tenant CSS injection problem is unsolved.** How the web app will serve different brand palettes for different salon clients (without a build per client) has not been designed.
- **Legal pages scope is unresolved.** `/datenschutz` and `/impressum` are linked in the Footer but do not exist as pages. It is not decided who writes the content or whether they are in scope for the redesign sprint.
- **No image assets exist.** The current site is text-only. Whether real photography will be incorporated has not been decided.
