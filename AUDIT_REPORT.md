# Chronos End-to-End Audit — 2026-09-30

## 1. Project Understanding
- Name: Chronos — Timezone-Safe Appointment Scheduling Platform
- Stack: NestJS API (`apps/api`), Next.js web (`apps/web`), Prisma/Postgres (`prisma/`), Redis (`docker-compose.yml`), TypeScript, pnpm workspace (`packages/` for contracts, time, db, types, config, ui)
- Purpose: Appointment scheduling with timezone-safe slots, concurrency control, lifecycle management (book/cancel/reschedule), reminders, materialization
- Auth: None functional (`NO_REAL_AUTH=true` in `.env`)
- Key patterns: DB-level compare-and-set for concurrency, version-based cancellation, idempotency keys (service-level SQL, missing from Prisma schema)

## 2. Confirmed Critical Issues (Evidence-Based)

### [CRITICAL] Authentication disabled / missing
- `.env:4`: `NO_REAL_AUTH=true`
- `.env.example:4`: same value (should be placeholder)
- `apps/api/src/auth/security.ts`: only exports `ThrottlerModule`; no JWT/Passport/session/auth guard
- `apps/api/src/bookings/bookings.controller.ts`: `POST /bookings` has zero auth; anyone can create bookings
- `prisma/schema.prisma`: no `User`/`Role`/`Session` model
- Impact: Full unauthenticated write access to core business data

### [CRITICAL] Hard-coded DB credentials in source
- `.env:2`: `DATABASE_URL=postgresql://chronos:chronos@localhost:5433/chronos`
- `.env.example:2`: identical real-style value
- `docker-compose.yml:7-9`: `POSTGRES_USER: chronos`, `POSTGRES_PASSWORD: chronos`
- `apps/api/src/bookings/bookings.module.ts:8`: fallback `postgresql://chronos:chronos@localhost:5433/chronos`
- `docs/audit/phase5-status.md`: incorrectly claims "No production credentials committed"
- Impact: Credentials exposed in git; anyone with repo can access DB; host-exposed DB (`5433`) allows external connection

### [CRITICAL] Redis unauthenticated on exposed host port
- `docker-compose.yml:15-22`: command writes `appendonly yes`/`appendfsync everysec`/`maxmemory-policy noeviction`; no `requirepass`, no TLS; port `6380` mapped to host
- Impact: Network-accessible Redis allows cache/queue manipulation

### [CRITICAL] Admin controller is unimplemented template (`$NAME`)
- `apps/api/src/admin/admin.controller.ts`: `@Controller('$NAME')`; `this.prisma.$NAME.findMany()`
- Impact: Broken endpoint; if completed without authorization, exposes full admin data access

## 3. Confirmed High-Priority Issues

### [HIGH] Frontend does not call backend APIs for booking
- `apps/web/src/app/book/[provider]/page.tsx`: hard-coded time buttons (`09:00 AM` etc.) with no `apiFetch` call
- `apps/web/src/lib/api.ts`: defines `apiFetch` but not used in booking flow
- `apps/web/src/app/page.tsx.bak`, `chronos_appointment_scheduling_ui.html`: leftover artifacts
- Impact: Application is not end-to-end functional; users cannot actually submit bookings

### [HIGH] Smoke test is meaningless; missing integration tests
- `apps/api/src/smoke.test.ts`: `expect(true).toBe(true)`
- `apps/api/src/bookings/bookings.concurrency.test.ts`: only concurrency logic tested; no endpoint tests
- No auth failure tests, no reschedule/cancel integration tests
- Impact: No regression protection for API changes

### [HIGH] No input validation / missing DTO validation
- `bookings.controller.ts`: accepts raw body with TypeScript type annotation only (no `class-validator`, no `ValidationPipe`)
- No email format check, no length limits, no sanitization of `notes`/`client_name`
- Impact: Invalid data insertion; potential spam/book flooding

### [HIGH] Controller ignores booking version / idempotency
- `prisma/schema.prisma`: `Booking` has `version Int @default(0)`; controller does `tx.slot.update({ status: 'booked' })` but does not increment `version` or use `idempotencyKey`
- Service layer (`bookings.service.ts`) uses `version` and idempotency table correctly, but controller does not delegate to it
- Impact: Concurrent bookings could diverge version state; idempotency not enforced at endpoint

## 4. Security Audit Results (Verified)

| Risk | Confirmed? | Evidence / Attack Path |
|---|---|---|
| Unauthenticated mutation | Yes | `NO_REAL_AUTH` + no auth guards; send `POST /bookings` to create |
| Hard DB/Redis creds | Yes | `.env`, `.env.example`, `docker-compose.yml`, module fallback |
| SQL Injection | Unlikely | Parameterized queries (`$1`) and Prisma used; no raw concatenation |
| XSS (frontend) | Unverified | JSX safe; but `notes`/`client_name` returned by API could render raw if not escaped |
| CSRF | Partial | `credentials: "include"` present; no CSRF tokens / `SameSite` settings |
| Rate limiting | Partial | `RateLimitModule` exists (`ttl: 60000`, `limit: 30`) but need verify `AppModule` import |
| CORS | Unverified | Not inspected fully; if open to all origins, increases CSRF/auth risk |

