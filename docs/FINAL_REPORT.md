## 1. Booking Integration

| Operation | Activity Call | Notification Call | Success-Only | Duplicate-Safe | Status |
|---|---|---|---|---|---|
| Create | BOOKING_CREATED (post-commit, service-layer) | BOOKING_CREATED (post-commit) | Yes (only after commit/replay excluded) | Yes (replay skips) | INTEGRATED |
| Confirm | BOOKING_CONFIRMED (post-commit) | BOOKING_CONFIRMED (post-commit) | Yes (after FOR UPDATE + update) | Yes (state-based; only if confirmed) | INTEGRATED |
| Decline | BOOKING_DECLINED (post-commit) | BOOKING_DECLINED (post-commit) | Yes | Yes | INTEGRATED |
| Cancel | BOOKING_CANCELLED (post-commit) | BOOKING_CANCELLED (post-commit) | Yes | Yes | INTEGRATED |
| Reschedule | BOOKING_RESCHEDULED (post-commit, reschedule.service) | BOOKING_RESCHEDULED (post-commit) | Yes | Yes (new booking derived; no replay event duplication) | INTEGRATED |

## 2. Transaction Safety
- Booking mutations use their existing pg Pool BEGIN/COMMIT (controller-level for cancel/confirm/decline; service-level for create/reschedule).
- Activity/Notification writes occur AFTER COMMIT via standalone ActivityService/NotificationsService (separate Prisma clients), so booking mutation remains authoritative.
- Event failure is caught and ignored; it never rolls back the booking transaction.
- No invented cross-transaction architecture; smallest safe compatible approach used.

## 3. Idempotency
- Replay (status 201 with replay=true) is handled by the existing idempotency mechanism before the event emission path; replay path skips duplicate event creation.
- Events are derived from the final committed state (post-transaction), so idempotent retries don't re-emit.

## 4. Authorization
- Notifications use the same sessionClientId from cookie authorization as the booking endpoint.
- Provider scoping uses the provider from the booking/slot query (not broad access).
- Client/Provider associations preserved via existing schema relations.

## 5. Tests
- Added: none (no safe test fixtures for runtime E2E; DB empty = 0 bookings; no fake production data inserted).
- Modified: bookings.service.ts, reschedule.service.ts, bookings.controller.ts.
- Executed: `pnpm --filter @chronos/api build` (passed); `pnpm --filter chronos-web build` (passed); concurrency test not run via vitest filter (file present but vitest didn't match path; no destructive DB changes made to enable it).
- Runtime lifecycle verification: UNVERIFIED (DB=0; no legitimate fixtures available).

## 6. Builds
- API build: PASS
- Web build: PASS

## 7. Files Changed
- apps/api/src/bookings/bookings.service.ts
- apps/api/src/bookings/reschedule.service.ts
- apps/api/src/bookings/bookings.controller.ts

## 8. Remaining Gaps
- Full runtime E2E with legitimate booking fixtures (DB=0, no safe fixtures used, no fake data inserted)
- Timezone/DST end-to-end verification (no bookings to verify)
- Reminder worker/delivery verification (external provider unconfigured; Redis intact)
- Frontend notification/activity surface verification (frontend consumes APIs; real data flows through when bookings exist, but no runtime verification performed)

## 9. Verdict
NOT PRODUCTION READY — runtime E2E/timezone/reminder verification remains. Builds pass; lifecycle integration implemented at service/controller layer; transactions preserved; idempotency protected; authorization preserved. No database changes; no destructive operations; no fake production data added.
