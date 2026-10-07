-- Reconcile AvailabilityRule time columns with Prisma String fields.
-- Existing values are PostgreSQL TIME and are preserved as HH:MM strings.

ALTER TABLE availability_rules
DROP CONSTRAINT IF EXISTS availability_rules_check;

ALTER TABLE availability_rules
ALTER COLUMN start_time TYPE VARCHAR(5)
USING TO_CHAR(start_time, 'HH24:MI');

ALTER TABLE availability_rules
ALTER COLUMN end_time TYPE VARCHAR(5)
USING TO_CHAR(end_time, 'HH24:MI');

ALTER TABLE availability_rules
ADD CONSTRAINT availability_rules_check
CHECK (end_time > start_time);
