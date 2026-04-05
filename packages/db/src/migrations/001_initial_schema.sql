-- ============================================================================
-- Beauty Booking OS — Initial Schema Migration
-- Run this against your Supabase PostgreSQL instance.
-- ============================================================================

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'qualified', 'booking_started', 'booked', 'lost', 'spam'
);

CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'reminded', 'completed', 'no_show', 'cancelled', 'rescheduled'
);

CREATE TYPE channel AS ENUM (
  'web_form', 'instagram_dm', 'whatsapp', 'email', 'phone', 'walk_in'
);

CREATE TYPE job_status AS ENUM (
  'scheduled', 'processing', 'completed', 'failed', 'cancelled'
);

CREATE TYPE package_type AS ENUM (
  'starter', 'growth', 'premium'
);

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE clients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'active',
  package_type        package_type NOT NULL DEFAULT 'starter',
  timezone            TEXT NOT NULL DEFAULT 'Europe/Vienna',
  languages           JSONB NOT NULL DEFAULT '["de"]',
  config_snapshot     JSONB,
  gdpr_contact_email  TEXT NOT NULL,
  data_retention_days INTEGER NOT NULL DEFAULT 730,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id),
  service_name     TEXT NOT NULL,
  category         TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_eur        INTEGER,
  description      TEXT,
  active           BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL REFERENCES clients(id),
  source               channel NOT NULL,
  customer_name        TEXT,
  customer_email       TEXT,
  customer_phone       TEXT,
  raw_message          TEXT,
  intent               TEXT,
  intent_confidence    INTEGER,
  status               lead_status NOT NULL DEFAULT 'new',
  assigned_to          TEXT,
  language             TEXT DEFAULT 'de',
  gdpr_consent_at      TIMESTAMPTZ,
  gdpr_consent_method  TEXT,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id),
  lead_id          UUID REFERENCES leads(id),
  service_id       UUID REFERENCES services(id),
  customer_name    TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  appointment_at   TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status           booking_status NOT NULL DEFAULT 'pending',
  reminder_sent_at JSONB,
  notes            TEXT,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id),
  lead_id     UUID REFERENCES leads(id),
  booking_id  UUID REFERENCES bookings(id),
  channel     channel NOT NULL,
  direction   TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  agent_name  TEXT,
  body        TEXT NOT NULL,
  metadata    JSONB,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE automation_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id),
  booking_id   UUID REFERENCES bookings(id),
  lead_id      UUID REFERENCES leads(id),
  job_type     TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at  TIMESTAMPTZ,
  status       job_status NOT NULL DEFAULT 'scheduled',
  attempts     INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  result       JSONB,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id),
  lead_id        UUID,
  booking_id     UUID,
  event_type     TEXT NOT NULL,
  agent_name     TEXT,
  input_summary  TEXT,
  output_summary TEXT,
  status         TEXT NOT NULL,
  duration_ms    INTEGER,
  token_count    INTEGER,
  error_message  TEXT,
  payload        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gdpr_consents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id),
  lead_id      UUID REFERENCES leads(id),
  consent_type TEXT NOT NULL,
  granted      BOOLEAN NOT NULL,
  method       TEXT NOT NULL,
  ip_address   TEXT,
  consent_text TEXT,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at   TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_leads_client_id       ON leads(client_id);
CREATE INDEX idx_leads_status          ON leads(status);
CREATE INDEX idx_leads_created_at      ON leads(created_at);
CREATE INDEX idx_bookings_client_id    ON bookings(client_id);
CREATE INDEX idx_bookings_appointment  ON bookings(appointment_at);
CREATE INDEX idx_bookings_status       ON bookings(status);
CREATE INDEX idx_automation_jobs_scheduled ON automation_jobs(scheduled_at, status);
CREATE INDEX idx_event_logs_client_id  ON event_logs(client_id);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);
CREATE INDEX idx_gdpr_consents_lead_id ON gdpr_consents(lead_id);
