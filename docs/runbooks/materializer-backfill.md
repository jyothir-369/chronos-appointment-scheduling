# Materializer Backfill Runbook

**Last reviewed:** 2026-09-25
**Owner:** Chronos platform team

## Problem
Materializer hasn't generated slots for a provider (e.g., after downtime, rule change, or new provider).

## Recovery Procedure
1. Check horizon: `SELECT count(*) FROM slots WHERE provider_id=$1 AND slot_start_utc > now() - interval '45 days';`
   - If < 45 days of open slots → materializer horizon alert triggers (§399).
2. Trigger on-demand materialization: call `materializeProvider(db, providerId, fromDate, toDate)`.
3. Verify idempotency: re-running yields zero new rows (Phase 3 exit criteria).
4. If rules changed: `reconcile(provider)` — inserts missing slots, deletes **open** slots that no longer match, never touches booked ones.

## Prevention
- Job Scheduler (`upsertJobScheduler`, hourly top-up) maintains 60-day horizon.
- Materializer is fully idempotent.
- Rule-edit test and DST-day materialization test run in CI.

## Verification
Run: `pnpm test:unit` — materializer idempotence test, rule-edit test, DST-day materialization test against real DB.
