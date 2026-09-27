-- Stage D §2.1 — Multi-service / variable-duration bookings
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes BETWEEN 5 AND 240),
  buffer_minutes INT NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  price_cents INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Slots gain service_id (nullable = generic service)
ALTER TABLE slots ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;
