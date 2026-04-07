# GOOGLE STITCH PROMPT — VIENNA GLOW STUDIO
## Premium Salon Website for Beauty Booking OS

---

## PROJECT BRIEF

Design a premium, editorial-style website for **Vienna Glow Studio** — a high-end beauty studio in Vienna, Austria offering nail care, facial treatments, and lash & brow services. The website is the customer-facing front-end of an AI-powered booking system. Every page must funnel visitors toward online booking while communicating quiet luxury and trustworthiness.

**Target audience:** Women aged 28-55 in Vienna who value quality, discretion, and refined experiences. They book from mobile during lunch breaks. They are willing to pay premium prices for premium experiences. They care about hygiene, expertise, and ambiance.

**Primary goal:** Convert visitors into booked appointments through an online form. Secondary goal: Build trust and brand recognition.

---

## BRAND IDENTITY

**Personality:** Premium, warm, sophisticated, confident. Like an experienced friend who is also a true professional. Timeless elegance, not trendy or flashy. Calm authority.

**Voice:** Confident but never arrogant. Warm but never casual. Expert but never technical. Speaks German in formal Sie-Form.

**What it is NOT:** Not minimalist-cold, not maximalist-loud, not trendy-pastel, not corporate-sterile.

---

## VISUAL DIRECTION

**Aesthetic reference points:**
- Aesop (skincare brand) — restraint, generous whitespace, editorial typography
- Glossier early years — soft warmth, approachable luxury
- Vintage Vogue magazine layouts — asymmetric grids, oversized headlines
- Luxury hotel websites (Aman, Soho House) — calm confidence, atmospheric photography

**Color palette (use exactly these):**
- Background primary: `#FAFAF8` (warm cream)
- Background secondary: `#F4F1EA` (soft sand)
- Text primary: `#2D2926` (deep charcoal, never pure black)
- Text secondary: `#6B6660` (muted warm gray)
- Accent primary: `#C9A96E` (muted champagne gold)
- Accent secondary: `#E8DDD0` (soft blush)
- Border subtle: `#E5E1D8` (warm light gray)

