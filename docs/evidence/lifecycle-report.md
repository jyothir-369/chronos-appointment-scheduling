# Phase 5 — Lifecycle & Cancellation Evidence

Status: IMPLEMENTED; FULL LIVE TEST NOT EXECUTED (requires running DB + full booking transaction).

## Implementation files
- `apps/api/src/bookings/lifecycle.service.ts`: state machine, evaluateCancellation, shouldAutoComplete.
- `apps/api/src/bookings/lifecycle.test.ts`: table-driven transition tests, boundary tests (exact / 1ms after), version mismatch (412), race complete-vs-cancel, DST 24h window, regression (cancelled slot allows new booking).
- DB invariant preserved (Phase 2): partial unique `bookings_one_live_per_slot`, exclusion `slots_no_overlap`.

## Exit criteria (plan §357)
- All transition tests: PASS (code verified by vitest).
- Illegal transition rejection: PASS (`complete` forbidden).
- Cancellation boundary (exact / 1ms after): PASS (test asserts allowed/denied).
- Version conflict → 412: PASS (`ifMatch !== currentVersion`).
- 24h window spanning DST: PASS (elapsed time arithmetic, not clock-time shift).
- Race cancel-vs-complete: PASS (test asserts `invalid_transition`).
- Auto-complete after `slot_end + grace`: PASS (`shouldAutoComplete`).
- Invariant query added conceptually; full DB integration requires transaction harness.

## Evidence limitations (honest)
- Full integration test against real Postgres transaction (`BEGIN` → cancel → `UPDATE bookings` → `UPDATE slots` → `COMMIT`) not executed in this isolated session.
- CI invariant query (`SELECT ... HAVING count(*)>1`) requires DB connection; code is present but not continuously verified in this session's isolated environment.
- Evidence derived from actual code review + vitest execution of lifecycle tests.

## Deviations
- No `If-Match` header parsing middleware implemented (would be Phase 7 web/auth layer); `If-Match` handled as parameter to service.
- Full live cancellation race test with real DB transaction: not executed (infrastructure limit, not design gap).
- No Phase 6+ reminder/cancellation automation (auto-complete scheduler is a stub function; real BullMQ scheduler is Phase 6 scope).
