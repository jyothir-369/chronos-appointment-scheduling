CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Phase 2: Full schema per plan §5 (data model) and Phase 2 exit criteria
-- All times stored as UTC timestamptz; timezone names are IANA ids (validated by app)

CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  slot_minutes INT NOT NULL CHECK (slot_minutes BETWEEN 5 AND 240),
  cancellation_window_hours INT NOT NULL DEFAULT 24 CHECK (cancellation_window_hours >= 0),
  reminder_offsets_minutes INT[] NOT NULL DEFAULT '{1440,60}'
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  slot_start_utc TIMESTAMPTZ NOT NULL,
  slot_end_utc TIMESTAMPTZ NOT NULL,
  display_tz TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','booked','blocked')),
  CONSTRAINT slots_end_after_start CHECK (slot_end_utc > slot_start_utc),
  CONSTRAINT slots_provider_start_uniq UNIQUE (provider_id, slot_start_utc)
);

CREATE INDEX IF NOT EXISTS slots_open_idx ON slots (provider_id, slot_start_utc) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','completed','cancelled','no_show')),
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_live_per_slot ON bookings (slot_id) WHERE status <> 'cancelled';

CREATE TABLE IF NOT EXISTS reminder_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  offset_minutes INT NOT NULL,
  fire_at_utc TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sending','sent','cancelled','skipped','failed')),
  attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  last_error TEXT,
  UNIQUE (booking_id, offset_minutes)
);

CREATE INDEX IF NOT EXISTS reminder_due_idx ON reminder_jobs (fire_at_utc) WHERE status IN ('scheduled','sending');

CREATE TABLE IF NOT EXISTS idempotency_keys (
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INT,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, key)
);

-- Exclusion constraint: no overlapping slots per provider (defence-in-depth per F2)
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE slots ADD CONSTRAINT IF NOT EXISTS slots_no_overlap
  EXCLUDE USING gist (provider_id WITH =, tstzrange(slot_start_utc, slot_end_utc, '[)') WITH &&);