## 5. Database Audit (Schema: `prisma/schema.prisma`)

- Relationships correct: Provider → Slot → Booking → Client; AvailabilityRule; EventType; ReminderJob
- Constraints: `Slot @@unique([providerId, slotStartUtc])`; `Booking @unique slotId`; `ReminderJob @@unique([bookingId, offsetType])`
- Indexes: `providerId`, `status`, `email`, etc.
- Migration files exist (`prisma/migrations/`); need verify migration matches schema exactly
- Missing: `User`/`Auth` model; `deletedAt`/soft-delete; `idempotency_keys` table referenced in service SQL but **not in schema** — must be added manually or via new migration
- `Booking.version` exists but not used by controller
- `ReminderJob.offsetType` is enum (`"24h"`/`"1h"`) but service uses minute offsets (`1440`, `60`); mapping must be verified
- Cascade: `Slot` `onDelete: Cascade` for `Booking`; deleting slot removes booking (dangerous — no audit trail)

## 6. Dependency / Config Audit

- Root: `node 26.0.0` / `pnpm 12.6.0` — very new / unverified against stable releases
- API: `nestjs/common`, `@prisma/client`, `@nestjs/throttler`, `express-rate-limit` (duplicate/replaced)
- Web: `next 16.3.0`, `tailwindcss 4.3.3`, `date-fns-tz` — very new
- Lock: `pnpm-lock.yaml` exists; `pnpm audit` results not verified
- `.gitignore` excludes `.env` correctly; `.env.example` incorrectly contains real-style values
- `docker-compose.yml`: no API/web service; only DB (`postgres:16-alpine`) and Redis (`redis:7-alpine`)

## 7. Architecture Summary

Strengths:
- Good concurrency proof (DB compare-and-set, version-based cancellation, idempotency keys in service)
- Clear module separation (auth, bookings, lifecycle, reschedule, availability, slots, materialize, reminders)
- TypeScript strict types; Prisma ORM; parameterized SQL

Weaknesses:
- Auth layer missing entirely (foundation unfinished)
- Controller does not use service layer (reimplements simpler, incorrect transaction)
- Web UI is mock / not integrated
- Template code (`admin.controller`) deployed/included
- Missing tests for endpoints and auth
- Missing schema model (`idempotency_keys`)
- No production secrets/config separation

## 8. Performance / Scalability Risks

- `materializer.service.ts`: creates one representative slot per provider; real rolling-60-day logic is in docs but not fully implemented
- Availability queries likely query `AvailabilityRule` + `Slot` without pagination; if volume grows, needs pagination/indexing verification
- Reminder worker/quene (`reminders/`) uses `reminder.queue.ts` / `reminder.worker.ts`; need verify queue processing rate and dead-letter handling
- No caching layer configured (Redis exists but no `CacheModule` observed)

## 9. DevOps / Deployment Risks

- No `.github/workflows/` or CI file observed; no automated build/test/deploy pipeline
- `docker-compose.yml` only has DB/Redis; no API/web container definition; must run manually (`pnpm dev`)
- No rollback script or versioned deployment strategy observed
- Health endpoint (`health.controller`) likely basic; no `HEALTHCHECK` in compose for app
- Monitoring (`observability/logger.ts`, `metrics.ts`, `tracing.ts`) exists but content not fully verified
- `docs/ARCHITECTURE.md` and `docs/DATABASE.md` present but `docs/audit/phase5-status.md` contains false claims about security/auth/credentials

## 10. Recommended Remediation Sequence

Immediate:
1. Rotate DB password; fix `.env`/`.env.example` with placeholders
2. Lock down Docker ports (bind `127.0.0.1`); add Redis `requirepass`
3. Remove/fix `NO_REAL_AUTH`; implement JWT/session or explicitly document disabled auth with network isolation
4. Fix/remove `admin.controller.ts` template
5. Add `class-validator` DTOs and `ValidationPipe` globally

Short-term:
6. Make `bookings.controller` delegate to `createBooking` service; ensure `version`/idempotency handled
7. Add `idempotency_keys` to Prisma schema/migration
8. Add API integration tests (all mutation endpoints)
9. Connect web `book` page to `GET /slots` + `POST /bookings`

Medium-term:
10. Complete auth layer (`User` model, JWT/session, role guards)
11. Implement admin endpoints with authorization
12. Add soft-delete (`deletedAt`) to Booking; avoid slot cascade deletion
13. Add CI pipeline (build/test/lint/audit) and deploy pipeline with rollback

Long-term:
14. Complete web flows (reschedule, cancel, notifications, calendar)
15. Add monitoring/alerting; verify `RateLimitModule` import in `AppModule`
16. Stabilize dependency versions; run `pnpm audit`
17. Security hardening: CSP, HSTS, secure cookies, CORS whitelist, CSRF tokens

---
*Audit completed. No code modified. All critical/high findings verified against file contents and line references.*
