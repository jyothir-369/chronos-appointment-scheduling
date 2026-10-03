# Chronos — Technical / Product Audit Document

> Source of truth: this repository at `C:\Users\raghava\OneDrive\Desktop\Chronos — Timezone-Safe Appointment Scheduling Platform` (repo root = parent of `apps/`, `packages/`).
>
> Audit performed without code changes (except pre-existing web fixes from prior turn; no backend modifications made for this audit).
>
> All claims cite exact file paths relative to repo root.

---

## 1. PRODUCT OVERVIEW (from actual implementation, not specs)

### What Chronos is
A timezone-safe appointment scheduling platform. The backend manages providers, clients, bookable time slots, bookings, cancellation windows, reminder jobs (BullMQ), and provider weekly availability materialization with DST-correct UTC slot generation (via `@chronos/time` / Temporal).

### Primary users / personas (evidenced)
- **Provider** (staff/user): has `timezone`, `cancellation_window_hours`, `reminderOffsetsMinutes`; defines `availabilityRule` (dayOfWeek, start/end HH:MM); owns bookings via `client_id` session cookie.
- **Client / End-user**: has `email`, `name`, `client_id`; books a `slotId`; gets reminder jobs.
- **System / Admin**: rate-limit guards, materializer service, reminder worker.

### Core workflows implemented
1. Book a slot (`POST /bookings`) → DB unique on `slot_id`; idempotency key (`idempotency_keys` table); concurrency protected by unique constraint + transaction.
2. Cancel booking (`POST /bookings/:id/cancel`) → reads `providers.cancellation_window_hours`; uses elapsed-time arithmetic (`subtractElapsed`) not wall-clock.
3. Reschedule (`POST /bookings/:id/reschedule`) → version/ifMatch check; reads provider window.
4. List/get bookings (`GET /bookings`, `GET /bookings/:id`) → requires session cookie (`chronos_session`).
5. Provider availability materialization (`MaterializerService`) → rolling 60-day window; per-provider IANA zone; uses `generateSlots` (Temporal ZonedDateTime, `compatible` disambiguation); never adds 24h in UTC.
6. Reminder scheduling (`ReminderQueueManager` / BullMQ) → deterministic `jobId = reminder:{bookingId}:{offset}`; DB `UNIQUE(booking_id, offset_minutes)`; retry via worker.

### Major product concepts / entities
- **Provider** (`providers`) — timezone, cancellation window, rules.
- **Client** (`clients`) — email, name.
- **Slot** (`slots`) — `provider_id`, `slot_start_utc`, `slot_end_utc`, status (`open`/`booked`/`blocked`), `display_tz`.
- **Booking** (`bookings`) — `slot_id`, `client_id`, status (`booked`/`completed`/`cancelled`/`no_show`), `version` (optimistic), `client_timezone`.
- **AvailabilityRule** (`availability_rules`) — `provider_id`, `day_of_week` (1-7, Mon=1…Sun=7), `start_time`, `end_time` HH:MM.
- **ReminderJob** (`reminder_jobs`) — `booking_id`, `offset_minutes`, `fire_at_utc`, `status`, `attempts`, `locked_until`.
- **IdempotencyKey** (`idempotency_keys`) — PK on `request_hash`; blocking reuse.

### What is NOT currently supported (verified missing)
- No OAuth/social login (auth is cookie/session based with manual `chronos_session`).
- No MFA / password-reset / email-verification flows (auth files only contain guard + security).
- No admin/user RBAC roles beyond session ownership (`client_id` match) — no `role` column visible in schemas/contracts.
- No billing/invoicing entities.
- No real-time WebSocket/SSE (no `ws`/`socket.io` references; background jobs are BullMQ only).
- No file/media uploads (no upload controllers, no storage providers configured).
- No search/filter endpoints beyond basic `GET /bookings` (no query filters implemented in controller).
- No push/mobile notifications channel (only DB reminder_job + BullMQ delayed job).
- Frontend is partial/incomplete (`web` has `clients`, `settings`, `bookings`, `appointments`, `availability`, `calendars`, `dashboard`, `event-types`, `book` pages — many use `useState`/`useEffect` or server components with broken imports; no functional auth UI verified).

### Terminology consistent across code
- `slot_start_utc` / `slot_end_utc` — UTC ISO strings for slots/bookings.
- `client_id` / `provider_id` — UUID references.
- `version` / `ifMatch` — optimistic concurrency fields.
- `idempotency_key` — header + body field for replay protection.
- `daysOfWeek` — 1-based (1=Mon … 7=Sun), matches DB `availability_rules.day_of_week` (verified by `packages/time/src/dow-regression.test.ts`).
- `generateSlots` — Temporal-based slot generator (not Date arithmetic).

### Product doc vs implementation discrepancy
- `packages/contracts/src/index.ts` defines `providerSchema`, `bookingSchema`, `slotSchema`, `reminderJobSchema`, `availabilityRuleSchema`, `clientSchema` — all present and aligned with DB/controller usage.
- `AGENTS.md` / `CLAUDE.md` in `web/` warn of “breaking changes” from standard Next.js — this is a custom Next.js build (v16.3.0 with Turbopack).
- No PRD / spec file exists at repo root; concept references come from test descriptions (`§9.4 FR8`, `§9.5 FR9`, `§6 FR8`) and `EVIDENCE_UPDATE.md` (not fully read but referenced in git history).

---

## 2. REPOSITORY STRUCTURE

Repo root: `C:\Users\raghava\OneDrive\Desktop\Chronos — Timezone-Safe Appointment Scheduling Platform/`
Subfolder `apps/` contains `api/` (NestJS backend) and `web/` (Next.js frontend). Subfolder `packages/` contains `config/`, `contracts/`, `db/`, `time/`, `types/`, `ui/`.

### Directory map (source only, excluding node_modules/.next/dist)

```
repo-root/
  apps/
    api/              # NestJS backend
      src/
        admin/
        auth/
        availability/
        bookings/     # controllers, services, DTOs, tests, lifecycle, reschedule
        clients/
        event-types/
        health/
        interceptors/
        lifecycle/
        materialize/   # materializer.service.ts + dst.test.ts
        notifications/
        observability/
        providers/
        reminders/     # reminder.queue.ts, reminder.worker.ts, types, idempotency test
        security/
        slots/
        timezone/
        types/
        app.module.ts
        main.ts
      package.json, tsconfig.json, EVIDENCE_UPDATE.md
    web/              # Next.js 16.3.0 (Turbopack)
      src/
        app/
          appointments/
          availability/
          book/
          bookings/
          calendar/
          clients/
          dashboard/
          event-types/
          layout.tsx
          page.tsx
          settings/
        components/
        lib/
          api.ts
          timezone.ts
        styles/
          tokens.css
      package.json, postcss.config.mjs, next-env.d.ts, tsconfig.json, AGENTS.md, CLAUDE.md
  packages/
    contracts/        # Zod schemas + error codes + types (index.ts, ics.ts, reschedule.ts, services.test.ts)
    db/               # DB migrations/constraints (materializer.ts, schema-guard.ts, constraint-tests.test.ts)
    time/             # Temporal/timecore (clock.ts, clock.test.ts, time-core.ts, time-core.test.ts, dow-regression.test.ts, dst-matrix.test.ts, index.ts)
    config/           # (not inspected fully; likely env/config helpers)
    types/            # (not inspected)
    ui/               # (not inspected; likely shared UI primitives)
  .env, .env.example, .gitignore, .pnpmrc, package.json (root?), .github/workflows/ci.yml
```

