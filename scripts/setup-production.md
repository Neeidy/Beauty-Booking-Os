# Production Setup — Step by Step

Run these commands once to prepare a fresh production environment.

## 1. Clone + install

```bash
git clone https://github.com/your-org/beauty-booking-os.git
cd beauty-booking-os
pnpm install --frozen-lockfile
```

## 2. Supabase setup

1. Create a new project at supabase.com
2. Copy the project URL, anon key, and service role key
3. Run migrations (choose one approach):

**Option A — Drizzle push (simplest for Supabase):**
```bash
cp .env.example .env
# Fill in DATABASE_URL from Supabase → Settings → Database → Connection string (URI)
cd packages/db
DATABASE_URL=postgresql://... pnpm db:push
```

**Option B — SQL migrations (more controlled):**
```bash
# In Supabase SQL Editor, run in order:
# 1. packages/db/src/migrations/001_initial_schema.sql
# 2. packages/db/src/migrations/002_rls_policies.sql
```

## 3. Seed demo salon

```bash
# From repo root — seeds clients + services tables
DATABASE_URL=postgresql://... pnpm tsx scripts/clone-client.ts demo-salon
```

Note the UUID printed for the demo-salon client — this is your `DEMO_CLIENT_ID`.

## 4. Vercel setup

```bash
# Install Vercel CLI
pnpm add -g vercel

# Link project
vercel link

# Set all environment variables (see .env.example for full list)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
vercel env add ANTHROPIC_API_KEY
vercel env add ADMIN_SECRET
vercel env add WEBHOOK_SECRET
vercel env add DEFAULT_CLIENT_SLUG
vercel env add NEXT_PUBLIC_SALON_NAME
vercel env add NEXT_PUBLIC_SALON_DOMAIN
vercel env add NEXT_PUBLIC_CONTACT_EMAIL
vercel env add DEMO_CLIENT_ID
# Add WhatsApp/Instagram keys when those channels go live

# Deploy
vercel --prod
```

## 5. Verify cron jobs

After deploy, verify in Vercel dashboard → Project → Settings → Cron Jobs:

| Schedule | Endpoint | Purpose |
|---|---|---|
| `0 * * * *` | `/api/jobs/reminders/run` | Hourly reminder check |
| `0 9 * * *` | `/api/jobs/recovery/run` | Daily cancellation recovery |
| `0 2 * * 0` | `/api/jobs/retention` | Weekly GDPR data retention |

Vercel cron jobs send a GET request with the `Authorization: Bearer <WEBHOOK_SECRET>` header automatically via the `vercel.json` config.

> **Note:** Vercel cron jobs use GET, but our job endpoints use POST. Either change endpoints to accept GET, or use Supabase `pg_cron` for POST triggers. For production, use Supabase pg_cron:
>
> ```sql
> SELECT cron.schedule('reminders', '0 * * * *',
>   $$SELECT net.http_post(
>     url := 'https://your-domain.vercel.app/api/jobs/reminders/run',
>     headers := '{"Authorization": "Bearer <WEBHOOK_SECRET>"}'::jsonb
>   )$$
> );
> ```

## 6. Smoke test

```bash
# Point at production URL
SMOKE_TEST_URL=https://your-domain.vercel.app \
SMOKE_TEST_ADMIN_SECRET=your-admin-secret \
SMOKE_TEST_WEBHOOK_SECRET=your-webhook-secret \
pnpm tsx scripts/smoke-test.ts
```

All 11 checks should pass.

## 7. WhatsApp webhook registration (when ready)

1. Meta Developer Console → App → WhatsApp → Configuration
2. Callback URL: `https://your-domain.vercel.app/api/webhook/whatsapp`
3. Verify token: value of `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to: `messages`

Same process for Instagram at → Instagram Basic Display → Webhooks.
