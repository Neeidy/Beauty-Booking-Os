# Client Onboarding Guide — Beauty Booking OS

This guide walks through adding a new salon client to the system. No code changes required — only config files.

---

## Overview

Each salon is a "client" with its own config directory under `clients/<slug>/`. The system reads these files at runtime and applies them to all agent calls, message generation, and feature access.

**Time required:** ~30 minutes for a standard onboarding.

---

## Step 1: Gather Information from the Salon

Before creating any files, collect:

| Item | Example | Notes |
|---|---|---|
| Salon name | Vienna Glow Studio | Full legal name |
| URL slug | `vienna-glow-studio` | Lowercase, hyphens only |
| Package | `starter` / `growth` / `premium` | See package comparison below |
| Languages | `["de", "en", "tr"]` | ISO 639-1 codes |
| Timezone | `Europe/Vienna` | IANA timezone string |
| Operating hours | Mon–Fri 9–19, Sat 10–17 | For after-hours lead handling |
| Contact details | Phone, email, address, Instagram | Displayed in confirmations |
| GDPR contact | datenschutz@salon.at | Legal requirement for EU |
| Services | Name, duration, price | Full service menu |
| Brand tone | "warm, direct, premium" | Personality description |
| Formality | `Sie-Form` / `Du-Form` | German formality level |
| Emoji policy | allowed / not allowed | Affects all AI messages |

---

## Step 2: Create the Config Directory

```bash
cp -r clients/demo-salon clients/<new-slug>
```

Then edit the four config files:

### `client.config.json`

Key fields to change:
- `clientName`, `slug` — must be unique across all clients
- `packageType` — controls which features are available
- `languages`, `defaultLanguage`
- `timezone`
- `operatingHours` — set `null` for closed days
- `contact` — all fields
- `gdpr.dataControllerEmail` — MUST be a real inbox
- `gdpr.privacyPolicyUrl` — must be a live URL before go-live
- `bookingRules` — adjust reminders, recovery window, cancellation policy

### `services.json`

- Each service ID must match `/^svc_[a-z0-9_]+$/` (e.g. `svc_gel_manicure`)
- `priceEur` is in **cents** (e.g. 4500 = €45.00), or `null` for "on request"
- `popular: true` highlights the service in the booking form

### `branding.json`

- `brandTone.style` — used in every AI-generated message (keep it 3–5 words)
- `brandTone.avoid` — words/phrases the AI must never use
- `brandTone.formalityLevel` — `"Sie-Form"` or `"Du-Form"`
- `brandTone.allowEmojis` — applies globally to all message types
- `messageTemplates` — booking confirmation, 24h reminder, 3h reminder per language

### `prompts.json`

Usually no changes needed. Only edit if the salon needs custom intake instructions (e.g., specific service restrictions, age requirements).

---

## Step 3: Validate the Config

```bash
pnpm tsx scripts/clone-client.ts <new-slug> --dry-run
```

This will:
- Load and validate all four config files against Zod schemas
- Report any validation errors with field paths
- Show which services would be created/updated
- NOT write to the database

Fix any errors before continuing.

---

## Step 4: Push to Database

```bash
pnpm tsx scripts/clone-client.ts <new-slug>
```

This will:
- Create/update the `clients` row
- Delete and re-insert all services for this client
- Print a summary of what was written

Verify in Supabase dashboard: `clients` table should have a new row.

---

## Step 5: Configure Environment Variables

Set these in Vercel (or your deployment environment):

```
DEFAULT_CLIENT_SLUG=<new-slug>
NEXT_PUBLIC_SALON_NAME=<Salon Name>
NEXT_PUBLIC_SALON_DOMAIN=https://<salon-domain>
NEXT_PUBLIC_CONTACT_EMAIL=<contact@salon.at>
DEMO_CLIENT_ID=<uuid from clients table>
```

---

## Step 6: Verify the Clone

Run the clone validation tests to confirm isolation:

```bash
pnpm --filter "@beauty-booking/core" test --run src/flows/clone-validation.test.ts
```

All 14 tests should pass.

---

## Step 7: Test the Full Flow

1. Visit `/booking` — salon name should appear
2. Submit a test lead
3. Check `/admin/leads` — lead should appear with correct `clientId`
4. Trigger classification: check `/admin/logs` for `intake_agent` event
5. Send test reminder: `POST /api/jobs/reminders/run`

---

## Package Comparison

| Feature | Starter | Growth | Premium |
|---|---|---|---|
| AI intake classification | No | Yes | Yes |
| AI booking conversation | No | Yes | Yes |
| AI follow-up reminders | No | Yes | Yes |
| Cancellation recovery | No | Yes | Yes |
| Multi-language (DE/EN/TR) | No | Yes | Yes |
| Instagram DM flow | No | No | Yes |
| Advanced reporting | No | No | Yes |
| Max reminders per booking | 1 | 2 | 3 |
| Channels | Web only | Web + WhatsApp | All channels |

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Slug has uppercase or spaces | Use lowercase hyphens only: `elegant-nails` |
| Service IDs not prefixed with `svc_` | Add `svc_` prefix: `svc_gel_manicure` |
| Price in euros instead of cents | Multiply by 100: €45 → 4500 |
| Privacy policy URL not live | Deploy privacy page before enabling bookings |
| GDPR email is a no-reply | Must be a monitored inbox — legal requirement |
| Hard-coded salon name in code | Search for previous slug, replace with env vars |

---

## Removing a Client

To deactivate (not delete — preserves audit trail):

```sql
UPDATE clients SET status = 'churned' WHERE slug = '<slug>';
```

Data retention will continue anonymizing data per the configured `dataRetentionDays`.
