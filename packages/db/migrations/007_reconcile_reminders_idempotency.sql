-- Reconcile reminder_jobs with application code (DB-version: offset_minutes/int, fire_at_utc, attempts, text status)
-- Preserve existing reminder_jobs data; add missing attempts/default if column gap exists safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reminder_jobs' AND column_name='attempts') THEN
    ALTER TABLE reminder_jobs ADD COLUMN attempts INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Ensure idempotency_keys table exists with DB-migration schema (client_id, key, request_hash, response_status, response_body, created_at)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='idempotency_keys') THEN
    CREATE TABLE idempotency_keys (
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      response_status INT,
      response_body JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (client_id, key)
    );
  END IF;
END $$;

-- Add index on reminder_jobs for worker performance if missing
CREATE INDEX IF NOT EXISTS reminder_due_idx ON reminder_jobs (fire_at_utc) WHERE status IN ('scheduled','sending');
