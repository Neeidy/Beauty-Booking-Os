-- ============================================================================
-- Beauty Booking OS — Row Level Security Policies
-- Run this AFTER 001_initial_schema.sql.
-- Requires Supabase Auth to be configured.
-- ============================================================================

-- ── Enable RLS on all tables ──────────────────────────────────────────────────

ALTER TABLE clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_consents  ENABLE ROW LEVEL SECURITY;

-- ── Service role bypass (backend API uses service role key) ──────────────────
-- The service role key bypasses RLS by default in Supabase.
-- All server-side API routes use service role → full access.
-- Anon key (browser) → blocked by RLS → cannot read/write directly.

-- ── Public read for services (booking form needs service list) ────────────────

CREATE POLICY "public_read_active_services"
  ON services FOR SELECT
  USING (active = true);

-- ── No direct public access to PII tables ────────────────────────────────────
-- leads, bookings, messages, gdpr_consents: server-side API only
-- These tables have RLS enabled with no permissive policies for anon role,
-- so all anon access is blocked. Only service_role key (server) can access.

-- ── clients: public read of non-sensitive fields (for landing pages) ──────────

CREATE POLICY "public_read_active_clients"
  ON clients FOR SELECT
  USING (status = 'active');

-- ── event_logs: no public access ─────────────────────────────────────────────
-- All event_logs access is via service_role key in API routes.
-- No additional policy needed — default deny covers this.

-- ── automation_jobs: no public access ────────────────────────────────────────
-- Job runner uses service_role key. No anon access.
