-- Add providers.slug
ALTER TABLE providers ADD COLUMN slug VARCHAR(255);
UPDATE providers SET slug = 'provider-' || id::text;
ALTER TABLE providers ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_providers_slug ON providers(slug);

-- Create event_types table
CREATE TABLE event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  duration_minutes INT NOT NULL,
  price DOUBLE PRECISION,
  location VARCHAR,
  slug VARCHAR UNIQUE NOT NULL,
  description VARCHAR,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX idx_event_types_provider_id ON event_types(provider_id);
CREATE UNIQUE INDEX idx_event_types_slug ON event_types(slug);
