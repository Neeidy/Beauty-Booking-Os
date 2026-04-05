# Deployment Checklist — Beauty Booking OS

Run this checklist before every production deploy. Check each item only when verified, not assumed.

---

## Environment Variables

- [ ] `DATABASE_URL` — Supabase PostgreSQL connection string
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Service role key (never expose to client)
- [ ] `ANTHROPIC_API_KEY` — Starts with `sk-ant-`
- [ ] `ADMIN_SECRET` — Strong random string (min 32 chars), for admin panel auth
- [ ] `WEBHOOK_SECRET` — Secret for `/api/jobs/*` endpoints
- [ ] `DEFAULT_CLIENT_SLUG` — Slug of the active salon (e.g. `demo-salon`)
- [ ] `NEXT_PUBLIC_SALON_NAME` — Displayed in admin panel and booking pages
- [ ] `NEXT_PUBLIC_SALON_DOMAIN` — Used in CORS headers (e.g. `https://viennaglowstudio.at`)
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` — Shown on thank-you page
- [ ] `DEMO_CLIENT_ID` — UUID of the client row in DB (used by admin routes)
- [ ] `WHATSAPP_APP_SECRET` — For webhook signature verification
- [ ] `WHATSAPP_VERIFY_TOKEN` — For webhook registration challenge
- [ ] `INSTAGRAM_APP_SECRET` — For webhook signature verification
- [ ] `INSTAGRAM_VERIFY_TOKEN` — For webhook registration challenge
- [ ] `RESEND_API_KEY` — For outbound email

---

## Database

- [ ] All migrations applied (`packages/db/migrations/`)
- [ ] `clients` table has at least one row for the active salon
- [ ] `services` table populated (run `pnpm tsx scripts/clone-client.ts <slug>`)
- [ ] At least one admin user can log in at `/admin/login`
- [ ] RLS policies enabled on all tables in Supabase dashboard
- [ ] Database connection verified: `GET /api/health` returns `{ status: "ok" }`

---

## Config Files

- [ ] `clients/<slug>/client.config.json` validates against Zod schema
- [ ] `clients/<slug>/services.json` — all service IDs match `/^svc_[a-z0-9_]+$/`
- [ ] `clients/<slug>/branding.json` — `brandTone` fields complete
- [ ] No hard-coded salon names in code (search for previous salon slug)

---

## Functionality Smoke Tests

- [ ] Submit booking form → lead appears in Supabase `leads` table
- [ ] Lead classification runs → intent logged in `event_logs`
- [ ] Send test reminder: `POST /api/jobs/reminders/run` with `Authorization: Bearer <WEBHOOK_SECRET>`
- [ ] Admin panel loads at `/admin` (redirects to `/admin/login` when unauthenticated)
- [ ] Event log stream visible at `/admin/logs`
- [ ] GDPR export works: `GET /api/gdpr/export/<lead-id>` (with admin cookie)

---

## Security

- [ ] `.env` is gitignored — confirm with `git status`
- [ ] `ADMIN_SECRET` is at least 32 characters
- [ ] CORS `NEXT_PUBLIC_SALON_DOMAIN` is the exact production domain (not `*`)
- [ ] Rate limiting active — test by sending 35 POST requests to `/api/lead` in 1 minute
- [ ] Webhook signature verification: test with invalid signature → expect 403

---

## Reminder System

- [ ] At least one booking exists in `confirmed` status with `appointmentAt` in future
- [ ] Trigger reminder runner: `POST /api/jobs/reminders/run`
- [ ] Check `automation_jobs` table: job shows `status = completed`
- [ ] Check email/channel delivery for test booking

---

## GDPR

- [ ] Booking form has three consent checkboxes (data processing, reminders, marketing)
- [ ] Consent recorded in `gdpr_consents` after form submission
- [ ] `GET /api/gdpr/export/<id>` returns complete personal data
- [ ] `DELETE /api/gdpr/data/<id>` anonymizes all PII (verify in DB)
- [ ] Privacy policy page is live and linked from booking form
- [ ] `gdpr.dataControllerEmail` in client config is a real inbox

---

## Monitoring

- [ ] `GET /api/health` returns 200 with `{ status: "ok" }` in production
- [ ] Set up uptime monitor on `/api/health` (e.g. UptimeRobot, Checkly)
- [ ] Configure alert for when `/api/health` returns non-200

---

## Post-Deploy

- [ ] Visit salon landing page — renders correctly
- [ ] Visit `/admin` — redirects to login
- [ ] Submit a test lead through booking form
- [ ] Check Supabase dashboard — lead row created
- [ ] Check admin panel — lead visible in `/admin/leads`
- [ ] Run data retention dry run: `POST /api/jobs/retention?dry_run=true`
