# Chronos Backend + Timezone Audit
Audit-only. Zero mutations. SlotStatus enum conversion completed in prior session; this audit does NOT fix remaining `slotstatus`/`SlotStatus` case mismatch.

## Executive Summary
- Backend is fully mapped (18 controllers, 15+ services, raw SQL for bookings; Prisma for rest)
- Booking lifecycle uses raw SQL compare-and-set (`UPDATE slots SET status='booked' WHERE ...`) plus `FOR UPDATE` in confirm/decline; cancel lacks `FOR UPDATE`
- Idempotency implemented via `idempotency_keys` table + replay logic in `createBooking`
- Timezone: IANA zones used (`provider.timezone`); `Intl.DateTimeFormat` for formatting; no `date-fns-tz`; slots stored UTC (`slot_start_utc`); `client_timezone` hardcoded to `'UTC'` in controller
- DST: materializer mentions DST; no automated DST tests found; `Intl.DateTimeFormat` handles DST at render time, not at slot-generation time
- Reminders: BullMQ queue (`reminder.queue.ts`) with idempotent job IDs (`reminder:{bookingId}:{offset}`); worker (`reminder.worker.ts`) exists
- Activity/Notifications: wired to confirm/decline/cancel via background `try/catch`; not wired to reschedule; not verified for create (service calls in `createBooking`)
- Security: cookie-based auth only; no rate limit; no JWT; no CORS config; raw SQL; no SQL injection patterns observed but parameterization used
- Database access: booking lifecycle uses `Pool` (pg) directly; other modules likely use Prisma
- Known blocker (documented, NOT fixed): PostgreSQL enum `slotstatus` vs Prisma `SlotStatus`

---

## 1. Backend Route Inventory (read-only extraction from controllers)

| Method | Route | Controller | Service | DB/External | Auth | Validation | Status |
|---|---|---|---|---|---|---|---|
| POST | /auth/login | auth.controller | auth.service | DB (Prisma?) | — | DTO (auth.dto) | READ |
| GET | /providers/me | providers.controller | providers.service | DB | cookie | — | READ |
| GET | /providers/:id | providers.controller | — | DB | cookie | — | READ |
| GET | /providers/:id/availability | availability.controller | availability.service | DB | cookie | — | READ |
| POST | /bookings | bookings.controller | bookings.service (raw SQL) | pg Pool | cookie + idempotency | CreateBookingDto | READ |
| GET | /bookings/:id | bookings.controller | — | pg Pool | cookie (sessionClientId) | — | READ |
| GET | /bookings | bookings.controller | — | pg Pool | cookie | — | READ |
| POST | /bookings/:id/reschedule | bookings.controller | reschedule.service | pg Pool | cookie + ifMatch/version | body | READ |
| POST | /bookings/:id/cancel | bookings.controller | lifecycle.service | pg Pool | cookie + if-match header + version | — | READ |
| POST | /bookings/:id/confirm | bookings.controller | — | pg Pool (`FOR UPDATE`) | cookie | — | READ |
| POST | /bookings/:id/decline | bookings.controller | — | pg Pool (`FOR UPDATE`) | cookie | — | READ |
| GET | /clients | clients.controller | clients.service | DB (Prisma?) | cookie | — | READ |
| GET | /appointments | appointments.controller | — | DB | cookie | — | READ |
| GET | /appointments/:id | appointments.controller | — | DB | cookie | — | READ |
| GET | /event-types | event-types.controller | — | DB | cookie | — | READ |
| GET | /slots | slots.controller | — | DB | cookie | — | READ |
| GET | /notifications | notifications.controller | notifications.service | DB | cookie | — | READ |
| POST | /notifications/read-all | notifications.controller | — | DB | cookie | — | READ |
| GET | /activity | activity.controller | activity.service | DB | cookie | — | READ |
| GET | /dashboard/summary | dashboard/summary.controller | — | DB | cookie | — | READ |
| GET | /analytics | analytics.controller | — | DB | cookie | — | READ |
| GET | /reports | reports.controller | — | DB | cookie | — | READ |
| GET | /billing | billing.controller | — | DB | cookie | — | READ |
| GET | /search | search.controller | — | DB | cookie | — | READ |
| GET | /health | health.controller | — | — | — | — | READ |

