-- ============================================================================
-- Beauty Booking OS — V2-11 Slot Reservations Migration
-- Apply to Supabase PostgreSQL instance via SQL editor.
-- ============================================================================

-- Enable btree_gist (required for exclusion constraint).
-- Supabase pre-enables this extension. If this fails, remove the
-- ADD CONSTRAINT block below and use the transaction fallback in code.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Reservation status enum
CREATE TYPE reservation_status AS ENUM ('active', 'submitted', 'released', 'expired');

-- slot_reservations table
CREATE TABLE slot_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id),
  service_id      UUID NOT NULL REFERENCES services(id),
  reservation_token TEXT NOT NULL UNIQUE,
  slot_start      TIMESTAMPTZ NOT NULL,
  slot_end        TIMESTAMPTZ NOT NULL,
  status          reservation_status NOT NULL DEFAULT 'active',
  expires_at      TIMESTAMPTZ NOT NULL,
  submitted_at    TIMESTAMPTZ,
  released_at     TIMESTAMPTZ,
  lead_id         UUID REFERENCES leads(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_slot_reservations_token
  ON slot_reservations (reservation_token);

CREATE INDEX idx_slot_reservations_client_status_expires
  ON slot_reservations (client_id, status, expires_at);

CREATE INDEX idx_slot_reservations_client_slot_start
  ON slot_reservations (client_id, slot_start);

CREATE INDEX idx_slot_reservations_lead_id
  ON slot_reservations (lead_id) WHERE lead_id IS NOT NULL;

-- DB-level overlap protection via exclusion constraint.
-- Prevents two active/submitted reservations from overlapping for the same client.
-- Requires btree_gist extension (see above).
ALTER TABLE slot_reservations
  ADD CONSTRAINT no_overlap_active_submitted
  EXCLUDE USING gist (
    client_id WITH =,
    tstzrange(slot_start, slot_end, '[)') WITH &&
  )
  WHERE (status IN ('active', 'submitted'));

-- RLS
ALTER TABLE slot_reservations ENABLE ROW LEVEL SECURITY;

-- Server-side only access (service role bypasses RLS).
-- No direct public/anon browser access.
CREATE POLICY "slot_reservations_server_only"
  ON slot_reservations
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
