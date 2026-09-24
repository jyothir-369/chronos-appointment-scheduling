-- Phase 2 seed: 1 provider with weekly availability rules and materialized slots
BEGIN;

INSERT INTO providers (id, name, timezone, slot_minutes, cancellation_window_hours, reminder_offsets_minutes)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Dr. Chronos Test Provider',
  'America/New_York',
  30,
  24,
  ARRAY[1440, 60]
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO clients (id, email, name)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21',
  'client@example.com',
  'Test Client'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO availability_rules (provider_id, day_of_week, start_time, end_time)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1, '09:00', '17:00'), -- Monday
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3, '09:00', '17:00'), -- Wednesday
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 5, '09:00', '12:00')  -- Friday half-day
ON CONFLICT DO NOTHING;

COMMIT;