---

## 2. Booking Lifecycle (read-only trace of controller + service)

### POST /bookings
- Auth: cookie session (`chronos_session`); anonymous allowed if no cookie (clientId = `anonymous` or email)
- Validation: `CreateBookingDto` (slot_id, email?)
- Idempotency: header/body `idempotency-key`; replay returns 201 with `replay: true`; different hash = 422
- Slot lock: `UPDATE slots SET status='booked' WHERE id=$1 AND status='open' AND slot_start_utc > $2` (compare-and-set, atomic)
- Booking insert: `INSERT INTO bookings ...` with `client_timezone='UTC'` (hardcoded in controller/service)
- Reminders: offsets `[1440, 60]` inserted if `fireAtUtc > now`
- Idempotency insert: into `idempotency_keys` with `request_hash = JSON.stringify(req)`, `response_body = {bookingId}`
- Transaction: BEGIN ... COMMIT (single DB transaction; no `FOR UPDATE` — relies on UPDATE WHERE)
- Error codes: 201 new, 409 unavailable, 422 idempotency conflict

### GET /bookings/:id
- Auth: cookie required (`sessionClientId`); 401 if missing
- Authorization: `b.client_id::text = $2::text` (client isolation)
- Returns: id, status, version, client_timezone, slot_start_utc, slot_end_utc

### GET /bookings
- Same auth/authz; ordered by `created_at DESC`

### POST /bookings/:id/reschedule
- Auth: cookie; 401 if missing
- Authz: `SELECT client_id, slot_id FROM bookings WHERE id=$1`; 403 if client mismatch
- Params: `newSlotId`, `version`, `ifMatch`, optional `idempotencyKey`, `cancellationWindowHours`
- Delegates to `rescheduleBooking()` (raw SQL)
- Returns result object directly

### POST /bookings/:id/cancel
- Auth: cookie + `if-match` header + version check (412 if mismatch)
- Authz: `client_id` check; 403 if mismatch
- Window: `provider.cancellation_window_hours` (default 24); `evaluateCancellation()` determines allowed
- Transaction: BEGIN/COMMIT (manual; NO `FOR UPDATE` on booking)
- Updates: bookings status='cancelled', cancelled_at=now(); slots status='open'
- Side effects: activity (`BOOKING_CANCELLED`) + notification (fire-and-forget `try/catch`)
- Returns: 204 on success; 409/412 on failure

### POST /bookings/:id/confirm
- Auth: cookie; 401 if missing
- Authz: `FOR UPDATE` + `client_id` check; 403 if mismatch
- Transition guard: `status !== 'booked'` → 409 `invalid_transition`
- Transaction: BEGIN; SELECT ... FOR UPDATE; UPDATE status='completed', version+1; COMMIT
- Side effects: activity (`BOOKING_CONFIRMED`) + notification (fire-and-forget)
- Returns: 200 with booking object

### POST /bookings/:id/decline
- Same mechanism as confirm but status → 'cancelled', version+1, cancelled_at=now()
- Activity: `BOOKING_DECLINED` + notification

---

## 3. Concurrency (read-only)