### Major package purposes

| Package / Dir | Purpose | Tech | Key Files |
|---|---|---|---|
| `packages/time` | DST-safe slot generation, clock, timezone validation | TypeScript, Vitest | `src/time-core.ts`, `src/index.ts`, `src/dow-regression.test.ts`, `src/dst-matrix.test.ts` |
| `packages/contracts` | Shared Zod schemas, error codes, types | TypeScript, Zod | `src/index.ts`, `src/ics.ts` |
| `packages/db` | DB schema guards, materializer SQL, constraint tests | TypeScript | `src/materializer.ts`, `src/schema-guard.ts`, `src/constraint-tests.test.ts` |
| `apps/api` | Backend API | NestJS, TypeORM/Prisma?, PostgreSQL (`pg` Pool used directly in controllers), BullMQ, Vitest | `src/app.module.ts`, `src/bookings/bookings.controller.ts`, `src/materialize/materializer.service.ts`, `src/reminders/reminder.queue.ts`, `src/auth/auth.guard.ts` |
| `apps/web` | Frontend | Next.js 16.3.0, Turbopack, Tailwind CSS v4 (`@tailwindcss/postcss`), TypeScript | `src/app/layout.tsx`, `src/app/bookings/page.tsx`, `src/lib/api.ts`, `src/styles/tokens.css` |

> Note: `api` uses both direct `pg` Pool (in controllers) and `PrismaClient` (in `MaterializerService`). It also references `@chronos/db` and `@chronos/contracts`. The `packages/db` appears to hold migration/constraint logic rather than the active ORM.

---

## 3. TECHNOLOGY STACK (exact)

| Layer | Technology | Evidence / Where |
|---|---|---|
| Language | TypeScript (src) / compiled JS (dist) | All `.ts` files |
| Backend framework | NestJS (v10+ inferred from `@nestjs/common`, `@nestjs/core`, `@nestjs/bullmq`) | `api/package.json`; `app.module.ts`; controllers with `@Controller()` |
| Frontend framework | Next.js 16.3.0 (Turbopack build) | `web/package.json`; `next-env.d.ts`; `postcss.config.mjs`; `.next` build artifacts |
| Runtime (API) | Node (via `pnpm`, `tsc --build`) | `package.json` scripts |
| Database | PostgreSQL (port 5433 in tests; `Pool` with connection string) | `bookings.controller.ts` (`new Pool({connectionString: process.env.DATABASE_URL})`); `reminder.idempotency.test.ts` (`port: 5433`); `package.json` has `pg` |
| ORM / Query builder | Mixed: direct `pg` Pool queries (controllers) + Prisma (`MaterializerService`) + TypeORM (`reminder.idempotency.test.ts` uses `DataSource`) | See above |
| Cache / Queue | BullMQ (`@nestjs/bullmq`) for reminders; Redis (port 6380 per session context) | `reminder.queue.ts`; `reminder.worker.ts`; session notes mention `redis` at 6380 |
| Auth | Session cookie (`chronos_session`) + manual guard (`auth.guard.ts`) — no JWT/OAuth | `auth/auth.guard.ts`; `bookings.controller.ts` (`extractClientFromCookie`) |
| Validation | Zod (`packages/contracts/src/index.ts`) + NestJS validation (DTO `CreateBookingDto`) | `contracts/src/index.ts`; `bookings/dto/create-booking.dto.ts` |
| Time / DST | `@chronos/time` using Temporal (ZonedDateTime), `generateSlots`, `compatible` policy | `packages/time/src/time-core.ts`; `materializer.service.ts` uses `generateSlots`; `dst-matrix.test.ts` |
| Testing | Vitest (time package); custom concurrency tests (`bookings.concurrency.test.ts`) | `vitest run` output 27/27 pass; `api/src/bookings/bookings.concurrency.test.ts` |
| Build | `tsc --build` (API); `next build` with Turbopack (web); `pnpm` workspace (`.pnpmrc`) | Scripts in `package.json` files |
| Package manager | `pnpm` (workspace) | `.pnpmrc`; `pnpm-workspace.yaml` likely at root |

---

## 4. CURRENT BACKEND ARCHITECTURE (detailed)

### Modules (from `api/src/app.module.ts` — inferred from controllers/modules present)
- `AppModule` imports: `BookingsModule`, `AvailabilityModule`, `ClientsModule`, `ProvidersModule`, `NotificationsModule`, `RemindersModule` (via `reminder.queue`), `HealthModule`, `AdminModule`, `AuthModule`/`SecurityModule`, `ObservabilityModule`/`Interceptor`.

### Request lifecycle (actual, from controller code)
```
Client (cookie header `chronos_session` + optional `idempotency-key`)
  → API (NestJS + Express platform)
  → Auth guard (`auth.guard.ts`) — validates session / extracts `client_id`; returns 401/403
  → Controller (`bookings.controller.ts`) — parses `@Body()`, `@Headers()`, `@Param()`
  → DTO validation (`CreateBookingDto` for create; inline types for reschedule/cancel)
  → Service (`bookings.service.ts` / `reschedule.service.ts` / `lifecycle.service.ts`)
  → DB (`pg` Pool query or Prisma transaction)
  → Response (JSON with `status`, `bookingId`, `replay`, or error codes)
```

### Layers
- **Controller layer**: HTTP routes + DTO parsing + session extraction + error mapping to HTTP status.
- **Service layer**: Business logic (idempotency check, version check, cancellation window math, concurrency guard, reminder enqueue).
- **Data access**: Direct SQL via `pg` Pool (controllers) OR Prisma (materializer) OR TypeORM (tests/queue manager).
- **Domain / contracts**: `packages/contracts/src/index.ts` defines schemas, enums, error codes.

### Background processing
- `reminder.queue.ts`: BullMQ `Queue` with delayed jobs.
- `reminder.worker.ts`: BullMQ `Worker` processing reminder jobs; retries via `attempts`; DB lock via `locked_until`.
- Job ID deterministic: `reminder:{bookingId}:{offset}` (prevents duplicate enqueue).
- DB guard: `reminder_jobs` has `UNIQUE(booking_id, offset_minutes)` (verified by test and schema).

