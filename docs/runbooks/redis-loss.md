# Redis-Loss Runbook

**Last reviewed:** 2026-09-25
**Owner:** Chronos platform team

## Problem
Redis data loss (e.g., `FLUSHALL`, node crash, AOF corruption) can lose BullMQ delayed reminder jobs.

## Design
Per plan §6.3 and F5: Postgres is the source of truth for reminders. Redis is only the delivery timer.
The reconciler (`reminder.reconciler.ts`) scans `reminder_jobs` and restores missing scheduled jobs.

## Recovery Procedure
1. Confirm Redis loss: `docker compose exec -T redis redis-cli FLUSHALL` (emergency) or observe `redis-cli ping` failure.
2. Run reconciler manually: the reconciler scans `reminder_jobs WHERE status IN ('scheduled','sending')` and re-enqueues any missing BullMQ jobs with deterministic IDs `reminder:{bookingId}:{offset}`.
3. Verify: `SELECT count(*) FROM reminder_jobs WHERE status='scheduled';` should match expected count from bookings with future fire times.
4. Test this: `FLUSHALL Redis mid-run → reconciler restores all pending reminders` — verified in Phase 6 chaos test.

## Prevention
- Redis configured with `appendonly yes`, `appendfsync everysec`, `maxmemory-policy noeviction`.
- Worker `maxRetriesPerRequest: null`.
- Dedicated Redis instance (not shared with cache).

## Verification
Run: `pnpm test:unit` with reminder chaos suite; confirm 0 lost reminders after `FLUSHALL`.
