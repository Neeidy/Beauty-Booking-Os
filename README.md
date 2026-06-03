# Beauty Booking OS

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-327%20passing-brightgreen)
![License](https://img.shields.io/badge/license-proprietary-red)

> Multi-tenant, AI-assisted, bilingual (DE/EN) salon booking platform — a premium storefront **and** a full admin back-office, built end to end.

**Live demo:** <https://beauty-booking-os-web.vercel.app> · **Booking flow:** <https://beauty-booking-os-web.vercel.app/booking> · **Interactive showcase:** [`docs/showcase/index.html`](docs/showcase/index.html)

---

## Overview

Beauty Booking OS is a config-driven, multi-tenant platform for beauty salons. Each tenant gets a premium, branded storefront with a guided booking flow on the front end, and a complete operational back-office — front desk, CRM, calendar, staff, AI logs — on the back end. A new salon is onboarded by adding a config directory, not by writing code.

It is built as a single Next.js 15 + Turborepo monorepo and runs live on Vercel + Supabase against a seeded `demo-salon`.

## Key features

- **Premium storefront + guided 4-step booking** — live slot availability, hold-timer slot reservations (TTL-based, with a Postgres exclusion constraint preventing double-booking), and a waiting list for full slots.
- **Full admin back-office** — dashboard, lead **Kanban** (front desk), customer **CRM**, weekly **calendar**, **settings**, **staff** management, **rebooking** jobs, and **AI logs**.
- **AI agents (Claude)** — lead intake & classification with confidence scoring and automatic human-review escalation below threshold. Every agent output is **Zod-validated** (no raw `JSON.parse`) and every call is cost-logged (tokens + duration) to `event_logs`.
- **Full DE/EN internationalisation** — formal German *Sie* register, cookie-based locale resolution, and **730 parity-locked keys** per locale enforced by an automated test.
- **GDPR (Austrian law)** — explicit, unbundled consent; JSON export; anonymisation instead of hard-delete; automatic anonymisation after two years.
- **Multi-tenant by config** — per-salon `clients/{slug}` directories with runtime `--brand-*` CSS-variable theming.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router, TypeScript) · React 19 |
| Styling | Tailwind CSS v4 + design tokens (CSS variables) |
| Database | Supabase (PostgreSQL) + Drizzle ORM (via `postgres.js`) |
| Validation | Zod — every AI agent output is schema-validated |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`, model `claude-sonnet-4-20250514`) |
| Email | Resend — transactional email via its REST API (console fallback in dev) |
| Background jobs | Cron-triggered Next.js API routes (reminders, rebooking, recovery, reviews) |
| Monorepo | pnpm workspaces + Turborepo |
| Testing | Vitest — 327 tests across 37 files |
| Deploy | Vercel + Supabase |

## Monorepo structure

```
beauty-booking-os/
├─ apps/
│  └─ web/            # Next.js app — storefront, admin back-office, API routes
├─ packages/
│  ├─ db/             # Drizzle schema + client (Supabase Postgres)
│  ├─ core/           # Domain logic, job runner, shared types
│  ├─ agents/         # Claude agents (intake, booking, follow-up, content, orchestrator)
│  ├─ shared/         # Anthropic client wrapper + cross-cutting utilities
│  ├─ config/         # Config loading + schemas
│  └─ integrations/   # External integrations (e.g. Resend email)
├─ clients/
│  └─ {slug}/         # Per-tenant config: client.config.json, services.json, branding.json, staff.json
└─ docs/              # Documentation, sprint log, known issues, interactive showcase
```

## Getting started

### Prerequisites

- Node.js **≥ 20**
- pnpm **≥ 9**

### Setup

```bash
pnpm install
cp .env.example .env     # Windows: copy .env.example .env
```

Then fill in `.env` with your own **Supabase**, **Anthropic**, and **Resend** values. (`.env` is git-ignored — only `.env.example` is committed, and it contains placeholders only.)

### Develop

```bash
pnpm dev          # web app on http://localhost:3030
pnpm test         # Vitest suite (327 tests)
pnpm typecheck    # tsc --noEmit across the monorepo
pnpm build        # production build
```

## Internationalisation

The app ships full German/English localisation. German uses the formal *Sie* register throughout. The active locale is resolved **server-side** from a cookie — falling back to the tenant's `defaultLocale`, then English — so there are no locale-prefixed routes and no `localStorage`. Both dictionaries are **parity-locked**: an automated test flattens `de.json` and `en.json` and fails if their key sets ever diverge (currently **730 keys** per locale, kept in lockstep).

## Multi-tenant

Every salon is a directory under `clients/{slug}` carrying its own `client.config.json`, `services.json`, `branding.json`, and `staff.json`. Branding (colours, fonts, copy) is injected at runtime through `--brand-*` CSS variables, so onboarding a tenant means adding config — not changing code. The bundled `demo-salon` powers the live demo.

## GDPR

Built for Austrian data-protection rules. Consent is **explicit and unbundled** — separate fields for data processing (required), appointment reminders (required), and marketing (optional), with no pre-checked boxes. Customer data exports to JSON on request; deletion **anonymises** rather than hard-deletes, and records auto-anonymise after two years (730 days). Each tenant config carries a GDPR contact email.

## Testing

**327 automated tests across 37 files** run on Vitest (`pnpm test`) — covering API routes, the booking/reservation flow, Vienna-timezone helpers, AI-agent schema validation, the job runner, and configuration loading. Notable guardrails:

- **i18n parity** — [`locale.test.ts`](apps/web/lib/i18n/__tests__/locale.test.ts) fails the suite if the DE/EN dictionary key sets diverge.
- **Design tokens** — [`branding-to-css.test.ts`](apps/web/lib/__tests__/branding-to-css.test.ts) verifies per-tenant `--brand-*` CSS-variable generation.

## Deployment

Deployed on **Vercel** (web) + **Supabase** (PostgreSQL). All secrets are configured as environment variables in the Vercel dashboard and are **never** committed — the repository tracks only `.env.example` with placeholder values.

## Status & known issues

The system is stable (327 tests green, live and healthy on Vercel). Deferred items, accepted trade-offs, and the security-audit outcomes are documented in [`docs/known-issues.md`](docs/known-issues.md).

## License

Proprietary — **all rights reserved**. Published for portfolio and demonstration purposes only; not for reuse, redistribution, or commercial use without written permission. See [`LICENSE`](LICENSE).

## Author

Built by **Yigitcan Uk**
[LinkedIn](https://www.linkedin.com/in/yigitcanuk/) · [GitHub](https://github.com/Neeidy)