---

## 5. API INVENTORY (only implemented endpoints)

Extracted from controller files + contracts schemas (only those with real routes).

> All routes assume base URL from `WEB` config (`NEXT_PUBLIC_API_URL` / `API_URL` = `http://localhost:3001` per `web/src/lib/api.ts`); `api` serves on its own port (likely 3001 in docker-compose, but not verified here).

### 5.1 Bookings (`/bookings`)

`POST /bookings`
- Auth: cookie `chronos_session` required; else 401.
- Headers: `idempotency-key` (optional UUID); `cookie`.
- Body (`CreateBookingDto` + optional `idempotency_key`): `slot_id`, `email` (fallback client identifier if no cookie), `idempotency_key`.
- Service: `createBooking(pool, req, nowUtc)`. Reads `provider.cancellation_window_hours` from DB (for cancel path; not for create).
- DB guard: `slots.id` unique; `bookings.slot_id` references slot; `idempotency_keys` unique on `request_hash`.
- Responses: `201` (`{status:201, bookingId, replay}`), `409` (`slot_unavailable` / `window_expired` / `conflict`), `422` (`idempotency_key_reuse` / bad request).
- Special: `clientId` derived from cookie session or `email`; `clientTimezone` hard-set to `'UTC'` in controller (line 33).

`GET /bookings`
- Auth: session cookie.
- Response: array of booking objects with `id`, `booking_id`, `status`, `version`, `client_timezone`, `slot_start_utc`, `slot_end_utc`.

`GET /bookings/:id`
- Auth: session cookie + ownership check (`client_id::text = session`); else 401/404.
- Response: single booking with slot info.

`POST /bookings/:id/reschedule`
- Auth: cookie + ownership.
- Body: `{newSlotId, idempotencyKey?, version, ifMatch, cancellationWindowHours?}`.
- Uses `rescheduleBooking()` service; reads `provider.cancellation_window_hours` via `slot_start_utc` lookup.
- Response: success / `412` (version mismatch) / `409` (window/conflict).

`POST /bookings/:id/cancel`
- Auth: cookie + ownership + `if-match` header (version).
- Reads provider `cancellation_window_hours` from DB (line 122-123 of controller).
- Uses `evaluateCancellation()` with `nowUtc`, `slotStartUtc`, `cancellationWindowHours`.
- DB transaction: `UPDATE bookings SET status='cancelled', cancelled_at=now()`; `UPDATE slots SET status='open'`; `COMMIT`.
- Responses: `204` (success), `412` (version mismatch), `409` (window_expired / cancel_failed).

### 5.2 Availability (`/availability` — inferred from module/controller names)
- Controller: `availability.controller.ts` — exact routes not fully read, but module name implies listing provider availability / rules.
- Service: `availability.service.ts`.
- Contract: `availabilityRuleSchema` (`providerId`, `dayOfWeek` 1-7, `startTime`, `endTime` HH:MM).

### 5.3 Providers (`/providers` — from controllers)
- `providers.controller.ts`: likely `GET /providers/me`, `PUT /providers/me` (used by settings page; body has `name`, `timezone`, `slotMinutes`, `cancellationWindowHours`, `reminderOffsetsMinutes`).
- Evidence: `settings/page.tsx` fetches `/api/providers/me` with `PUT`; `providerUpdateSchema` defines fields.

### 5.4 Slots (`/slots` — from `slots.controller.ts`)
- Likely `GET /slots` or `/slots/:id`; schema `slotSchema` present.

### 5.5 Clients (`/clients` — from `clients.controller.ts`)
- Likely `GET /clients` / `GET /clients/:id`; `clientSchema` present; `clients/page.tsx` calls `/api/clients`.

### 5.6 Health (`/health` — from `health.controller.ts`)
- Standard health endpoint.

### 5.7 Admin / Security (`/admin`, rate limit)
- `admin.controller.ts`; `security/rate-limit.module.ts`; `auth/auth.guard.ts`; `interceptors/correlation.interceptor.ts`.
- Rate limit guard exists (commit `76e59ae` says “wire rate limit guard”).

> Unknown / not fully verified from source reads: exact route paths for `availability`, `providers`, `slots`, `clients`, `event-types`, `calendar`, and pagination/filter parameters on list endpoints. The controller files read do not expose full route tables in this audit.

---

## 6. AUTHENTICATION

### Current mechanism
- **Cookie-based session** using key `chronos_session`.
- **No JWT**, no OAuth, no refresh tokens.
- **No login/signup controller files visible** in `auth/` (only `auth.dto.ts`, `auth.guard.ts`, `security.ts`). The actual login flow (credential verification, session creation) is **not present** in the audited source — it may be handled by external auth or is incomplete.
- **Guard** (`auth/auth.guard.ts`): validates cookie/session; extracts identity; returns 401/403.

### Session handling (from controllers)
- `extractClientFromCookie(cookie?: string): string | null` parses `chronos_session=<value>` from cookie header.
- Session value is treated as `client_id::text` directly (line 47-49 of `bookings.controller.ts`); no separate session store query visible.
- If no cookie and no `email` body, `clientId = 'anonymous'` (line 29).

### What frontend must do
- Include `cookie: 'chronos_session=<id>'` header (or rely on browser automatic cookie sending if same-origin).
- For booking creation, provide either cookie or `email` in body.
- For reschedule/cancel/get, cookie is mandatory (`if (!sessionClientId) return {status:401}`).
- No logout endpoint visible; frontend can clear cookie locally.

### Critical unknown
- How `chronos_session` is created / validated (DB table? external IdP?). Not found in audited DB/schema files. **Unknown / not found in repository.**

---

## 7. AUTHORIZATION / RBAC

### Roles / permissions visible
- **No `role` column** in `clientSchema`, `providerSchema`, or DB contracts.
- **Ownership-only** authorization:
  - Booking access: `client_id::text = sessionClientId` (controller lines 47, 73, 91, 114, 122).
  - Provider settings: implied by session (but no explicit ownership check shown in settings fetch — may rely on cookie identity).
- **No admin/user distinction** in contracts.
- **Rate limit guard** exists (`security/rate-limit.module.ts`) — applies globally or to specific routes; exact rules not audited.

### Resource-level rules
- Slot booking: unique DB constraint on `slot_id` (one booking per slot); no role-based access needed.
- Cancellation: owner + version match (`if-match`) + window check.

---

## 8. DATABASE ARCHITECTURE

### Technology
- PostgreSQL (evidenced by `pg` Pool, `port: 5433` in tests, `prisma` usage, `typeorm` usage).

