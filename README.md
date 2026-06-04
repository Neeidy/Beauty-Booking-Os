<h1 align="center">✨ Beauty Booking OS</h1>

<p align="center">
  <em>the operating system behind a busy salon</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white" alt="Supabase / PostgreSQL">
  <img src="https://img.shields.io/badge/tests-327%20passing-5cd887" alt="327 tests passing">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
</p>

<p align="center">
  <a href="https://beauty-booking-os-web.vercel.app">Live demo</a> ·
  <a href="https://beauty-booking-os-web.vercel.app/booking">Booking flow</a> ·
  <a href="docs/showcase/index.html">Interactive showcase</a>
</p>

> A config-driven, multi-tenant salon booking platform — a premium customer storefront **and** a full operational back-office — built end to end as a Next.js 15 monorepo.

Beauty Booking OS turns a single salon config into a complete product: a branded storefront with a guided booking flow, plus an admin back-office for leads, calendar, staff, rebooking, and AI-assisted intake. Each tenant is onboarded by adding configuration — no code changes — and the whole system runs live on Vercel + Supabase against a seeded demo salon. The UI is fully bilingual (DE/EN, formal *Sie*).

---

## Architecture

```
apps/web ── Next.js 15 monorepo  (storefront · admin · API routes)
   │
   ├─ Storefront    premium landing + guided 4-step booking
   │                live slot availability · hold-timer reservations · waiting list
   ├─ Admin         dashboard · leads Kanban · CRM · calendar · settings · staff · rebooking · AI logs
   ├─ API routes    slots · reservations · booking · leads · gdpr · jobs
   │
   ├─ packages/     db (Drizzle) · core · agents · shared · config · integrations
   ├─ AI agents     intake · booking · follow-up · content · orchestrator
   │                Claude · every output Zod-validated · token + cost logged
   └─ Scheduled     Vercel Cron ─▶ /api/jobs/*   (reminders · recovery · retention)
   │
   └─ Data & infra  Supabase (PostgreSQL) · Drizzle ORM · Resend (email) · Vercel
```

Tenants live under `clients/{slug}` (config + branding injected at runtime via `--brand-*` CSS variables). The German/English dictionaries are parity-locked — `de.json` and `en.json` (730 keys each) are kept identical by an automated test.

---

## Requirements

- **Node.js 20+** and **pnpm 9+**
- A **Supabase** project (PostgreSQL)
- An **Anthropic** API key (Claude — `claude-sonnet-4-20250514`)
- *(optional)* a **Resend** API key for transactional email — without it, emails simply log to the console

---

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create your environment file
cp .env.example .env        # Windows: copy .env.example .env
#    then set DATABASE_URL + Supabase keys, ANTHROPIC_API_KEY, and (optional) RESEND_API_KEY
```

`.env` and any real keys are git-ignored — only `.env.example` (placeholders only) is committed.

---

## Usage

```bash
pnpm dev          # web app on http://localhost:3030
pnpm test         # Vitest suite — 327 tests
pnpm typecheck    # tsc --noEmit across the monorepo
pnpm build        # production build
```

---

## Safety & guarantees

- **GDPR (Austrian law)** — explicit, unbundled consent (data processing + reminders required, marketing optional); JSON export; deletion **anonymises** instead of hard-deleting; auto-anonymisation after two years.
- **No double-booking** — slot holds plus a PostgreSQL exclusion constraint guarantee one booking per slot.
- **Admin auth on every `/api/admin/*` route** — constant-time secret comparison.
- **AI guardrails** — every agent output is Zod-validated; low-confidence intents escalate to human review; each call is token- and cost-logged to `event_logs`.
- **Secrets are git-ignored** — `.env` and real credentials never enter version control.
- **Rate limiting** on public endpoints.

---

## AI & internationalisation

Lead intake and classification run through Claude agents with confidence scoring and automatic human-review escalation below threshold — no raw model JSON is ever trusted (every output passes a Zod schema). The entire UI ships in German and English (formal *Sie*), resolved server-side from a cookie, with the two dictionaries locked in parity by test.

---

## Project layout

| Path | Purpose |
|---|---|
| `apps/web/` | Next.js app — storefront, admin back-office, API routes |
| `apps/web/app/api/` | Route handlers — booking · slots · reservations · leads · admin · gdpr · jobs |
| `packages/db/` | Drizzle schema + Supabase Postgres client |
| `packages/core/` | Domain logic, job runner, shared types |
| `packages/agents/` | Claude agents — intake · booking · follow-up · content · orchestrator |
| `packages/shared/` | Anthropic client wrapper + cross-cutting utilities |
| `packages/config/` | Config loading + schemas |
| `packages/integrations/` | External integrations (Resend email) |
| `clients/{slug}/` | Per-tenant config — `client.config.json`, `services.json`, `branding.json`, `staff.json` |
| `docs/` | Documentation, sprint log, known issues, interactive showcase |

---

## Testing

**327 automated tests** across 37 files (Vitest) — covering API routes, the booking/reservation flow, Vienna-timezone helpers, AI-agent schema validation, the job runner, and config loading. Guardrail tests include **i18n parity** ([`locale.test.ts`](apps/web/lib/i18n/__tests__/locale.test.ts)) and **design-token generation** ([`branding-to-css.test.ts`](apps/web/lib/__tests__/branding-to-css.test.ts)). Deferred items and security-audit outcomes are documented in [`docs/known-issues.md`](docs/known-issues.md).

---

## Author

**Built by Yigitcan Uk**

[LinkedIn](https://www.linkedin.com/in/yigitcanuk/) · [GitHub](https://github.com/Neeidy)

---

## License

Released under the [MIT License](LICENSE).
