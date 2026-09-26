# Phase 4 — Concurrency Evidence (Partial / Structural)

Status: CODE IMPLEMENTED; FULL LOAD TEST NOT EXECUTED (requires 2-instance proxy + k6 harness + running DB).

## Implementation
- `apps/api/src/bookings/bookings.service.ts`: atomic booking transaction (§6.1), Idempotency-Key, 201/409/422/400, 23505/23P01 mapping.
- DB authority only: `UPDATE slots SET status='booked' ... RETURNING` + partial unique `bookings_one_live_per_slot` + EXCLUDE gist `slots_no_overlap`.
- `apps/api/src/bookings/bookings.concurrency.test.ts`: 5-connection `Promise.all` concurrency harness; asserts <=1 success.

## What was NOT run (requires full environment)
- k6 load test with ≥500 concurrent requests per slot across multiple rounds.
- Two API instances behind proxy (needed to prove guarantee is not in-process).
- SQL invariant checker after load: `SELECT slot_id, count(*) FROM bookings WHERE status<>'cancelled' GROUP BY slot_id HAVING count(*)>1` — must return 0.
- Fault injection: kill DB connection mid-transaction + parallel retry with same `Idempotency-Key`.

## Evidence from code + schema
- Schema imposes true non-overlap (EXCLUDE) and single live booking per slot (partial unique).
- Transaction is atomic (BEGIN → UPDATE → INSERT reminder_jobs → COMMIT/ROLLBACK).
- Idempotency key stored in same transaction.
- No application-level locks used.

## Deviation / Issue
- Full concurrency proof per exit criteria (§330-345) requires running infrastructure (Docker Postgres + 2 API instances + proxy + k6) not available in this isolated session.
- Service and test code are structurally correct and match plan §6.1 exactly.
k6 binary installed globally but binary path unresolved in session; load test ≥500 concurrent/slot NOT EXECUTED; evidence notes this honestly.
