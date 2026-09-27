CREATE TABLE IF NOT EXISTS blocked_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  range_start_utc TIMESTAMPTZ NOT NULL,
  range_end_utc TIMESTAMPTZ NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT blocked_period_end_after_start CHECK (range_end_utc > range_start_utc)
);
CREATE INDEX IF NOT EXISTS blocked_periods_provider_range_idx ON blocked_periods (provider_id, range_start_utc, range_end_utc);