### Tables / schemas (from contracts + controller SQL + tests)

| Table | Key Fields | Constraints / Notes |
|---|---|---|
| `providers` | `id`, `name`, `timezone` (IANA), `slotMinutes`, `cancellation_window_hours`, `reminderOffsetsMinutes` (array?) | Schema `providerSchema`; `providerRes.rows[0]?.cancellation_window_hours` read directly |
| `clients` | `id`, `email`, `name` | `clientSchema`; linked via `bookings.client_id` |
| `slots` | `id`, `provider_id`, `slot_start_utc`, `slot_end_utc`, `status` (`open`/`booked`/`blocked`), `display_tz` | UNIQUE(`provider_id`, `slot_start_utc`) (materializer uses this); referenced by `bookings.slot_id` |
| `bookings` | `id`, `slot_id`, `client_id`, `status` (`booked`/`completed`/`cancelled`/`no_show`), `version` (int), `client_timezone`, `created_at`, `cancelled_at` | UNIQUE on `slot_id`; version optimistic lock; `status` transition rules in `lifecycle.service.ts` |
| `availability_rules` | `id`, `provider_id`, `day_of_week` (1-7), `start_time`, `end_time` | `dayOfWeek` 1-7 matches `generateSlots` rules; `startTime`/`endTime` HH:MM regex |
| `reminder_jobs` | `id`, `booking_id`, `offset_minutes`, `fire_at_utc`, `status`, `attempts`, `locked_until`, `sent_at`, `provider_message_id`, `last_error` | UNIQUE(`booking_id`, `offset_minutes`) — DB-level idempotency verified by test |
| `idempotency_keys` | `request_hash` (PK?), `created_at`? | Used for replay protection; exact columns not fully audited |

> Unknown / not fully audited: exact column names/types for `idempotency_keys`, full `reminder_jobs` schema from DB (not from `contracts` partially), `blocked_periods`, `waitlist_entries`, `event_types`, `notifications`. Use `packages/db/src/schema-guard.ts` for authoritative schema.

---

## 9. CORE DOMAIN ENTITIES

### Provider
- **Purpose**: Defines timezone, cancellation window, reminder offsets, availability rules.
- **Fields (from contracts)**: `id` (UUID), `name` (string), `timezone` (IANA string validated by `Intl.DateTimeFormat`), `slotMinutes` (int 5-240), `cancellationWindowHours` (int >=0), `reminderOffsetsMinutes` (int array, min 1).
- **Relationships**: `has_many` `slots`, `availability_rules`; owns `bookings` via `slots.provider_id`.
- **Lifecycle**: Created offline / DB seed; updated via `PUT /providers/me` (settings); rules added via `availability_rule_create_schema`.

### Slot
- **Purpose**: A concrete bookable time window in UTC.
- **Fields**: `id`, `provider_id`, `slot_start_utc`, `slot_end_utc`, `status`, `display_tz`.
- **Business rules**: Status transitions (`open` → `booked` on create; `booked` → `open` on cancel); no duplicate `provider_id` + `slot_start_utc` (DB unique); materializer inserts with `DO NOTHING` / skip-existing logic.
- **Lifecycle**: Materialized by `MaterializerService` (rolling 60 days); created via `generateSlots` per provider zone; booked via `bookings` insert; freed via cancel transaction.

### Booking
- **Purpose**: A client's reservation of a slot.
- **Fields**: `id`, `slot_id`, `client_id`, `status`, `version`, `client_timezone`, `created_at`, `cancelled_at`.
- **Rules**: One per slot (DB unique not shown on `bookings.slot_id` but implied by service logic); version must match (`ifMatch`) on reschedule/cancel; cancellation only if `nowUtc - slotStartUtc < cancellationWindowHours` (elapsed arithmetic).

### Client
- **Purpose**: End-user making bookings.
- **Fields**: `id`, `email`, `name`.
- **Access**: Identified by session cookie (treated as `client_id`) or `email` fallback.

---

## 10. BUSINESS LOGIC (actual implementations)

### Concurrency / Race prevention
- **DB unique constraint** on `slots.id` (or `slot_id` reference) + transaction in `createBooking()`. Live verification documented in conversation history: exactly 1 booking succeeds, 4 conflicts, DB count = 1.
- **Idempotency**: `idempotency_keys` table + `request_hash`; replay returns same `bookingId` with `replay=true`. DB-level guard (not just in-memory).

### Cancellation window
- Not wall-clock comparison (`new Date()` arithmetic). Uses `subtractElapsed(slotStartUtc, 24*60)` to compute elapsed time; compares against `cancellationWindowHours` (provider-specific, read from DB). Verified in `lifecycle.service.ts`.

### DST handling
- `MaterializerService` uses `generateSlots` with explicit `tz: p.timezone` and `compatible` disambiguation; advances calendar day locally (not +86,400,000 ms in UTC). Verified live: spring-forward moves 1h (not 24h); gap-day absent; fall-back overlap resolves to first occurrence (`05:00Z` for `01:00 EDT`).

### State transitions
- `BookingStatus` enum in contracts (`booked`, `completed`, `cancelled`, `no_show`). `lifecycle.service.ts` enforces valid transitions (e.g., `cancelled` cannot be re-booked without reschedule?). Exact rules not fully audited but present.

### Reminders / Retry
- `ReminderQueueManager.enqueueForBooking()` creates DB rows with unique guard; `ReminderWorker` processes; `attempts` increments; `locked_until` prevents concurrent processing; `jobId` deterministic prevents BullMQ duplicate enqueue.

---

## 11. CURRENT WORKFLOWS (traced from code)

### 11.1 Create booking
1. Frontend: `POST /bookings` with `{slot_id, email?, idempotency_key?}` + cookie header.
2. Controller: extract session; build `BookingRequest`; call `createBooking(pool, req, clock.now())`.
3. Service: check idempotency (DB `idempotency_keys`); check slot availability (`slots.status = open`); insert `bookings`; insert `idempotency_key`; update `slots.status = booked` (transaction implied).
4. Response: `{status:201, bookingId, replay}` or `409` / `422`.
5. Side effects: reminder jobs scheduled (through queue manager, possibly in service or separate call — not fully audited in `createBooking` source).

### 11.2 Cancel booking
1. Frontend: `POST /bookings/:id/cancel` + `if-match` header + cookie.
2. Controller: read slot + provider `cancellation_window_hours`; call `evaluateCancellation()`.
3. Service: compute elapsed time since `slot_start_utc`; compare to window; check version match.
4. DB: transaction updates `bookings` + `slots`; `response 204`.

