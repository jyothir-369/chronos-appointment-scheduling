-- Reconcile AvailabilityRule timestamp columns with prisma/schema.prisma.
ALTER TABLE availability_rules
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE availability_rules
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
