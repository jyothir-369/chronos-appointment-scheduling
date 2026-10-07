-- Add active flag to availability rules
ALTER TABLE availability_rules
ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
