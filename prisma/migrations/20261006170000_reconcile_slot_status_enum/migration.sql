-- Reconcile slots.status with Prisma SlotStatus enum.
-- Existing values verified: open, booked.

-- The existing partial index compares status as TEXT and therefore
-- must be removed before changing the column type.
DROP INDEX IF EXISTS slots_open_idx;

ALTER TABLE slots
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE slots
ALTER COLUMN status TYPE "SlotStatus"
USING status::"SlotStatus";

ALTER TABLE slots
ALTER COLUMN status SET DEFAULT 'open'::"SlotStatus";

-- Recreate the partial index using the enum type.
CREATE INDEX slots_open_idx
ON slots (provider_id, slot_start_utc)
WHERE status = 'open'::"SlotStatus";
