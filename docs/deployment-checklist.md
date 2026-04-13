# Beauty Booking OS — Deployment Checklist

## Environment Variables

- [ ] `DATABASE_URL` — Supabase PostgreSQL connection string
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Service role key (never expose to client)
- [ ] `ANTHROPIC_API_KEY` — Starts with `sk-ant-`
- [ ] `ADMIN_SECRET` — Strong random string (min 32 chars)
- [ ] `WEBHOOK_SECRET` — Secret for `/api/jobs/*` endpoints (min 32 chars)
- [ ] `DEFAULT_CLIENT_SLUG` — Active salon slug (e.g. `demo-salon`)
- [ ] `DEMO_CLIENT_ID` — UUID of the client row in DB (used by all admin routes)
- [ ] `NEXT_PUBLIC_DEMO_CLIENT_ID` — Same UUID, client-side BookingForm
- [ ] `NEXT_PUBLIC_DEFAULT_CLIENT_SLUG` — Same slug, client-side staff config
- [ ] `NEXT_PUBLIC_SALON_NAME` — Displayed in admin panel and booking pages
- [ ] `NEXT_PUBLIC_SALON_DOMAIN` — Exact production domain (e.g. `https://viennaglowstudio.at`)
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` — Shown on thank-you page
- [ ] `RESEND_API_KEY` — For outbound email
- [ ] `WHATSAPP_APP_SECRET` — For webhook signature verification
- [ ] `WHATSAPP_VERIFY_TOKEN` — For webhook registration challenge
- [ ] `INSTAGRAM_APP_SECRET` — For webhook signature verification
- [ ] `INSTAGRAM_VERIFY_TOKEN` — For webhook registration challenge

## Database

- [ ] All migrations applied (`packages/db/migrations/`)
  - `001_initial_schema.sql`
  - `002_rls_policies.sql`
  - `003_slot_reservations.sql` ← V2-11, applied manually to Supabase
- [ ] `btree_gist` extension enabled (required for slot_reservations exclusion constraint)
- [ ] `clients` table has at least one row — `DEMO_CLIENT_ID` matches this row's `id`
- [ ] `clients.config_snapshot` initialized: `UPDATE clients SET config_snapshot = '{}'::jsonb WHERE config_snapshot IS NULL;`
- [ ] `services` table populated with real UUIDs (not slug strings like `svc_gel_manicure`)
- [ ] `services.json` IDs match DB UUIDs exactly
- [ ] RLS policies enabled on all tables (verify in Supabase dashboard)
- [ ] Database connection verified: `GET /api/health` returns `{ status: "ok" }`

## Config Files

- [ ] `clients/<slug>/client.config.json` — all fields complete
  - `googleBusiness.profileUrl` — real Google Business booking URL (not demo placeholder)
  - `googleBusiness.reviewUrl` — real Google Reviews URL
  - `rebookingWeeks` — set to desired value (default 4)
  - `operatingHours` — correct for this salon
  - `gdpr.dataControllerEmail` — real inbox
- [ ] `clients/<slug>/services.json` — UUIDs match `services` table
- [ ] `clients/<slug>/staff.json` — exists (fallback if configSnapshot.staff empty)
- [ ] `clients/<slug>/branding.json` — `brandTone` fields complete
- [ ] No hard-coded demo salon names in code

## Logging

- [ ] Switch logger from `fs/logs/app.log` to Supabase `event_logs` table
  - `apps/web/lib/logger.ts` — replace `fs.appendFileSync` with DB insert
  - `apps/web/app/api/internal/log/route.ts` — update proxy to write to DB
  - Reason: Vercel filesystem is ephemeral — file logs lost on redeploy

## Security

- [ ] `.env` is gitignored — confirm with `git status`
- [ ] No real credentials in `.env.example` or any committed file
- [ ] `ADMIN_SECRET` is at least 32 characters
- [ ] `WEBHOOK_SECRET` is at least 32 characters
- [ ] `NEXT_PUBLIC_SALON_DOMAIN` is exact production domain (not `*`)
- [ ] Rate limiting active — test: 35 POST to `/api/lead` in 1 min → expect 429
- [ ] Webhook signature verification: invalid signature → expect 403
- [ ] `WEBHOOK_SECRET` set in production — dev mode auto-allow is disabled in prod

## Functionality Smoke Tests

- [ ] `GET /api/health` → `{ status: "ok" }` in production
- [ ] `GET /api/public/staff` → staff list (no `active` field exposed)
- [ ] `GET /api/booking/slots?date=YYYY-MM-DD&serviceId=<uuid>` → slots array
- [ ] `POST /api/booking/reservations` → `reservationToken` returned
- [ ] Submit booking form → lead in `leads` table, reservation `submitted`
- [ ] Lead classification runs → intent logged in `event_logs`
- [ ] Admin panel loads at `/admin` (redirects to `/admin/login` unauthenticated)
- [ ] `/admin/leads` — submitted lead visible
- [ ] `/admin/settings` — 4 sections render, save works
- [ ] `/admin/staff` — staff CRUD works
- [ ] Event log stream visible at `/admin/logs`
- [ ] GDPR export: `GET /api/gdpr/export/<lead-id>` returns personal data

## Slot Reservation System (V2-11)

- [ ] Select a slot → `reservationToken` returned, countdown visible
- [ ] Two tabs same slot → second gets 409
- [ ] Wait 10 min → slot reopens automatically
- [ ] Submit with valid token → lead created, reservation `submitted`
- [ ] Submit with expired token → 409

## Reminder System

- [ ] At least one booking in `confirmed` status with future `appointmentAt`
- [ ] `POST /api/jobs/reminders/run` with `x-webhook-secret` header → `{ processed: N }`
- [ ] `automation_jobs` table: reminder job shows `status = completed`

## Google Business Integration (V2-8/V2-9)

- [ ] Landing page shows "Jetzt buchen" Google button (config present)
- [ ] Google link includes `?source=google_business` query param
- [ ] `POST /api/jobs/reviews` with `x-webhook-secret` → processes completed bookings
- [ ] Review URL in config is real Google Reviews URL

## Rebooking Reminder (V2-10)

- [ ] `POST /api/jobs/rebooking` with `x-webhook-secret` → scheduled jobs created
- [ ] `GET /api/admin/rebooking` → jobs visible in admin

## GDPR

- [ ] Booking form has 3 consent checkboxes (data_processing, reminders, marketing)
- [ ] Consent recorded in `gdpr_consents` after form submission
- [ ] `GET /api/gdpr/export/<id>` returns complete personal data
- [ ] `DELETE /api/gdpr/data/<id>` anonymizes all PII
- [ ] Privacy policy page live and linked from booking form
- [ ] `gdpr.dataControllerEmail` in client config is a real inbox

## Monitoring

- [ ] `GET /api/health` returns 200 in production
- [ ] Set up uptime monitor on `/api/health` (UptimeRobot or Checkly)
- [ ] Alert configured for non-200 response from `/api/health`

## Post-Deploy Verification

- [ ] Visit salon landing page — renders correctly
- [ ] Visit `/admin` — redirects to login
- [ ] Submit a test lead through booking form end-to-end
- [ ] Check Supabase `leads` table — row created
- [ ] Check `slot_reservations` table — reservation `submitted`
- [ ] Check admin panel `/admin/leads` — lead visible
- [ ] Run retention dry run: `POST /api/jobs/retention?dry_run=true`
- [ ] Check `logs/` or `event_logs` — requests being logged