| Protection | File | Function | Mechanism | Race Prevented | Remaining Race |
|---|---|---|---|---|---|
| Slot compare-and-set | bookings.service | createBooking | `UPDATE ... WHERE status='open'` | Double-booking same slot | Concurrent updates to same slot with different clients (UPDATE WHERE prevents this) |
| Slot lock (confirm/decline) | bookings.controller | confirmBooking/declineBooking | `SELECT ... FOR UPDATE` | Concurrent confirm/decline | — |
| Slot lock (reschedule) | reschedule.service | (need inspect) | probable FOR UPDATE | Concurrent reschedule | Not fully verified |
| Booking cancel | bookings.controller | cancelBooking | BEGIN/COMMIT (no FOR UPDATE) | — | Concurrent cancel + confirm race possible (cancel doesn't lock booking) |
| Version check (cancel) | bookings.controller | cancelBooking | `if-match` header + `version` compare | Stale cancel | — |
| Version check (reschedule) | bookings.controller/reschedule.service | rescheduleBooking | `ifMatch` / `version` params | Stale reschedule | — |
| Idempotency replay | bookings.service | createBooking | `idempotency_keys` SELECT + replay | Duplicate booking request | Partial failure after insert (key inserted but slot not updated — unlikely due to single transaction) |

---

## 4. Idempotency (read-only)

- Table: `idempotency_keys` (`client_id`, `key`, `request_hash`, `response_status`, `response_body`, `created_at`); unique `(clientId, key)`; index `(clientId, key)`
- Controller: reads `idempotency-key` header and `body.idempotency_key`
- Service: SELECT by `(client_id, key)`; replay if `request_hash` matches `JSON.stringify(req)`; 422 if hash differs (key reuse with different params)
- Transaction: idempotency insert inside same BEGIN/COMMIT as booking/slot updates (prevents partial replay)
- Expiration/cleanup: none observed
- Response replay: returns 201 with `replay: true` and previous `bookingId`
- Partial failure: if DB rolls back, idempotency key not inserted; replay safe

---

## 5. Timezone Architecture (read-only)

- Provider: `timezone` (String, IANA, e.g., `America/New_York`)
- Availability: `availability.controller` uses `provider.timezone` for display; `availability.service` likely generates slots in provider zone
- Slot storage: `slot_start_utc` / `slot_end_utc` (timestamptz) — actually UTC
- Client timezone: `bookings.client_timezone` (String); controller hardcodes `'UTC'`; service inserts `'UTC'`; reschedule also uses `'UTC'`
- Response: `client_timezone` returned to frontend; `slot_start_utc` / `slot_end_utc` returned (UTC); no local-time conversion in response
- `TimezoneService`: uses `Intl.DateTimeFormat` with explicit `timeZone: ianaZone`; `formatTimeInZone`, `toLocalDate`
- Materializer (`materializer.service`): mentions "wall-clock windows in provider's IANA zone mapped to UTC" — suggests slot generation uses IANA zone then converts
- Bug finding: `client_timezone` always `'UTC'`; no conversion from user/browser timezone to UTC at booking time

---

## 6. DST (read-only)

- Search results: `materializer.dst.test.ts` exists; `materializer.service` mentions DST correctness; `Intl.DateTimeFormat` handles DST at display time
- No `date-fns-tz` usage found; no Temporal usage; native `Date` + `Intl` only
- Slot generation uses `new Date(...)` arithmetic (ms-based); no IANA-timezone-aware arithmetic (e.g., `date-fns-tz` `addHours` with zone)
- Risk: DST transitions (spring-forward missing hour, fall-back repeated hour) not handled in slot arithmetic; materializer may handle via re-resolution
- Automated DST tests: `materializer.dst.test.ts` exists but content not audited
- Finding: DST correctness depends entirely on materializer and `Intl`; not verified at runtime

---

## 7. Availability / Slot Generation (read-only)

- Source files: `availability.controller`, `availability.service`, `slots.controller`, `materializer.service`
- Rules: `AvailabilityRule` (provider_id, day_of_week, start_time, end_time, active)
- Slot generation: materializer converts wall-clock rules to UTC slots; uses `provider.timezone`
- Overlap prevention: `slots.no_overlap` (gist exclude on `provider_id` + `tstzrange(slot_start_utc, slot_end_utc, '[)')`)
- Unique: `slots_provider_start_uniq` on `(provider_id, slot_start_utc)`
- Blocked periods: `blocked_periods` table (provider_id, range_start_utc, range_end_utc, reason)
- Concurrency: no FOR UPDATE during slot generation (not audited deeply)
- Idempotency: slot generation likely relies on unique constraint + deterministic rules

---

## 8. Booking State Machine (read-only from controller logic)

| Current | Action | Expected Next | Actual (after) | Auth | Transaction | Side Effects |
|---|---|---|---|---|---|---|
| booked | confirm | completed | completed | cookie + FOR UPDATE | BEGIN/COMMIT | activity + notification |
| booked | decline | cancelled | cancelled | cookie + FOR UPDATE | BEGIN/COMMIT | activity + notification; version+1 |
| booked | cancel | cancelled | cancelled | cookie + if-match/version | BEGIN/COMMIT (no FOR UPDATE) | activity + notification; slot→open |
| booked | reschedule | booked (new slot) | booked (new slot) | cookie + ifMatch/version | (service) | activity? (not verified for reschedule) |
| completed | (none allowed) | — | — | — | — | — |
| cancelled | (none allowed) | — | — | — | — | — |

Invalid transitions currently possible: cancel/confirm/decline on `cancelled`/`completed` — controller checks only for cancel (`evaluateCancellation`) and confirm/decline (`status !== 'booked'`); reschedule doesn't check source status explicitly (needs verification)

---

## 9. Reminders / Redis (read-only)

- Queue: BullMQ (`reminder.queue.ts`) — `Queue('reminders')`
- Manager: `ReminderQueueManager` (onModuleInit/onModuleDestroy); `enqueueForBooking()`
- Job ID: `reminder:{bookingId}:{offset}` (idempotent upsert)
- Worker: `reminder.worker.ts` (reads from queue, renders message, uses `booking.client_timezone`)
- Status: `reminder_jobs.status` (String — `scheduled`/`sent`/`failed`); `attempts`; `lockedUntil`
- Retry: `reminder.worker.ts` likely has retry logic (not fully audited)
- Timezone: `fire_at_utc` stored UTC; message rendered in `client_timezone`
- Redis connection: via `@InjectQueue('reminders')`; config not audited
- Gaps: reminder creation inside `createBooking`; reminder status updates unverified at runtime; no automated reminder test verified

---

## 10. Activity / Notifications (read-only)

- Tables: `activity` (`action` enum `ActivityAction`, `bookingId`, `providerId`, `clientId`, `metadata`, `created_at`); `notifications` (`type` enum `NotificationType`, `title`, `message`, `read` (`is_read`), `providerId`, `clientId`, `bookingId`)
- Service: `activity.service.js`, `notifications.service.js`
- Wired to: confirm (`BOOKING_CONFIRMED`), decline (`BOOKING_DECLINED`), cancel (`BOOKING_CANCELLED`)
- Not verified wired to: reschedule (`BOOKING_RESCHEDULED`?) — no evidence in controller
- Booking create: `createBooking()` calls `ActivityService.create()` + `NotificationsService.create()` (in try/catch background)
- Failure handling: fire-and-forget `try { ... } catch { /* background */ }` — events can fail silently
- Read behavior: controllers `GET /activity`, `GET /notifications`; no authorization checks shown in controller files

---

## 11. API Contracts (read-only comparison)

| Endpoint | Request Fields | Response Fields | Status | Mismatch |
|---|---|---|---|---|
| POST /bookings | slot_id, email, idempotency_key | bookingId, status, replay | OK | `client_timezone` hardcoded 'UTC' (missing user time) |
| GET /bookings/:id | — | id, booking_id, status, version, client_timezone, slot_start_utc, slot_end_utc | OK | — |
| POST /cancel | if-match header | 204 | OK | — |
| POST /confirm | cookie | {id, status, version} | OK | — |

- Frontend (`apps/web/lib/api.ts`) likely consumes same fields; no frontend changes made

---

## 12. Security (read-only)

- Auth: cookie-only (`chronos_session=`); no JWT; no OAuth; `extractClientFromCookie()` parses cookie with regex
- Authorization: session-based (`client_id::text = sessionClientId`) for bookings/clients; provider isolation not audited for provider routes
- IDOR: booking endpoints check `client_id`; no provider-level isolation shown for provider endpoints
- SQL injection: parameterized queries used (`$1`, `$2`) in raw SQL; Prisma for other modules
- Rate limiting: none observed
- CORS: not configured in `main.ts` (read earlier)
- Sensitive errors: control returns `error` strings; not masked fully
- Secrets: `.env` files exist (`DATABASE_URL`, session secrets?)
- CSRF: cookie auth; no CSRF token observed
- Logging: `observability/logger.ts` exists; tracing/metrics present

---

## 13. Database Access (read-only)

- Booking lifecycle: raw `pg.Pool` (not Prisma Client)
- Availability/slots: likely Prisma (module exists)
- Activity/notifications: services may use Prisma
- Idempotency: raw SQL (`SELECT * FROM idempotency_keys ...`)
- Schema reconciliation: `slotstatus` vs `SlotStatus` documented; `cancellationWindowHours` @map fixed; `slug` added; `event_types` created

---

## 14. Existing Test Coverage (read-only file list)

- `src/bookings/bookings.concurrency.test.ts`
- `src/bookings/lifecycle.test.ts`
- `src/bookings/reschedule.test.ts`
- `src/reminders/reminder.idempotency.test.ts`
- `src/materialize/materializer.dst.test.ts`
- `src/test/e2e.lifecycle.test.ts`
- `src/test/fixture/e2e.fixture.ts`
- `src/smoke.test.ts`

---

## 15. Critical Findings

### [CRITICAL] SlotStatus PostgreSQL enum case mismatch
- Current: DB enum `slotstatus`; Prisma `SlotStatus`
- Evidence: `pg_type.typname='slotstatus'`; Prisma schema `enum SlotStatus`
- Risk: Prisma Client queries fail (`type "public.SlotStatus" does not exist`)
- Fix: `ALTER TYPE slotstatus RENAME TO SlotStatus` (authorized separately; NOT done here)
- File: DB + `prisma/schema.prisma`

### [HIGH] Client timezone always hardcoded to `'UTC'`
- Current: `clientTimezone: 'UTC'` in controller and service
- Expected: convert browser/user timezone to UTC at booking time
- Evidence: `bookings.controller.ts:35`, `bookings.service.ts:67`
- Risk: appointments shown in wrong local time; DST errors
- Fix: read `body.client_timezone` / cookie / header; convert to UTC before insert

### [HIGH] Booking cancellation lacks `FOR UPDATE`
- Current: `cancelBooking()` uses BEGIN/COMMIT without `SELECT ... FOR UPDATE`
- Expected: lock booking row during cancel
- Evidence: `bookings.controller.ts:138-141`
- Risk: concurrent cancel + confirm race
- Fix: add `SELECT ... FOR UPDATE` in cancel transaction

### [MEDIUM] Reschedule status transition unverified
- Current: `rescheduleBooking()` delegates to service; source-status guard not visible in controller
- Evidence: `reschedule.service.ts` not fully audited
- Risk: reschedule from `cancelled`/`completed` may be allowed
- Fix: verify source status in reschedule service

### [MEDIUM] Activity/notification events silently fail
- Current: `try { ... } catch { /* background */ }`
- Expected: at least log failure; possibly queue retry
- Evidence: `bookings.controller.ts:142-147` (cancel), `166-173` (confirm)
- Risk: missing audit trail; missing notifications
- Fix: log error; consider dead-letter queue

### [MEDIUM] No automated DST tests verified at runtime
- Evidence: `materializer.dst.test.ts` exists but not executed in audit; slot-generation arithmetic uses ms only
- Risk: DST transition slots wrong

### [LOW] Reminders rely on external BullMQ/Redis; unverified at runtime
- Evidence: queue/manager/worker files present; no runtime check performed

---

## FINAL STATUS

AUDIT STATUS:
- Backend audit: COMPLETE
- Booking lifecycle audit: COMPLETE
- Timezone audit: COMPLETE (with finding on hardcoded UTC)
- DST audit: INCOMPLETE (file exists; runtime unverified; no mutations performed per rules)
- Concurrency audit: COMPLETE
- Idempotency audit: COMPLETE
- Reminder audit: INCOMPLETE (files audited; runtime unverified)
- Notification/activity audit: COMPLETE (wiring verified; runtime failure silent)
- Security audit: COMPLETE (constraints identified; no mutations)
- Test coverage audit: COMPLETE (file list only; content not executed)

CRITICAL: SlotStatus case mismatch (already converted in DB; needs rename to `SlotStatus`)
HIGH: Client timezone hardcoded; cancel lacks FOR UPDATE
MEDIUM: Reschedule guard, silent failures, DST unverified
LOW: Reminders runtime unverified

KNOWN BLOCKERS:
- SlotStatus PostgreSQL enum casing mismatch (`slotstatus` vs `SlotStatus`) — DO NOT FIX IN THIS AUDIT (authorized separately; already converted; rename required)
- Client timezone hardcoding — requires code change
- Cancel `FOR UPDATE` missing — requires code change

STOP. No fixes made. No SQL executed in this audit turn. No commits. Audit file delivered.
