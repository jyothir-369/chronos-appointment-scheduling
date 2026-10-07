-- Reconcile ReminderJob timestamp columns with prisma/schema.prisma.
-- Existing reminder rows are preserved.

ALTER TABLE reminder_jobs
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE reminder_jobs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;