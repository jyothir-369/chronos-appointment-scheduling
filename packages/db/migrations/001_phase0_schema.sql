CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Phase 0 schema foundation; full constraints per §5 of plan
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