**Strict color rules:**
- NO purple or pink gradients
- NO bright neon colors
- NO pure white (#FFFFFF) backgrounds — always warm cream
- NO pure black (#000000) text — always warm charcoal
- Gold accent used sparingly for emphasis (CTAs, dividers, hover states)

**Typography:**
- Display headlines: Serif font with editorial character — Canela, Tiempos Headline, Söhne Breit, or Playfair Display
  - Sizes: H1 = 64-80px desktop, 40-48px mobile; H2 = 40-48px desktop, 28-32px mobile
  - Weight: Regular or Light (never Bold for serif headlines)
  - Letter-spacing: -0.02em for tight elegance
  - Line-height: 1.1 for headlines
- Body text: Clean modern sans-serif — Inter, Söhne, or Söhne Breit
  - Size: 16-17px body, 14px captions
  - Weight: Regular (400) for body, Medium (500) for emphasis
  - Line-height: 1.6-1.7 for comfortable reading
- NO Arial, NO Helvetica, NO Times New Roman, NO generic system fonts

**Layout principles:**
- Asymmetric grids — break the rigid 12-column grid intentionally
- Generous whitespace — let content breathe
- Editorial overlap — text overlaps images, captions sit in margins
- Mobile-first but desktop should feel like flipping through a premium magazine
- Sticky navigation header with logo left, menu center, "Termin buchen" CTA far right

**Photography style:**
- Editorial beauty photography — close-up hands with manicured nails, soft-focus portraits, minimalist product shots, natural-light salon interiors
- Color grading: warm, soft contrast, slightly desaturated
- NO stock photo clichés (no women laughing with salads, no fake smiles, no group high-fives)
- Use placeholder images with these themes: hands close-up, salon interior, product flat-lay, brow/lash macro shots

**Motion:**
- Subtle and refined — gentle fade-ins on scroll, smooth hover transitions
- NO aggressive animations, NO bouncing elements, NO parallax overload
- Hover states: subtle color shifts, gentle underlines, micro-scale (max 1.02)
- Page transitions: smooth fade, no slide-from-side

---

## REQUIRED PAGES

### 1. Homepage (`/`)

**Section 1 — Sticky Navigation Header**
- Left: Logo "Vienna Glow Studio" in serif font
- Center (desktop only): Menu links — Leistungen, Über uns, Galerie, Kontakt
- Right: "Jetzt buchen" button (gold accent, outlined style)
- Mobile: Hamburger menu, logo center, booking button right
- Background: Transparent on top of hero, becomes cream with subtle border on scroll

**Section 2 — Hero**
- Full viewport height (90vh)
- Background: Editorial close-up photograph (manicured hands, soft salon interior)
- Overlay: Subtle warm gradient from bottom for text legibility
- Headline (large serif): "Schönheit, die bleibt."
- Subheadline (sans-serif, 18px): "Nails, Gesichtspflege, Wimpern & Brauen — professionell und mit Liebe zum Detail. Buchen Sie Ihren Wunschtermin bequem online."
- Primary CTA button: "Jetzt Termin buchen" (filled gold)
- Secondary CTA: "Leistungen entdecken" (text link with arrow)
- Small trust line below CTAs: "✓ Online buchbar  ✓ Flexible Termine  ✓ Erfahrene Expertinnen"
- Layout: Text left-aligned, takes 50% of width on desktop, full width on mobile

**Section 3 — Brand Statement**
- Background: Cream
- Single large pull-quote in serif: "Seit 2018 Ihr vertrauensvoller Ort für Schönheit im Herzen Wiens."
- Below: Two-column layout — short paragraph left, editorial portrait or interior photo right
- Small stats row: "500+ zufriedene Kundinnen" · "6 Jahre Erfahrung" · "100% Bio-Produkte"

**Section 4 — Services Overview**
- Section title: "Unsere Leistungen" (small uppercase eyebrow + large serif headline)
- Three cards in horizontal grid (stacks on mobile):
  - Card 1: Nails — image, "Nails", short description, link "Mehr erfahren →"
  - Card 2: Gesichtspflege — image, "Gesichtspflege", short description, link
  - Card 3: Wimpern & Brauen — image, "Wimpern & Brauen", short description, link
- Card style: No borders, generous padding, image fills top 60%, text in lower 40%
- Hover effect: Subtle image zoom, link underline animates in

**Section 5 — Featured Treatments**
- Section title: "Beliebte Behandlungen"
- List of 6 popular treatments in elegant table or list format:
  - Gel Maniküre — 60 Min — €45
  - Nail Art Design — 90 Min — €65
  - HydraFacial Classic — 45 Min — €89
  - Wimpernverlängerung — 120 Min — €95
  - Augenbrauen Styling — 30 Min — €35
  - Anti-Aging Behandlung — 75 Min — €120
- Each row: Treatment name (medium weight) — Duration (light) — Price (gold accent)
- Below list: "Alle Leistungen ansehen →" link

**Section 6 — About / Philosophy**
- Background: Soft sand color (#F4F1EA)
- Asymmetric two-column layout
- Left (60%): Editorial photo of salon interior or owner portrait
- Right (40%): Text block
  - Eyebrow: "ÜBER UNS"
  - Headline: "Handwerk trifft auf Hingabe."
  - Body paragraph (3-4 sentences) about philosophy, expertise, care for each client
  - Signature/quote attribution if appropriate

**Section 7 — Gallery**
- Section title: "Unsere Arbeit"
- 6-image grid in editorial layout (not uniform 3x2 — use varying sizes for visual interest)
- Images: nail art, facial treatment, brow work, salon ambiance, products, hands close-up
- Hover: subtle zoom + caption fade-in
- Below: "Mehr auf Instagram" link with Instagram icon

**Section 8 — Testimonials**
- Section title: "Stimmen unserer Kundinnen"
- 3 testimonial cards in horizontal layout
- Each card:
  - Quote in serif italic, 18px
  - 5 small gold stars
  - Customer first name + last initial in small caps
- Background: Cream with subtle dividers between cards
- NO bubble chat style, NO avatar circles

**Section 9 — Booking CTA Block**
- Full-width section with background image (atmospheric salon photo, dimmed)
- Centered content overlay:
  - Eyebrow: "TERMIN VEREINBAREN"
  - Headline (large serif, light color): "Ihr Wunschtermin ist nur einen Klick entfernt."
  - Subtext: "Wählen Sie Ihre Wunschzeit, wir kümmern uns um den Rest."
  - Primary button: "Online buchen" (filled gold)
  - Secondary button: "Per WhatsApp buchen" (outlined)
- Height: 60vh

**Section 10 — Contact & Location**
- Two-column layout
- Left: Contact info
  - Address: Mariahilfer Straße 45, 1060 Wien
  - Phone: +43 1 234 5678
  - Email: hello@viennaglowstudio.at
  - Opening hours table (Mo-Fr 9-19, Do bis 21, Sa 10-17, So geschlossen)
- Right: Google Maps embed (styled to match aesthetic — light theme, minimal POIs)

**Section 11 — Footer**
- Three-column layout:
  - Column 1: Logo + tagline + short description
  - Column 2: Quick links (Leistungen, Über uns, Galerie, Kontakt, Termin buchen)
  - Column 3: Legal (Impressum, Datenschutzerklärung, AGB) + Social icons (Instagram, Facebook)
- Bottom bar: "© 2026 Vienna Glow Studio · Powered by Beauty Booking OS"
- Background: Deep charcoal (#2D2926) with cream text

---

### 2. Booking Page (`/booking`)

**Layout:** Two-column on desktop (form left, summary right), single-column on mobile.

**Header:** Same sticky navigation as homepage.

**Page intro:**
- Eyebrow: "TERMIN VEREINBAREN"
- Headline (serif): "Ihr Termin in wenigen Schritten."
- Subtitle: "Wir melden uns innerhalb von 24 Stunden zur Bestätigung."

**Form (left column):**
- Field 1: Vor- und Nachname (required, text input)
- Field 2: E-Mail-Adresse (required, email input)
- Field 3: Telefonnummer (required, tel input)
- Field 4: Gewünschte Leistung (required, dropdown with all services)
- Field 5: Wunschdatum (date picker)
- Field 6: Wunschzeit (time picker)
- Field 7: Anmerkungen (optional, textarea, max 500 chars)
- GDPR consent section (REQUIRED — Austrian law):
  - Checkbox 1 (REQUIRED): "Ich stimme der Verarbeitung meiner Daten gemäß Datenschutzerklärung zu."
  - Checkbox 2 (REQUIRED): "Ich möchte Terminerinnerungen per E-Mail erhalten."
  - Checkbox 3 (OPTIONAL): "Ich möchte über Angebote und Neuigkeiten informiert werden."
- Submit button: "Termin anfragen" (filled gold, full width)

**Form styling:**
- Generous spacing between fields (24px)
- Large input fields (56px height) with subtle borders
- Floating labels or large labels above fields
- NO default browser styling — fully custom
- Focus state: gold border + subtle glow
- Error state: warm red, never harsh
- Required fields marked with subtle gold asterisk

**Summary (right column, sticky on scroll):**
- Card with cream background
- Heading: "Was Sie erwartet"
- Bullet list:
  - ✓ Schnelle Bestätigung innerhalb von 24h
  - ✓ Flexible Umbuchung bis 12h vorher
  - ✓ Automatische Erinnerung 24h und 3h vorher
  - ✓ Keine versteckten Kosten
- Below: Contact info if customer prefers calling/WhatsApp

---

### 3. Thank You Page (`/booking/thank-you`)

**Layout:** Centered, single column, generous vertical space.

**Content:**
- Large success indicator (subtle checkmark icon in gold circle, NOT cartoonish)
- Headline (serif): "Vielen Dank!"
- Subheadline: "Ihre Terminanfrage ist bei uns eingegangen."
- Body text: "Wir melden uns innerhalb von 24 Stunden zur Bestätigung Ihres Wunschtermins. Bei dringenden Anfragen erreichen Sie uns unter +43 1 234 5678 oder per WhatsApp."
- Button: "Zur Startseite" (outlined gold)
- Below: "Folgen Sie uns auf Instagram für Inspiration" with Instagram icon

---

### 4. Services Page (`/leistungen`)

**Layout:** Editorial grid with categories.

**Header:** Sticky navigation.

**Hero:** 
- Eyebrow: "LEISTUNGEN"
- Headline (serif, large): "Behandlungen, die begeistern."
- Subtitle: "Jede Behandlung — handverlesen, professionell ausgeführt, mit Sorgfalt für Ihr Wohlbefinden."

**Three category sections (Nails, Gesichtspflege, Wimpern & Brauen):**
- Each section has:
  - Category headline + short description
  - Editorial image
  - Treatment list with name, duration, price
  - Each treatment is clickable → expands to show full description
  - "Diese Behandlung buchen" link → navigates to /booking with service pre-selected

---

### 5. About Page (`/ueber-uns`)

**Sections:**
- Hero with brand statement
- Story section (founding, philosophy)
- Team section (placeholder cards for stylists)
- Values section (3 columns: Expertise, Hygiene, Atmosphere)
- CTA to booking

---

### 6. Datenschutzerklärung Page (`/datenschutz`)

**Layout:** Single column, max-width 720px, generous reading typography.

**Content:** German GDPR-compliant privacy policy template covering:
- Data controller information
- Types of data collected
- Purpose of data processing
- Legal basis (consent)
- Data retention period
- User rights (access, deletion, portability)
- Cookie policy
- Contact for data protection inquiries

This is legal text — clean, readable, no decoration.

---

### 7. Impressum Page (`/impressum`)

**Layout:** Single column, simple. Austrian legal requirement.

**Content:**
- Company name and legal form
- Address
- Contact info
- Commercial register details
- VAT number
- Responsible person
- Disclaimer

---

## TECHNICAL REQUIREMENTS

### Framework & Stack
- **Framework:** Next.js 15 with App Router and TypeScript
- **Styling:** Tailwind CSS with custom design tokens
- **Components:** Server Components by default, Client Components only where interactivity needed
- **Forms:** React Hook Form + Zod validation
- **Animation:** Framer Motion for subtle transitions only
- **Icons:** Lucide React (used sparingly, never as decoration)
- **Fonts:** Next.js font optimization (next/font/google or local fonts)
- **Images:** Next.js Image component with proper sizes and lazy loading

### Code Quality
- Fully responsive (mobile 375px, tablet 768px, desktop 1280px, large 1536px)
- Mobile-first CSS approach
- Semantic HTML (proper heading hierarchy, landmark elements)
- ARIA labels where needed
- WCAG AA color contrast (verified)
- Lighthouse score target: 95+ on all metrics
- SEO meta tags for each page (title, description, OG image)
- Multilingual ready (DE primary, EN/TR optional secondary)

### Performance
- Lazy loading for below-fold images
- Font subsetting (only Latin characters needed for German)
- No unnecessary JavaScript bundles
- CSS-only animations where possible

### Integration Points (IMPORTANT)
This website will be integrated into an existing **Beauty Booking OS** monorepo. The form submission must:
- POST to `/api/lead` endpoint with this exact shape:
```typescript
{
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  gdprDataProcessing: true;        // Required
  gdprReminders: true;              // Required
  gdprMarketing: boolean;           // Optional
  source: "web_form";
  clientSlug: "demo-salon";         // From env: NEXT_PUBLIC_DEFAULT_CLIENT_SLUG
}
```
- Service options must be loaded from a config file at `clients/demo-salon/services.json` (not hardcoded)
- Branding tokens (colors, salon name, contact) must be loaded from `clients/demo-salon/client.config.json` and `branding.json`
- After successful submission, redirect to `/booking/thank-you`

### File Structure (Match Existing)
```
apps/web/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                    # Homepage
│   │   ├── leistungen/page.tsx
│   │   ├── ueber-uns/page.tsx
│   │   ├── datenschutz/page.tsx
│   │   └── impressum/page.tsx
│   ├── booking/
│   │   ├── page.tsx
│   │   └── thank-you/page.tsx
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── BrandStatement.tsx
│   │   ├── ServicesOverview.tsx
│   │   ├── FeaturedTreatments.tsx
│   │   ├── About.tsx
│   │   ├── Gallery.tsx
│   │   ├── Testimonials.tsx
│   │   ├── BookingCTA.tsx
│   │   └── ContactLocation.tsx
│   ├── booking/
│   │   ├── BookingForm.tsx
│   │   └── BookingSummary.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Checkbox.tsx
│       └── Container.tsx
└── lib/
    ├── config.ts                       # Loads from clients/{slug}/
    └── api.ts
```

---

## DELIVERABLES

1. **Complete Next.js project** with all pages above
2. **All components** in TypeScript with proper typing
3. **Tailwind config** with custom design tokens (colors, fonts, spacing)
4. **Responsive across all breakpoints** (test mobile, tablet, desktop)
5. **Form integration** ready to POST to `/api/lead`
6. **Placeholder images** with appropriate aspect ratios (use Unsplash beauty/salon images)
7. **Clean, semantic, accessible HTML**
8. **No console errors, no broken links**

---

## CRITICAL CONSTRAINTS — DO NOT VIOLATE

1. NO purple-to-pink gradients
2. NO generic AI-style designs (no overused glassmorphism, no cliché hero patterns)
3. NO emoji in headlines or body text (use SVG icons sparingly)
4. NO stock photo clichés
5. NO Lorem Ipsum — use real German content from this brief
6. NO Bootstrap, NO Material UI, NO ChakraUI — only Tailwind
7. NO bouncing animations, NO parallax overload
8. NO hardcoded values for salon name, services, or contact info — load from config
9. NO browser default form styling — fully custom inputs
10. Booking button must be visible and accessible from every page (sticky header)

---

## SUCCESS CRITERIA

The final website should:
- Look like it belongs to a €120 facial treatment, not a €15 nail file
- Feel calm and confident, never desperate or salesy
- Make visitors trust the salon before they read a single word of body text
- Convert visitors into bookings without aggressive popups or fake urgency
- Work perfectly on a mobile phone in one hand
- Pass GDPR compliance for Austrian/EU law
- Integrate seamlessly with the existing Beauty Booking OS backend

When a visitor lands on this site, she should feel she's already being taken care of.
