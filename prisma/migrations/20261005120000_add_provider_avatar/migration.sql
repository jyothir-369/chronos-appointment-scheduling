-- Add avatar_url to providers
ALTER TABLE providers ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
