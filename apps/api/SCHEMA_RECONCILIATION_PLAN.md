# Schema Reconciliation Plan (Design Only — Not Executed)

## Executive Summary
- DB and Prisma schema diverged. DB initialized from older/different source; migration SQL stub/empty.
- Authoritative schema: current Prisma schema (`prisma/schema.prisma` / `../../prisma/schema.prisma`).
- Existing DB has 2 providers (with legacy `slot_minutes`, `reminder_offsets_minutes`), 1 client, 84 slots, 4 idempotency_keys, 0 bookings, 0 reminder_jobs, 0 services, 0 blocked_periods, 0 waitlist_entries, NO event_types.
- Safe reconciliation possible via purely ADDITIVE strategy. No data loss. No destructive operations required.
- Human/business decision needed: confirm whether Prisma schema is authoritative (recommended) vs DB.

## Current Prisma vs Actual DB
- Provider: DB missing `slug`; DB has extra `slot_minutes`, `reminder_offsets_minutes`; otherwise matches.
- EventType: DB table entirely missing.
- Slot: DB has extra `service_id`, `display_tz`; structure matches otherwise.
- Booking: DB has extra `cancelled_at`, `client_timezone`; missing `notes`, `clientNotes` (not yet verified, needs audit); `version` default 1 vs Prisma 0.
- Client: DB has only id/email/name (missing company/phone/avatarUrl/createdAt/updatedAt if schema requires).
- Activity / Notification: needs full audit (tables may exist or not).
- ReminderJob: exists, close to schema.
- IdempotencyKey: exists, close.

## Complete Schema Differences
- MISSING: providers.slug, event_types table (and all its columns/indexes), clients.company/phone/avatarUrl/createdAt/updatedAt (if needed), bookings.notes/clientNotes (if needed), possibly activities/notifications tables/indexes.
- EXTRA (preserve): providers.slot_minutes, providers.reminder_offsets_minutes, slots.service_id, slots.display_tz, bookings.cancelled_at, bookings.client_timezone.
- TYPE/DEFAULT: bookings.version DB default 1 / Prisma 0; clients.name DB NOT NULL / Prisma optional.

## Existing Data Impact
- 2 providers have data; must receive deterministic `slug` via backfill.
- 84 slots use `display_tz`; 0 use `service_id`; all must remain untouched.
- 0 bookings — no cancellation/booking data to preserve (but table exists).
- No `event_types` data exists — new table safe.
- All legacy extra columns contain data (providers 2 rows, slots 84 rows); removing them would lose data.

## Legacy Columns
Preserve ALL: `slot_minutes`, `reminder_offsets_minutes`, `service_id`, `display_tz`, `cancelled_at`, `client_timezone`. They don't block Prisma and contain real data (slots.display_tz has 84 values).

## Missing Tables/Columns/Constraints
- `ALTER TABLE providers ADD COLUMN slug VARCHAR(255);`
- `UPDATE providers SET slug = 'provider-' || id;`
- `ALTER TABLE providers ALTER COLUMN slug SET NOT NULL;`
- `CREATE UNIQUE INDEX idx_providers_slug ON providers(slug);`
- `CREATE TABLE event_types (...);` with PK, FK to providers, unique slug, indexes.
- Potentially `ALTER TABLE clients ADD ...` for missing schema fields.
- Potentially `CREATE TABLE activities` / `CREATE TABLE notifications` if missing.

## Safe Migration Strategy
Purely ADDITIVE. No drops. Order: provider.slug → event_types → clients (if missing fields) → verify others.

## Provider Slug Backfill Strategy
- Add column nullable.
- Backfill with deterministic UUID-derived string: `UPDATE providers SET slug = 'provider-' || id::text;`
- Set NOT NULL after all rows filled.
- Create UNIQUE constraint/index.
- No production identity changed; slug is additive.

## EventType Strategy
- Create empty table with FK to providers (existing 2 providers provide valid parent IDs).
- Fixture creates eventType after provider; will work once table exists.
- No backfill needed because table was never used.

## Prisma Migration History Strategy (Option B — recommended)
- Do NOT recreate full baseline (risks losing extra DB columns and misaligning existing data).
- Create a reconciliation migration file containing ONLY ADD/CREATE statements.
- Apply with `prisma migrate deploy` (once DB matches after manual/reconciliation step) or apply SQL directly if Prisma can't deploy due to baseline gap.
- After application, `_prisma_migrations` gets entry; DB remains intact.

## Risks
- If `clients` or `activities`/`notifications` have hidden schema gaps not audited, fixture may still fail after slug/event_types fixed.
- `clients.name` DB NOT NULL vs Prisma optional — if fixture creates client with null name, will fail.
- No `event_types` backfill needed (empty table safe).
- Legacy `slot_minutes`/`reminder_offsets_minutes` may confuse future developers; recommend documentation, not removal.

## Verification Plan (for future execution only)
- After ADDITIONAL audit of clients, activities, notifications, apply reconciliation SQL.
- Run `npx vitest run src/test/e2e.lifecycle.test.ts --reporter=verbose`.
- Confirm `buildFixture()` completes.
- Confirm `beforeAll` completes; `afterAll` cleans fixture.
- Confirm database counts after cleanup match pre-test state.
- Confirm no `Failed to load url` error (already fixed).

## Rollback/Recovery Considerations
- All changes additive; rollback = DROP new column/index/table (if needed). Existing data untouched.
- If `slug` backfill wrong: can drop unique index, update values, recreate.
- If `event_types` created incorrectly: `DROP TABLE event_types` safe (no data, no FK from bookings because bookings FK is to slots, not event_types directly — check schema: Booking.eventTypeId is String?, no FK declared in Prisma; safe to drop if needed).

## Exact Commands That WOULD Be Used Later (NOT EXECUTED)
```sql
-- Provider slug (additive)
ALTER TABLE providers ADD COLUMN slug VARCHAR(255);
UPDATE providers SET slug = 'provider-' || id::text;
ALTER TABLE providers ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_providers_slug ON providers(slug);

-- EventType table (new)
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
```
Note: These commands are documented only. No execution occurred. No DB mutation. No commit.
