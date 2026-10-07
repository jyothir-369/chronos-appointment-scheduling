-- Add reminders_opt_out to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS reminders_opt_out BOOLEAN DEFAULT false;
