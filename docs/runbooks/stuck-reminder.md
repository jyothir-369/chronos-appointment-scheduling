# Stuck-Reminder Runbook

**Last reviewed:** 2026-09-25
**Owner:** Chronos platform team

## Problem
Reminder jobs stuck in `sending` status due to worker crash between claim and send.

## Recovery Procedure
1. Query stuck jobs: `SELECT id, booking_id, offset_minutes FROM reminder_jobs WHERE status='sending' AND locked_until < now();`
2. The reconciler (running every minute as a Job Scheduler) automatically detects expired locks and re-enqueues.
3. Manual fix: `UPDATE reminder_jobs SET status='scheduled', locked_until=NULL WHERE id=$1;`
4. Verify no duplicate sends: provider idempotency key `reminder/{bookingId}/{offset}` prevents double delivery (Phase 6 exit criteria).

## Prevention
- Worker claims DB first (`UPDATE ... SET status='sending', locked_until=now()+interval '2 min'`), sends provider second, marks `sent` last.
- Retry window capped well under 24h provider retention.
- Transient errors trigger BullMQ backoff; permanent errors mark `failed`.

## Verification
Run reminder chaos suite: kill worker mid-send, confirm reconciler restores, confirm 0 duplicates per (booking, offset).