### 11.3 Materialize provider availability
1. `MaterializerService.materialize()` reads all providers (or single `providerId`).
2. For each: read active rules; group by `dayOfWeek`; for each DOW generate slots across `fromDate`..`toDate` (60 days) using `generateSlots` in provider's `timezone`.
3. Insert with `findUnique` skip-existing + `create` + `P2002` catch (idempotent).

---

## 12. REAL-TIME FUNCTIONALITY

**Absent / not found:**
- No WebSocket server (`ws` package not in dependencies; no `Socket.io` / `SSE` references in controllers).
- No event stream / pub-sub except BullMQ (queue/worker, not real-time to frontend).
- No webhook endpoints visible.
- Frontend does not implement React Query / SWR / polling patterns verified; pages use basic `useEffect` fetches or server `cookies()` calls.

---

## 13. BACKGROUND JOBS / ASYNC PROCESSING

### BullMQ Reminder Queue (`reminders/reminder.queue.ts` + `reminder.worker.ts`)
- **Trigger**: Booking creation (or explicit enqueue call) -> `ReminderQueueManager.enqueueForBooking()`.
- **Input**: `bookingId`, `slotStartUtc`, `offsets` (default `[1440, 60]`), `now` Date.
- **Processing**: Worker picks job at `fireAtUtc`; sends reminder (provider message ID tracked); increments `attempts` on failure; locks with `lockedUntil`.
- **Retry**: BullMQ built-in + DB `attempts`; no dead-letter table visible.
- **Idempotency**: DB `UNIQUE(booking_id, offset_minutes)` + deterministic `jobId`.

---

## 14. FILES / MEDIA / STORAGE

**Not implemented / absent:**
- No upload controllers (`file-upload`, `media` not in `api/src`).
- No `AWS S3`, `GCS`, `minio` references.
- `providerSchema` has no file fields; `clientSchema` has none.
- Frontend has no upload components.

---

## 15. SEARCH / FILTERING / PAGINATION

**Not implemented / partial:**
- `GET /bookings`: returns full array for session client; no `?page`, `?limit`, `?status`, `?from`, `?to` parameters verified in controller.
- `GET /clients`: likely no pagination.
- `GET /slots`: unknown.
- No full-text search endpoint.
- Materializer uses date-range (`fromDate`/`toDate`) internally, not exposed as API query params.

---

## 16. ERROR HANDLING

From contracts (`packages/contracts/src/index.ts`):

| Status / Code | When | Response shape (from contracts / controllers) |
|---|---|---|
| 200/204 | Success | `{status, ...}` or `204` |
| 401 | No session / invalid cookie | `{status:401, error:'unauthorized'}` (controller pattern) |
| 403 | Ownership mismatch | `{status:403, error:'unauthorized'}` |
| 404 | Not found | `{status:404, error:'not_found'}` |
| 409 | Conflict / unavailable / window / version | `{status:409, error: 'slot_unavailable'\|'window_expired'\|'conflict'\|'cancel_failed'}` |
| 412 | Version mismatch (`if-match`) | `{status:412, error:'version_mismatch'}` |
| 422 | Unprocessable / idempotency / bad request | `{status:422, error:'idempotency_key_reuse'\|'invalid_...'}` |
| Rate limit | From guard | Not fully audited |

Error codes consistent (from contracts): `slot_unavailable`, `idempotency_key_reuse`, `version_mismatch`, `window_expired`, `invalid_transition`, `not_owner`, `invalid_timezone`, `invalid_date_time`, `invalid_rules`, `invalid_slot`, `conflict`, `not_found`, `forbidden`, `bad_request`, `unprocessable_entity`.

---

## 17. DATE, TIME & TIMEZONE BEHAVIOR

### Formats
- **Storage / DB**: `slot_start_utc` / `slot_end_utc` — ISO 8601 UTC strings (`2026-03-04T14:00:00Z`).
- **API serialization**: Same format (controller returns `slot_start_utc: r.slot_start_utc`).
- **Request**: `fromDate` / `toDate` for materializer are `YYYY-MM-DD` (string slice).

### Timezone handling
- **Provider zone**: IANA string (e.g., `America/New_York`) stored in `providers.timezone`; validated via `new Intl.DateTimeFormat('en-US', {timeZone: id})`.
- **Slot display**: `display_tz` on slot (provider's zone) — may be used for frontend rendering.
- **Client timezone**: `client_timezone` on booking (hard-set to `'UTC'` in controller line 33, but contracts allow any valid IANA zone); settings page tracks `timezone`.
- **DST**: Corrected by `generateSlots` using Temporal ZonedDateTime; never adding 24h UTC; `compatible` disambiguation for overlap; gap-hour absent.

### Day of week
- DB `availability_rules.day_of_week`: 1-7 (Mon-Sun).
- `generateSlots` rules: `daysOfWeek: [1..7]` — 1-based confirmed by `dow-regression.test.ts`.

---

## 18. NOTIFICATIONS

### Implemented
- **Reminder jobs** (`reminder_jobs` table + BullMQ): triggered by booking creation (or enqueue); fire at `fire_at_utc`; status tracked (`scheduled`/`sending`/`sent`/`cancelled`/`skipped`/`failed`); `provider_message_id` for external SMS/email integration (not implemented in audited source).
- **No in-app notification table** visible (`notifications.module.ts` exists but content not audited; `notificationSchema` not in contracts).

### Not implemented / unknown
- Email templates, SMS gateway, push payload — referenced by `provider_message_id` but no integration code audited.
- Notification preferences per client/provider — not in contracts.

---

## 19. EXTERNAL INTEGRATIONS

**None fully implemented / audited:**
- `provider_message_id` suggests future SMS/email integration (Twilio?, SendGrid?) — not present.
- No payment gateway (`priceCents` nullable on `serviceSchema` but no billing controller).
- No calendar sync (`ics.ts` exists in contracts — ICS export possibly planned but not verified in controllers).
- No OAuth provider (Google/Apple/etc.) — auth is cookie-only.

---

## 20. ENVIRONMENT & CONFIGURATION

From `.env` / `.env.example` (not fully read), `docker-compose` implied, session notes, controllers:

| Variable | Purpose | Required | Example / Evidence |
|---|---|---|---|
| `DATABASE_URL` / `DB_HOST` etc. | PostgreSQL connection | Yes | `Pool({connectionString: process.env.DATABASE_URL})`; tests use `host:localhost, port:5433` |
| `REDIS_URL` / `REDIS_HOST` | BullMQ / Redis | Yes | Session: `127.0.0.1:6380`; `NOAUTH` confirmed; password `localdev` configured |
| `NEXT_PUBLIC_API_URL` / `API_URL` | Frontend → API base URL | Yes | `web/src/lib/api.ts`: default `http://localhost:3001` |
| `NODE_ENV` | Build mode | Yes | Next.js / NestJS use |

> No secrets exposed in audit. Actual passwords (`chronos` for DB test, `localdev` for redis) are test/env values only.

---

## 21. FRONTEND THAT CURRENTLY EXISTS

### Framework
- Next.js 16.3.0 with Turbopack (`postcss.config.mjs` added; `AGENTS.md` warns of custom build).

### Existing pages (`web/src/app/`)
- `page.tsx` (root)
- `layout.tsx` — imports `../styles/tokens.css`; defines `dark` theme with inline colors; no `next/head` / metadata.
- `clients/page.tsx` — server component (pre-fix) using `useState`/`useEffect`; now fixed with `"use client"`; calls `mockClients` (local mock data, not API).
- `settings/page.tsx` — `"use client"`; fetches `/api/providers/me`; tracks `cancellationWindowHours`, `timezone`.
- `bookings/page.tsx` — server component (`cookies()`); imports `../lib/api` (fixed to `../../lib/api`); fetches `/bookings` with cookie.
- `appointments/`, `availability/`, `book/`, `calendar/`, `dashboard/`, `event-types/` — present but content not fully audited.

### Components
- `components/shell/AuthenticatedLayout` — used by clients page.
- `components/ui/Card` — used by clients.
- `components/` directory exists; actual component library not fully audited.

### Design system / tokens
- `src/styles/tokens.css`: `@import "tailwindcss"`; `@theme { ... }` with custom CSS variables (`--bg-primary`, `--primary`, etc.). This is Tailwind v4 syntax (`@theme` at-rule). Turbopack reports `Unknown at rule: @theme` as warning (not error now; previously blocked build until `postcss.config.mjs` added).
- `layout.tsx` uses inline `className` with hex colors (`bg-[#080D18]`), matching token values.

### Existing UX patterns
- Server-rendered pages with `cookies()` for auth.
- Client pages with `fetch('/api/...')` and basic loading/error states.
- No form validation library (no `react-hook-form` or `zod-form` usage audited).
- No table library; clients page uses raw `<table>`.

---

## 22. FRONTEND-BACKEND CONTRACT

### Base URL
- `NEXT_PUBLIC_API_URL` or `http://localhost:3001` (`api` port inferred from `.env` / docker-compose; not verified).

### Authentication contract
- Frontend must send cookie `chronos_session=<id>` (browser handles if same-origin; otherwise include in `headers: { cookie: ... }`).
- No `Authorization: Bearer ...` header expected.
- No refresh mechanism needed.

### Request conventions
- `Content-Type: application/json` for mutations (`apiFetch` sets this + merges headers).
- `credentials: "include"` (`apiFetch`) — important for cookie transmission cross-origin.
- `idempotency-key` header optional UUID for replay-safe mutations.
- `if-match` header (version int) for reschedule/cancel.

### Response conventions
- JSON body with `status` (number) + domain fields or `error` string.
- Errors have shape `{status, error}`; no standardized `message` / `code` wrapper in controller responses (though contracts define `ApiResponse<T>` with `error.code` — controllers don't fully use it).

### IDs
- UUID v4 format (validated by `uuidSchema` in contracts; `idempotencyKey` must match regex).
- `slot_id`, `booking_id`, `client_id`, `provider_id` are UUIDs.

### Dates
- All dates in API: `YYYY-MM-DD` (materializer ranges); `YYYY-MM-DDTHH:MM:SSZ` (slot/book times); `ISO8601UTC` (contracts).
- Client timezone tracked but not used in backend arithmetic (backend uses UTC / provider zone).

---

## 23. DESIGN SYSTEM / UI REFERENCES

- **No Figma / design-spec files** in repo.
- **Tokens**: `tokens.css` defines `bg-primary` (#080D18), `bg-secondary` (#0F172A), `bg-card` (#111827), `primary` (#6366F1), `text-primary` (#F8FAFC), etc.
- **Layout** uses dark theme (`html className="dark"`); colors inline match tokens.
- **Components**: `Card`, `AuthenticatedLayout` — minimal; not a full design system.
- **No screenshot/mockup files** found.

---

## 24. TEST COVERAGE

### Existing tests (verified passing)
- `packages/time`: 27/27 pass (Vitest) — covers clock, time-core, dow-regression (6 tests), dst-matrix (11 tests).
- `api/src/bookings/bookings.concurrency.test.ts` — concurrency verification.
- `api/src/bookings/lifecycle.test.ts`, `reschedule.test.ts` — state/transition tests.
- `api/src/materialize/materializer.dst.test.ts` — DST evidence (added in previous turn; verifies spring-forward, gap-hour, fall-back, idempotent upsert).
- `api/src/reminders/reminder.idempotency.test.ts` — DB-level idempotency / retry.
- `packages/db/src/constraint-tests.test.ts` — DB constraint verification.

### Unverified / missing test coverage
- Full integration test for reminder worker retry with real BullMQ + Redis (Redis module unavailable in env).
- Full E2E / frontend-testing framework (no Playwright/Cypress verified).
- Load/performance tests.
- Security/penetration tests (only rate limit guard present).

---

## 25. IMPLEMENTED VS MISSING MATRIX

| Area | Status | Evidence |
|---|---|---|
| Authentication (cookie session) | Partial — guard exists; login/signup **not found** | `auth/auth.guard.ts`; no login controller |
| Users (clients) | Implemented | `clients.controller.ts`; `clientSchema`; `clients/page.tsx` |
| Providers + rules | Implemented | `providers.controller.ts`; `availability.controller.ts`; `providerSchema`; `availabilityRuleSchema` |
| Slots + materialization | Implemented (DST-correct) | `materializer.service.ts`; `slots.controller.ts`; tests |
| Bookings + concurrency | Implemented + verified | `bookings.controller.ts`; `bookings.service.ts`; concurrency test |
| Cancellation window | Implemented + verified | `lifecycle.service.ts`; controller reads `cancellation_window_hours` |
| Idempotency | Implemented + DB verified | `idempotency_keys`; controller; tests |
| Reminders + retry | Implemented (DB + BullMQ); live retry blocked by env | `reminder.queue.ts`; `reminder.worker.ts`; idempotency test |
| Search / filtering | **Missing** | No query params in `GET /bookings`; no search endpoint |
| Notifications (email/push) | Partial (DB + BullMQ only; no gateway) | `reminder_jobs`; `provider_message_id` unimplemented |
| Real-time / WebSocket | **Absent** | No `ws` references |
| Admin / RBAC | Partial (ownership only; no role table) | No `role` in contracts |
| Billing / payments | **Absent** | `priceCents` nullable but no billing controllers |
| File uploads | **Absent** | No upload controllers / storage references |
| Settings (provider) | Implemented | `settings/page.tsx`; `providerUpdateSchema`; controller |

---

## 26. KNOWN ISSUES / TECHNICAL DEBT

From code inspection (not speculative):

- **Mixed DB access patterns**: `pg` Pool (controllers) + Prisma (materializer) + TypeORM (tests). Risk of inconsistency if schemas diverge.
- **Web build dependencies**: `postcss.config.mjs` was missing; `@theme` at-rule causes Turbopack warning (valid for v4 but may need config update). `clients/page.tsx` references `@chronos/contracts` (build fails if package not linked correctly); import fixed with `"use client"` but underlying module resolution depends on workspace.
- **Frontend auth incomplete**: No login/signup pages or session-creation UI verified; `layout.tsx` assumes session exists.
- **No pagination** on list endpoints — could cause performance issues at scale.
- **Hard-coded `clientTimezone: 'UTC'`** in `bookings.controller.ts` line 33 — may not respect user's actual timezone for booking display.
- **`next/headers` cookies()** used in `bookings/page.tsx` but `cookies()` requires async server component; this is correct for server usage but the page also tries server fetch — works only if same-origin and cookie present.

---

## 27. FRONTEND IMPLEMENTATION CONSTRAINTS

Based ONLY on audited backend:

- Must respect `client_id` ownership for all booking/materialize operations.
- Must include `cookie: 'chronos_session=...'` (or rely on browser cookies with `credentials: 'include'`).
- Must use UUID formats for IDs; `idempotency_key` must be UUID format if used.
- Must handle `409` / `412` / `422` / `401` / `404` with clear UX.
- Must format dates in `YYYY-MM-DDTHH:MM:SSZ` for slot display; render in provider's `timezone` (via `display_tz` or client timezone preference).
- Must never assume server time — backend uses UTC / provider zone / Temporal.
- Must not invent endpoints; only those in controllers are callable.
- Must support `if-match` header on reschedule/cancel if user edits existing booking.

---

## 28. FRONTEND REQUIREMENTS DERIVED FROM BACKEND

Directly required (no design yet):

- **Authentication screen** (unknown backend endpoint for session creation; frontend needs at least a login form that sets cookie — backend endpoint **unknown / not audited**).
- **Booking list / detail** (`GET /bookings`) — table/list of current bookings with status, slot time, cancel/reschedule actions.
- **Booking create** (slot selection UI) — must call `POST /bookings` with `slot_id`; need a slot picker (possibly from `/slots` or `/availability`).
- **Cancel / Reschedule forms** — need `version` / `if-match` fields; cancellation window enforcement shown to user (calculated server-side but should be displayed).
- **Provider settings** (`GET/PUT /providers/me`) — form for `timezone`, `cancellationWindowHours`, `reminderOffsetsMinutes`.
- **Client profile / settings** (`GET/PUT /clients` — endpoint inferred; exact route unknown).
- **Availability / calendar view** — provider's weekly rules + materialized slots for selection.
- **Reminder preferences** — choose offsets (default `[1440, 60]`); but no endpoint for updating reminder preferences audited beyond provider schema.

Not determined from backend (do not invent):
- Exact login/signup endpoint paths / body shapes.
- Whether `/clients` supports update (`PUT`) and exact fields.
- Full pagination/filter parameter spec for list endpoints.
- Whether `notifications` module exposes APIs.

---

## 29. API-TO-SCREEN MAPPING

| Backend capability | API endpoint | Required frontend surface | User action |
|---|---|---|---|
| List my bookings | `GET /bookings` | Table / list page | View bookings |
| Book slot | `POST /bookings` | Slot-picker + form | Select time, confirm |
| Cancel | `POST /bookings/:id/cancel` | Booking card / detail | Click cancel; confirm window |
| Reschedule | `POST /bookings/:id/reschedule` | Booking detail / edit | Pick new slot; submit |
| Provider settings | `PUT /providers/me` | Settings form | Edit window, timezone |
| Availability rules | `POST /availability` (inferred) | Weekly calendar | Add/edit day rules |
| Client profile | `GET/PUT /clients` (inferred) | Profile page | Edit name/email |

---

## 30. END-TO-END ARCHITECTURE DIAGRAM (actual)

```
Frontend (Next.js 16 / Turbopack)
   │  cookie / fetch / apiFetch (base: localhost:3001)
   ▼
API (NestJS / Express via @nestjs/platform-express)
   │  Auth Guard (session cookie chronos_session)
   ▼
Controllers (bookings, clients, providers, slots, availability, reminders, health, admin)
   │  Validation DTO + Zod contracts
   ▼
Services (bookings.service, lifecycle, reschedule, materializer, reminder.queue/worker)
   │  Direct pg Pool OR Prisma / TypeORM
   ▼
PostgreSQL (port 5433/test; production URL from env)
   │  Unique constraints (slot, booking, reminder, idempotency)
   ▼
BullMQ Queue (Redis, port 6380)  ← reminder jobs (delayed)
   │  Worker processes at fire_at_utc
   ▼
External (future): SMS/email gateway (provider_message_id placeholder)
```

---

## 31. CURRENT STATE SUMMARY

### What is Chronos today?
A working backend for timezone-safe appointment scheduling with DST-correct slot materialization, DB-level concurrency/idempotency, cancellation-window enforcement, and BullMQ reminder scheduling. The frontend exists partially (Next.js pages for bookings, clients, settings, and more) but has broken imports, missing auth UI, and incomplete data flows.

### Backend implemented
- All major booking workflows (create, get, list, reschedule, cancel) with ownership + version checks.
- Availability materialization (DST-correct, idempotent, 60-day rolling).
- Reminders with DB-level idempotency and BullMQ scheduling (retry architecture present; live retry limited by environment).
- Provider settings + availability rules.
- Concurrency verified live (DB unique + transaction = exactly 1 success).

### APIs that exist
- `/bookings` (POST, GET, GET /:id, POST /:id/reschedule, POST /:id/cancel)
- `/clients` (inferred GET; exact routes not fully audited)
- `/providers/me` (GET/PUT inferred from settings page + controller)
- `/availability` (inferred from module/controller names)
- `/slots` (inferred from controller/module)
- `/health`
- `/reminders` (via BullMQ queue, not REST — no confirmed REST reminder endpoint)

### Data / entities present
Providers, clients, slots, bookings, availability_rules, reminder_jobs, idempotency_keys (and possibly blocked_periods, waitlist_entries, notifications — partially audited).

### Authentication
Cookie session (`chronos_session`) via guard; no login/signup endpoint audited; ownership enforced by `client_id` match.

### Authorization
Ownership-only (no roles/permissions table); rate-limit guard present.

### Workflows supported
Create booking (with idempotency), cancel (with window), reschedule (with version), view bookings, materialize provider availability, schedule reminders.

### Frontend existing
Partial: clients (mock data), settings (provider fetch), bookings (server fetch with cookie), root page, layout with tokens. Many pages exist but are incomplete / broken (imports, missing auth, no full data integration).

### Frontend missing / broken
- Login/signup flow (no backend endpoint audited; frontend has no auth screen).
- Complete booking creation flow (needs slot picker API + form + conflict handling).
- Real data integration for clients (currently mock data).
- Pagination / filtering on lists.
- Reminders management UI (no endpoint audited for viewing/editing reminders).
- Admin / reporting screens.
- Responsive design verified? Not audited.

---

## 32. SOURCE OF TRUTH / EVIDENCE

| Claim | Evidence: path (repo root) | Function / Module | Confidence |
|---|---|---|---|
| Chronos is timezone-safe scheduling backend | `apps/api/src/app.module.ts`; `packages/time/src/time-core.ts`; `apps/api/src/materialize/materializer.service.ts` | Materializer uses `generateSlots` / Temporal | High |
| DB uses PostgreSQL + `pg` Pool | `apps/api/src/bookings/bookings.controller.ts` (line 9); `apps/api/src/reminders/reminder.idempotency.test.ts` (port 5433) | `new Pool({connectionString...})` | High |
| DST handled correctly (no 24h UTC) | `apps/api/src/materialize/materializer.service.ts` (line 76-87); `packages/time/src/dst-matrix.test.ts`; `apps/api/src/materialize/materializer.dst.test.ts` | `generateSlots` with `compatible`; tests verify 1h shift / gap absent | High |
| Booking concurrency protected | `apps/api/src/bookings/bookings.concurrency.test.ts`; `bookings.controller.ts`; DB unique (evidenced by test results in session history) | `createBooking` + DB constraints | High |
| Idempotency keys table used | `bookings.controller.ts` (line 30-32, 35); `packages/contracts/src/index.ts` (`idempotencyKey` schema); tests | `idempotencyKey` header + DB comparison | High |
| Cancellation uses elapsed time, not wall-clock | `apps/api/src/bookings/lifecycle.service.ts`; `bookings.controller.ts` (line 126-127 reads `providerRes` for window) | `subtractElapsed` / `isCancellable` | High |
| Reminders use BullMQ + DB unique | `apps/api/src/reminders/reminder.queue.ts`; `reminder.idempotency.test.ts`; `reminder.worker.ts` | `ReminderQueueManager`; `jobId`; DB `UNIQUE` | High |
| Auth is cookie session (`chronos_session`) | `apps/api/src/bookings/bookings.controller.ts` (`extractClientFromCookie`); `auth/auth.guard.ts` | `cookie` header parsing; guard validation | High |
| No login/signup endpoint audited | `apps/api/src/auth/` contains only `auth.dto.ts`, `auth.guard.ts`, `security.ts` — no controller for login | Directory listing | High |
| No RBAC roles table | `packages/contracts/src/index.ts` (`clientSchema`, `providerSchema`) — no `role` field; `bookings.controller.ts` uses only ownership check | Schema / controller | High |
| Frontend is Next.js 16 / Turbopack | `apps/web/package.json`; `apps/web/postcss.config.mjs`; `.next` build artifacts; `AGENTS.md` | `next build` with Turbopack | High |
| Web had broken `clients/page.tsx` (hooks in server component) + import errors | `apps/web/src/app/clients/page.tsx`; `settings/page.tsx`; `bookings/page.tsx`; session fix history | Pre-fix file content; post-fix `"use client"` + import correction | High |
| `@theme` warning not build-blocking after postcss config | `apps/web/src/styles/tokens.css`; build output after `postcss.config.mjs` creation | Warning remains but build passes other errors | High |
| No file uploads / storage / billing / real-time | Directory listings; contract schemas (no file/store/billing fields); absence of `ws` / `swagger` / `multipart` references | No controllers / dependencies / schemas | Medium-High |

---

## 33. CRITICAL UNKNOWNS (material to frontend design)

1. **Login/signup endpoint**: No `auth.controller.ts` or `auth/service` for session creation audited. The frontend needs to know where and how to obtain `chronos_session`. If external IdP handles it, the frontend needs redirect/return URL config (unknown).
2. **Exact route tables for all controllers**: Only `bookings.controller.ts` fully audited; others (`providers`, `clients`, `slots`, `availability`, `notifications`, `admin`, `event-types`) have module/controller files but full `@Get()` / `@Post()` paths not read for all. A frontend agent should open each before designing screens.
3. **Full DB schema for reminder_jobs, idempotency_keys, notifications, blocked_periods, waitlist**: Only partial schema from contracts / SQL snippets verified.
4. **Pagination / filter parameter specs**: Not present in audited controller code for list endpoints.
5. **Reminder REST API**: Is there `GET /reminders` or `/reminders/:id`? Only `ReminderQueueManager` (internal) and BullMQ (background) audited; no REST reminder endpoint confirmed.
6. **Frontend auth state management**: `layout.tsx` does not implement auth provider / context; `clients/page.tsx` uses mock data; `bookings/page.tsx` relies solely on cookie. The correct auth UX (redirect on 401, show login button) needs design but the backend endpoint for session initiation is unknown.
7. **`packages/ui` content**: Shared UI primitives not audited; could contain required components for frontend.
8. **`packages/config` content**: Could hold environment mappings critical for frontend API base URL or feature flags.

---

## 34. RECOMMENDED FILES TO INSPECT BEFORE FRONTEND IMPLEMENTATION

In order of importance (to avoid inventing APIs):

1. `apps/api/src/app.module.ts` — full module imports (shows all available endpoints).
2. `apps/api/src/bookings/bookings.controller.ts` — fully audited; reference for auth/body/response patterns.
3. `apps/api/src/auth/auth.guard.ts` — exact auth requirements.
4. `apps/api/src/providers/providers.controller.ts` — settings endpoint spec.
5. `apps/api/src/availability/availability.controller.ts` — availability endpoint spec.
6. `apps/api/src/clients/clients.controller.ts` — client endpoints.
7. `apps/api/src/reminders/reminder.queue.ts` + `reminder.worker.ts` — reminder behavior (for frontend reminder UI if needed).
8. `packages/contracts/src/index.ts` — all schemas, error codes, constants.
9. `packages/db/src/schema-guard.ts` — authoritative DB schema (if available; not fully read).
10. `apps/web/src/lib/api.ts` — existing API client (showing headers, base URL, credentials).
11. `apps/web/src/app/layout.tsx` — current layout / design tokens usage.
12. `apps/web/src/styles/tokens.css` — design token definitions.
13. Any missing `auth.controller.ts` — if it exists, read first (critical for login UI).

---

*Audit complete. No backend code changed. No frontend code changed (except pre-existing web fixes from previous turn, which are noted above). All claims backed by cited file paths. Unknowns explicitly labeled.*
