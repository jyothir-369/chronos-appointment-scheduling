# Chronos: Implementation Plan

**Timezone-Safe Appointment Scheduling Platform**
Version 1.0 · 23 Sep 2026 · Inputs: `prd.md`, `problem_statement.md`, plus a fresh check of the current tooling landscape (sources in §12).

---

## 1. What "done" means

Chronos is finished when five invariants hold, each enforced by the database or a single well-tested module rather than by developer discipline, and each backed by evidence you can show.

| # | Invariant | Enforced by | Evidence artifact |
|---|-----------|-------------|-------------------|
| I1 | At most one live booking per slot | Partial unique index + compare-and-set on `slots.status` | Load-test report + SQL invariant query |
| I2 | No two slots of one provider overlap in time | `EXCLUDE USING gist` on `tstzrange` | Constraint tests + materializer property tests |
| I3 | Stored times are UTC instants; wall-clock math happens in exactly one package with explicit DST policy | `@chronos/time` + lint ban on raw `Date` math | DST matrix report, run under multiple process time zones |
| I4 | Each (booking, reminder offset) yields at most one send effect | `UNIQUE(booking_id, offset_minutes)` + claim state machine + provider idempotency key | Retry/chaos test report |
| I5 | Cancellation window is evaluated in elapsed time on the server clock | Pure function + injected `Clock` | Boundary tests, incl. across a DST change |

---

## 2. Research findings that change or sharpen the PRD

I checked the PRD against how these tools behave today. Items F1–F4 are design defects or gaps in the PRD as written and should be fixed before any code exists.

| # | Finding | Impact on PRD | Decision |
|---|---------|---------------|----------|
| **F1** | `bookings.slot_id UNIQUE` also blocks *re-booking a slot after a cancellation*, because the cancelled row still occupies the unique key. | Data model §8 is wrong for FR5/FR6 combined. | Replace with a **partial** unique index: `UNIQUE (slot_id) WHERE status <> 'cancelled'`. |
| **F2** | `UNIQUE(provider_id, slot_start_utc)` only stops two slots with the *same start*. Slots that start at different times but overlap (rule edits, slot-length change, a materializer bug on a DST day) are still allowed. Postgres exclusion constraints (`btree_gist` + `tstzrange` + `&&`) enforce true non-overlap. Lifecycle rows (held/cancelled) must be excluded via a partial predicate or they keep blocking the range. | PRD relies on uniqueness alone. | Keep the unique constraint **and** add an exclusion constraint as defence-in-depth. |
| **F3** | Optimistic concurrency (`version`/ETag, problem statement §7.4.1) does not protect *creation*; it protects *state transitions* (cancel vs complete vs no-show, retries). | PRD lists `version` but never says where it is used. | Creation: compare-and-set on `slots.status` + unique index. Transitions: `If-Match` / `version` check. |
| **F4** | Problem statement §7.3 calls for **idempotent booking writes under retry**; the PRD API has no idempotency mechanism. The `Idempotency-Key` header is still an IETF Internet-Draft (not an RFC), but is a de facto industry pattern. | Missing requirement. | Add `Idempotency-Key` on `POST /bookings`, stored in the same transaction as the booking. |
| **F5** | BullMQ deduplication and custom `jobId` only protect while the job/dedup record exists in Redis (Simple mode lasts until completion/failure; job records are usually pruned). Redis is also lossy unless configured. | PRD §9.4 puts idempotency in BullMQ. | **Postgres is the source of truth for reminders**; BullMQ is only the delivery timer. Add a reconciler. |
| **F6** | BullMQ needs Redis with `maxmemory-policy noeviction` and AOF persistence; workers need `maxRetriesPerRequest: null`; don't share the instance with a cache. | Not in PRD. | Dedicated queue Redis with these settings, verified in CI. |
| **F7** | "Managed scheduler" (§9.5) maps cleanly onto BullMQ **Job Schedulers** (`upsertJobScheduler`, idempotent per deploy, stable IDs, one job per tick regardless of instance count). BullMQ v6 removed the legacy repeatable API and `debounce`; `@nestjs/bullmq` 12 is out. | Clarifies §9.5. | Use `upsertJobScheduler` only. Ban `node-cron` / `@nestjs/schedule` by lint rule. |
| **F8** | **Temporal is now standard**: Stage 4 in March 2026 (ES2026), unflagged in Node 26, shipping in Chrome 144+/Firefox 139+, but **Safari stable still lacks it**. Node 26 becomes LTS on 28 Oct 2026; Node 24 goes to maintenance 20 Oct 2026. | PRD names no time library. | Use Temporal **server-side only**. Browser formats with `Intl.DateTimeFormat` + IANA zone, so no polyfill in the client bundle. |
| **F9** | A Server Component cannot see the browser timezone at request time (PRD §9 assumes it can). | Design gap. | Client sets a `tz` cookie (validated); server reads cookie or `?tz=`. API returns UTC instants; formatting happens after caching. |
| **F10** | Providers such as Resend offer idempotency keys, retained 24 h. True exactly-once across a network is impossible; *at-least-once delivery + idempotent effect* is the honest, achievable claim. | PRD says "once and only once". | Re-word the metric: "0 duplicate reminders across simulated retries", enforced at DB + provider boundary. Cap retry window well under 24 h. |
| **F11** | Recurrence libraries can mishandle DST gaps (a current open issue in `rrule-temporal` shows a nonexistent 02:30 being shifted and still counted as an occurrence). | Availability is "simple weekly", so a library is unnecessary risk. | Write a small materializer in `@chronos/time`; do not adopt an RRULE library. |
| **F12** | Stack has moved: NestJS 12 (ESM-ready packages, Standard Schema validation, Vitest default for ESM projects), Next.js 16.3.x (Active LTS, frequent security patches), Prisma 7.x / Drizzle 0.45.x (1.0 in beta). | Versions unspecified. | Pin exact versions in ADRs; automated dependency updates from day one. |

---

## 3. Decision records (write these in Phase 0)

| ADR | Decision | Default | Revisit if |
|-----|----------|---------|-----------|
| 001 | Runtime | Node 26 (LTS from 28 Oct 2026). `@chronos/time` imports Temporal from one module that uses `globalThis.Temporal` and falls back to `temporal-polyfill`, so Node 24 also works. | Native Temporal bug found |
| 002 | Browser time display | `Intl.DateTimeFormat` with IANA zone; no Temporal in the client | Safari ships Temporal |
| 003 | DB access | Drizzle (or Prisma 7) for CRUD; **constraints and the booking transaction are hand-written SQL migrations / SQL statements** | ORM cannot round-trip `EXCLUDE`/partial indexes (verify in Phase 2; a CI test asserts the constraints exist in `pg_constraint`/`pg_indexes`) |
| 004 | Concurrency control | DB constraints + compare-and-set, **no app-level locks** | n/a |
| 005 | Reminders | Postgres-authoritative rows + BullMQ delayed jobs + reconciler | n/a |
| 006 | DST policy | See §6.4 | Product feedback |
| 007 | Cancellation window | Elapsed time: `now ≤ slot_start_utc − window` | n/a |
| 008 | Validation / contracts | Shared Standard Schema (Zod or Valibot) in `packages/contracts` | n/a |
| 009 | Test runner | Vitest (+ Testcontainers, Playwright, k6) | n/a |
| 010 | Notification provider | Email via Resend (idempotency key supported); SMS behind the same interface, stretch | Provider change |

---

## 4. Target architecture

```
Browser ──► Next.js 16 (Server Components: availability list; Client Component: booking form)
               │  reads tz cookie, formats UTC instants with Intl
               ▼
           NestJS 12 API  ── modules: providers · availability · bookings · notifications · health
               │                         │
               │ SQL (txn)               │ enqueue (after commit)
               ▼                         ▼
         PostgreSQL ◄──────────────  BullMQ (dedicated Redis: AOF, noeviction)
   (source of truth: slots, bookings,        ▲
    reminder_jobs, idempotency_keys)         │
               ▲                         Worker process (same codebase, separate entrypoint)
               └──── reconciler + materializer + auto-complete run as Job Schedulers
```

**Monorepo** (Turborepo + pnpm, per the blueprint checklist):

```
apps/api            NestJS 12 (HTTP entry + worker entry)
apps/web            Next.js 16.3.x
packages/time       @chronos/time: pure Temporal logic, zero I/O
packages/db         SQL migrations, typed queries, test helpers
packages/contracts  shared schemas + error codes
tools/loadtest      k6 scripts + invariant checker
docs/adr, docs/evidence, docs/runbooks
```

**Golden rule:** Postgres never converts time zones for business logic. It stores and compares instants only. This removes tzdata drift between Postgres, Node ICU, and browsers as a source of bugs. Log `process.versions.tz` at boot for diagnostics.

---

## 5. Revised data model

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL,                       -- IANA id, validated in app
  slot_minutes int NOT NULL CHECK (slot_minutes BETWEEN 5 AND 240),
  cancellation_window_hours int NOT NULL DEFAULT 24 CHECK (cancellation_window_hours >= 0),
  reminder_offsets_minutes int[] NOT NULL DEFAULT '{1440,60}'
);

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),  -- ISO, 1 = Monday
  start_time time NOT NULL,                     -- wall-clock in provider tz
  end_time   time NOT NULL,
  CHECK (end_time > start_time)                 -- overnight windows are out of scope
);

CREATE TABLE slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id),
  slot_start_utc timestamptz NOT NULL,
  slot_end_utc   timestamptz NOT NULL,
  display_tz text NOT NULL,                     -- provider IANA tz at generation time (FR9)
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','booked','blocked')),
  CONSTRAINT slots_end_after_start CHECK (slot_end_utc > slot_start_utc),
  CONSTRAINT slots_provider_start_uniq UNIQUE (provider_id, slot_start_utc),
  CONSTRAINT slots_no_overlap
    EXCLUDE USING gist (provider_id WITH =, tstzrange(slot_start_utc, slot_end_utc, '[)') WITH &&)
);
CREATE INDEX slots_open_idx ON slots (provider_id, slot_start_utc) WHERE status = 'open';

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES slots(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  client_timezone text NOT NULL,                -- snapshot, used to render reminders
  status text NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked','completed','cancelled','no_show')),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
-- F1 fix: a cancelled booking must not block re-booking the slot
CREATE UNIQUE INDEX bookings_one_live_per_slot ON bookings (slot_id) WHERE status <> 'cancelled';

CREATE TABLE reminder_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  offset_minutes int NOT NULL,
  fire_at_utc timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','sending','sent','cancelled','skipped','failed')),
  attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  UNIQUE (booking_id, offset_minutes)
);
CREATE INDEX reminder_due_idx ON reminder_jobs (fire_at_utc) WHERE status IN ('scheduled','sending');

CREATE TABLE idempotency_keys (
  client_id uuid NOT NULL REFERENCES clients(id),
  key text NOT NULL,
  request_hash text NOT NULL,
  response_status int,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, key)
);
```

Deviations from the PRD: `reminder_jobs` uses `offset_minutes` (configurable) instead of `offset_type`; adds `fire_at_utc`, a status machine and lock; adds `client_timezone`, `display_tz`, `idempotency_keys`, and the exclusion constraint.

---

## 6. Critical flows

### 6.1 Create booking: `POST /bookings` (with `Idempotency-Key`)

```
BEGIN                                            -- READ COMMITTED is sufficient
 1. INSERT idempotency_keys (client_id, key, request_hash) ON CONFLICT DO NOTHING
      0 rows → SELECT stored row
               hash differs  → 422 idempotency_key_reuse
               hash matches  → replay stored response (Idempotent-Replayed: true), stop
 2. UPDATE slots SET status='booked'
      WHERE id=$slot AND status='open' AND slot_start_utc > $now      -- compare-and-set
      0 rows → 409 slot_unavailable
 3. INSERT bookings (...)                        -- 23505 on the partial unique index → 409 (backstop)
 4. INSERT reminder_jobs for each offset where fire_at_utc > $now   -- late bookings skip elapsed offsets
 5. UPDATE idempotency_keys SET response_status, response_body
COMMIT
after commit: enqueue BullMQ delayed jobs (best effort; reconciler repairs misses)
```

Why this is race-safe: two concurrent requests for one slot both reach step 2; the second blocks on the row lock until the first commits, re-evaluates `status='open'`, matches zero rows, and returns 409. Step 3's unique index and the `slots` exclusion constraint are independent last-line guards. Because the idempotency insert is in the same transaction, a retried request either sees the committed result or waits for it.

### 6.2 Cancel: `POST /bookings/:id/cancel` (requires `If-Match: <version>`)

```
BEGIN
 SELECT booking + slot + provider FOR UPDATE
 checks: caller owns booking · status='booked' (else 409) · version matches (else 412)
         now ≤ slot_start_utc − cancellation_window (else 403 with the deadline in the body)
 UPDATE bookings SET status='cancelled', version=version+1, cancelled_at=$now WHERE id AND version=$v
 UPDATE slots SET status='open' WHERE id=$slot AND slot_start_utc > $now
 UPDATE reminder_jobs SET status='cancelled' WHERE booking_id AND status IN ('scheduled','sending')
COMMIT
after commit: remove delayed BullMQ jobs (best effort; worker re-checks state anyway)
```

### 6.3 Reminder worker

```
job payload = { reminderId }                     -- never trust payload for content
 1. Claim: UPDATE reminder_jobs
             SET status='sending', attempts=attempts+1, locked_until=now()+interval '2 min'
             WHERE id=$1 AND (status='scheduled' OR (status='sending' AND locked_until < now()))
             RETURNING ...
      0 rows → duplicate or already handled → ack, exit
 2. Load booking; if status ≠ 'booked' → mark 'cancelled', exit
 3. Render in booking.client_timezone; send with provider idempotency key "reminder/{bookingId}/{offset}"
 4. UPDATE status='sent', sent_at, provider_message_id
 Errors: classify. Transient (network, 5xx, 429) → throw, BullMQ retries with backoff, capped well under 24 h.
         Permanent (4xx, invalid address) → status='failed', no retry.
```

**Reconciler** (Job Scheduler, every minute): finds `scheduled` rows due within the next N minutes with no live BullMQ job, and `sending` rows with expired locks, and (re-)enqueues them. This makes Redis data loss a delay, not a lost reminder.

### 6.4 DST policy (ADR-006): the heart of the timezone problem

- **Storage:** UTC `timestamptz` + IANA zone name. Never store offsets like `-05:00` as the zone.
- **Materialization:** for each provider-local date, resolve `start_time`/`end_time` with the `compatible` rule into real instants, then **step by `slot_minutes` in elapsed time** (Instant arithmetic), dropping slots that don't fit before the window end.
  - *Spring-forward:* a 02:00–05:00 window yields a 2-hour real window (the missing hour has no slots). Nothing is silently shifted into a duplicate slot.
  - *Fall-back:* a 01:00–03:00 window is 3 real hours; the repeated hour is offered twice. The UI must show the offset/zone abbreviation on ambiguous times (EDT vs EST) so clients can tell them apart. (Open question Q2: suppress the repeated hour instead.)
- **User-supplied wall-clock times** (if any ever appear in an API) are resolved with `disambiguation: 'reject'` and surfaced as an error, never guessed.
- **Durations** (cancellation window, reminder offsets) are *elapsed* time: subtract from the slot's instant. "24 hours before" means 24 real hours even across a clock change.
- **Provider timezone change:** open future slots are regenerated; booked slots never change (their instants are the truth).
- **Cross-zone example worth testing:** a client in India (IST, UTC+5:30, no DST) booking a New York provider sees a 9.5 h gap in summer and a 10.5 h gap in winter. The same provider-local 9:00 appointment lands at a different IST time before and after the US clock change, which is correct and must be tested.

---

## 7. Phases

Effort assumes one developer working full-time; roughly double the calendar time if part-time.

### Mapping to PRD milestones

| PRD milestone | Where it lives |
|---|---|
| M1 Walking skeleton | Phase 0 + end of Phase 2 |
| M2 Concurrent booking correctness | Phase 4 |
| M3 Timezone correctness | **Phase 1 (moved first)** + display in Phase 7 |
| M4 Reminder pipeline | Phase 6 |
| M5 Cancellation + e2e | Phases 5, 7, 8 |

Timezone work moves *ahead* of concurrency because slot generation is the riskiest logic, it is pure (no infra needed), and every later phase depends on it being right. The PRD's own risk section says to treat DST test design as a dedicated task, so it gets its own phase.

---

### Phase 0: Foundations and decisions (3–4 days)

**Tasks**
- Turborepo + pnpm workspace; Node 26 pinned (`.nvmrc`, `engines`); TypeScript strict; ESLint; Vitest; Renovate/Dependabot.
- `docker-compose`: Postgres (current major) and a **dedicated Redis** with `appendonly yes`, `appendfsync everysec`, `maxmemory-policy noeviction`.
- Scaffold `apps/api` (NestJS 12), `apps/web` (Next.js 16.3.x, latest patched), `packages/*`.
- `Clock` abstraction (`now(): Instant`), injected everywhere.
- ESLint rules: forbid `new Date(`, `Date.now()`, `moment`, `dayjs`, `date-fns-tz`, `node-cron`, `@nestjs/schedule` outside `clock.ts`/adapters.
- CI: lint → typecheck → unit → integration (Postgres + Redis services) → build. Run unit tests under `TZ=UTC`, `TZ=Asia/Kolkata`, `TZ=America/Los_Angeles`.
- Write ADR-001…010 (short).
- Dev-only auth stub (seeded provider, header-based client identity). Real auth in Phase 7.

**Exit criteria:** CI green on the empty skeleton; `docker compose up` gives working infra; a CI check fails if Redis isn't `noeviction`; ADRs merged.

---

### Phase 1: Time core, `@chronos/time` (5–6 days) ★ correctness foundation

**API surface (pure functions, no I/O)**
- `generateSlots({ tz, slotMinutes, rules, fromDate, toDate }) → { startUtc, endUtc }[]`
- `resolveWallClock(plainDateTime, tz, policy)`: `policy` is a **required** argument, no default.
- `subtractElapsed(instant, minutes)`, `isCancellable(now, slotStart, windowHours)`, `reminderFireTimes(slotStart, offsets, now)`
- `assertValidTimeZone(id)`

**Test design (the dedicated task the PRD asks for)**
- **Fixtures derived, not hand-typed:** use Temporal's time-zone transition lookup to find real spring-forward/fall-back instants for each zone and year, then assert on them. This survives tzdata updates.
- **Zone matrix:** `America/New_York`, `Europe/London`, `Europe/Berlin`, `Australia/Sydney`, `Australia/Lord_Howe` (30-minute DST shift), `Asia/Kolkata` (+5:30, no DST), `Asia/Kathmandu` (+5:45), `America/Sao_Paulo` (DST abolished 2019), `Africa/Casablanca` (irregular Ramadan offset), `Europe/Dublin` (tzdata models winter as "negative DST"), `Pacific/Apia` (skipped a calendar day in 2011).
- **Cases per zone:** window entirely before/after a transition; window straddling the gap; window straddling the overlap; window starting *inside* the gap; slot count on transition days; day with 23 h / 25 h; year boundary; leap day.
- **Property tests (fast-check):** for random zone/date/rules → slots never overlap; all lie within the resolved window; every `start_utc` round-trips UTC → local → UTC; slot count = floor(real window minutes / slot length).
- **Process-TZ independence:** entire suite runs under three `TZ` env values with identical results.
- **Mutation testing (Stryker):** target ≥ 80 % on this package; it is the fastest way to prove the tests would catch a DST regression.
- Auto-generate `docs/evidence/dst-matrix.md` from the test run (zone × transition × expected vs actual).

**Exit criteria:** 100 % of matrix rows pass; branch coverage 100 % for the package; evidence file generated by CI.

---

### Phase 2: Schema, persistence and walking skeleton (4–5 days)

**Tasks**
- SQL migrations for §5 (hand-written for constraints).
- Testcontainers Postgres harness; tests that hit constraints **directly with raw SQL over two connections**: duplicate slot start, overlapping slot, second live booking, re-booking after cancel (must succeed).
- CI "schema guard" test asserting the exclusion constraint and partial indexes exist (protects against ORM migration drift).
- Verify in a test that `INSERT … ON CONFLICT DO NOTHING` (no conflict target) also swallows exclusion-constraint conflicts in your Postgres version; the materializer depends on it.
- Repositories + seed script (1 provider, rules, slots).
- Thin vertical slice: `GET /providers/:id/availability` and a transactional `POST /bookings` against seeded slots. Manual demo via curl.

**Exit criteria:** all constraint tests pass; walking skeleton demo works end to end; migrations apply cleanly from empty and are re-runnable in CI.

---

### Phase 3: Availability and materialization (5 days)

**Tasks**
- Providers + availability-rule CRUD (validate zone, non-overlapping rules per day).
- Materializer as a **BullMQ Job Scheduler** (`upsertJobScheduler`, hourly top-up to keep a 60-day horizon, plus an on-demand run when rules change, plus start-up catch-up). Fully idempotent: re-running yields zero new rows.
- `reconcile(provider)` on rule/timezone change: insert missing slots, delete **open** slots that no longer match, never touch booked ones (warn provider if booked slots fall outside new rules).
- Availability query: index-backed, date-range paginated; response = UTC instants + provider zone; short `Cache-Control` + ETag (stale availability only ever causes a clean 409, never a double booking).
- Performance harness: seed realistic volume (e.g. 200 providers × 60 days), run k6, record p50/p95/p99.

**Exit criteria:** p95 < 200 ms for the 60-day query on the harness (with results committed to `docs/evidence`); materializer idempotence test; rule-edit test; DST-day materialization test against the real DB.

---

### Phase 4: Booking core and concurrency proof (5–6 days) ★ headline claim

**Tasks**
- Implement §6.1 exactly, including `Idempotency-Key` handling, error contract (`201`, `409 slot_unavailable`, `422 idempotency_key_reuse`, `400`), and mapping of Postgres codes `23505` / `23P01` to clean 409s.
- Idempotency-key retention job (purge after e.g. 7 days).
- **Integration concurrency tests:** `Promise.all` of N clients on one slot using separate pool connections; assert exactly 1 success and N−1 `409`.
- **Load test (k6):** many virtual users × many slots × repeated rounds, against **two API instances** behind a proxy (proves the guarantee isn't an in-process lock).
- **Invariant checker** (SQL, run after every load test, independent of API responses):
  ```sql
  SELECT slot_id, count(*) FROM bookings WHERE status <> 'cancelled' GROUP BY slot_id HAVING count(*) > 1;
  ```
  Must return zero rows; also confirm `slots.status='booked'` count equals live bookings.
- **Fault injection:** kill the connection mid-transaction; retry the same `Idempotency-Key` in parallel (exactly one booking, identical response).
- Record hardware, Postgres settings, N, rounds, raw results.

**Exit criteria:** 0 double bookings across the documented load run (e.g. ≥ 500 concurrent requests per slot, many rounds); idempotent-retry tests pass; report in `docs/evidence/concurrency-report.md`.

---

### Phase 5: Lifecycle and cancellation window (3–4 days)

**Tasks**
- Booking state machine: `booked → completed | cancelled | no_show`; illegal transitions rejected (table-driven tests).
- Cancel per §6.2 with `If-Match`/`version`; slot reopens; re-booking the freed slot works (regression test for F1).
- Provider actions: mark `completed` / `no_show` (version-checked).
- Auto-complete Job Scheduler: after `slot_end + grace`, `booked → completed` unless already set.
- **Boundary tests** with the injected clock: exactly at the window edge (allowed), 1 ms after (denied); a 24 h window spanning a DST change (still 24 real hours); cancel racing complete (one wins, version conflict is 412).

**Exit criteria:** all transitions and boundaries covered; no path leaves a slot `booked` without a live booking or vice versa (invariant query added to CI).

---

### Phase 6: Reminder pipeline (5–6 days)

**Tasks**
- `reminder_jobs` written in the booking transaction; enqueue after commit with deterministic job id `reminder:{bookingId}:{offset}` and `delay = fire_at − now`.
- Worker per §6.3; provider adapter interface with Resend email implementation (idempotency key) and a fake provider for tests. SMS behind the same interface (stretch).
- Error classification (transient vs permanent), exponential backoff, attempt cap, retry window capped well under the provider's 24 h idempotency retention.
- Reconciler Job Scheduler (§6.3); cancelled-booking cleanup; late-booking rule (offsets already in the past are `skipped`).
- Metrics: `reminder_sent_total`, `reminder_duplicate_suppressed_total`, `reminder_lag_seconds`.
- **Tests:**
  - Fake provider counts sends per idempotency key; force worker crashes between "send" and "mark sent", duplicate enqueue, and concurrent workers → count per (booking, offset) never exceeds 1 at the DB claim, and the provider sees at most one accepted send per key.
  - `FLUSHALL` Redis mid-run → reconciler restores all pending reminders.
  - Cancellation just before fire time → nothing sent.
  - Fire-time correctness across DST (24 h before an appointment on the morning of a clock change).

**Exit criteria:** 0 duplicate reminders across a simulated-retry run of N bookings × K forced retries; Redis-loss recovery test passes; report in `docs/evidence/reminder-report.md`.

---

### Phase 7: Web application (6–7 days)

**Tasks**
- Real auth (email magic link or a managed provider; ADR). Provider vs client roles; ownership checks.
- Timezone handling: tiny client script sets a validated `tz` cookie (`Intl.DateTimeFormat().resolvedOptions().timeZone`); Server Components read it (fallback `?tz=`, then UTC with a visible label); user can change zone manually.
- **Server Components:** availability list, my bookings. **Client Component boundary:** booking form, cancel button (sends `Idempotency-Key`, handles `409`/`412`/`403` with clear messages).
- Provider dashboard: weekly rule editor, timezone, cancellation window, upcoming bookings, mark completed/no-show.
- Display rules: always show zone abbreviation/offset on times; annotate ambiguous fall-back times.
- Accessibility pass; empty/loading/error states.
- **Playwright e2e** with browser `timezoneId` set to `Asia/Kolkata`, `America/New_York`, `Pacific/Auckland`: same booking displays correct local times in each.

**Exit criteria:** full book → remind → cancel journey passes e2e in three browser time zones.

---

### Phase 8: Hardening, observability and evidence (4–5 days)

**Tasks**
- Observability: structured logs (`booking_id`, `slot_id`, idempotency key), OpenTelemetry traces (NestJS 12 ships a native observability SDK worth evaluating), metrics: `booking_conflicts_total`, booking latency, materializer lag, reminder lag. Alerts: reminder lag, DLQ growth, materializer horizon < 45 days.
- Security: rate-limit `POST /bookings`; authorization tests (client can't cancel others' bookings); input validation on `tz`; PII minimization in logs. Pin Next.js to the latest patched 16.3.x (the project has been issuing frequent security releases).
- Runbooks: Redis loss, stuck reminders, materializer backfill, tzdata update procedure.
- Nightly CI: load test + DST suite + reminder chaos suite.
- Documentation: README with architecture diagram, ADRs, evidence pack index, one-page "how we guarantee X" per invariant.
- Deployment (single environment is enough) with Redis persistence verified.

**Exit criteria:** all three evidence reports reproducible from CI; runbooks reviewed; fresh clone → `pnpm i && docker compose up && pnpm test` works.

---

### Stretch backlog (not in scope unless time allows)

Reschedule (atomic cancel+book), SMS via Twilio-class provider, `.ics` calendar invites, multiple providers/services with variable durations, waitlist for cancelled slots, provider-side blocked time.

---

## 8. Test strategy summary

| Layer | Tooling | What it proves |
|---|---|---|
| Unit / property | Vitest, fast-check, Stryker | Time logic (I3, I5), slot generation |
| DB constraint | Testcontainers, raw SQL over 2+ connections | I1, I2 hold even if app code is wrong |
| Integration | Nest testing + Postgres + Redis | Booking transaction, idempotency, state machine |
| Concurrency / load | `Promise.all` harness, k6 across 2 API instances, SQL invariant checker | I1 under load |
| Chaos | Kill worker mid-send, `FLUSHALL` Redis, drop DB connection | I4, recovery paths |
| Process-TZ matrix | `TZ=UTC / Asia/Kolkata / America/Los_Angeles` in CI | Server timezone is irrelevant |
| E2E | Playwright with `timezoneId` per browser context | Display correctness end to end |

CI stages: PR → lint, typecheck, unit, integration, schema guard. Main → e2e. Nightly → load, DST matrix, chaos.

---

## 9. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| DST tests shallow or hand-typed and go stale | Med | High | Derive fixtures from tz transitions; property tests; TZ matrix; mutation score gate |
| Constraint silently dropped by ORM migration | Med | High | SQL-first migrations; CI schema guard on `pg_constraint`/`pg_indexes` |
| Redis loss drops reminders | Med | High | AOF + `noeviction`; DB is source of truth; reconciler; FLUSHALL chaos test |
| Duplicate reminder after crash between send and mark | Med | Med | Provider idempotency key + DB claim; retry window ≪ 24 h |
| Cancelled/blocked rows keep blocking ranges | Med | Med | Partial predicates; regression tests for re-booking |
| tzdata drift (Node vs browser vs Postgres) | Low | Med | Postgres never converts zones; log `process.versions.tz`; runbook for updates |
| Node 26 is "Current" until 28 Oct | Low | Low | Single Temporal import module with polyfill fallback; CI also runs Node 24 |
| Load-test claim challenged | Med | Med | Assert via SQL invariants, not API responses; publish hardware, config, raw output |
| Fall-back hour confuses users | Med | Low | Show offset/abbreviation; decision Q2 |
| Next.js/NestJS security churn | High | Med | Automated updates, pinned patched versions |
| Scope creep (SMS, reschedule) | High | Med | Stretch backlog; phase exit criteria are gates |

---

## 10. Timeline and critical path

| Phase | Days | Depends on |
|---|---|---|
| 0 Foundations | 3–4 | none |
| 1 Time core | 5–6 | 0 |
| 2 Schema + skeleton | 4–5 | 0 (parallel with 1) |
| 3 Availability | 5 | 1, 2 |
| 4 Booking + concurrency | 5–6 | 2, 3 |
| 5 Lifecycle + cancellation | 3–4 | 4, 1 |
| 6 Reminders | 5–6 | 4, 5 |
| 7 Web app | 6–7 | 3, 4 (start once API contracts stabilize; overlaps 5–6) |
| 8 Hardening + evidence | 4–5 | all |

**Total ≈ 40–48 working days** (about 8–10 weeks full-time; 4–5 months part-time). **Critical path:** 0 → 1 → 3 → 4 → 5 → 6 → 8. Phases 1 and 2 can run in parallel; Phase 7 can overlap 5–6.

---

## 11. Open questions (answers will tighten the plan)

1. **Slot model:** one fixed slot length per provider (assumed here) or multiple service durations?
2. **Fall-back hour:** offer the repeated hour twice (assumed) or suppress it?
3. **Provider-initiated cancellation:** always allowed, with client notification? (PRD only defines the client window.)
4. **Auth:** magic-link, OAuth provider, or managed service?
5. **Channels for v1:** email only, or SMS too?
6. **Hosting target:** affects Redis persistence, worker process model, and load-test environment.
7. **Node version:** go straight to Node 26, or start on 24 and let the polyfill fallback cover Temporal?
8. **Time budget / team size:** lets me convert §10 into dated milestones.

---

## 12. Sources consulted (checked 23 Sep 2026)

- BullMQ: deduplication, job schedulers & repeat options, v5→v6 migration, going-to-production, connections: https://docs.bullmq.io
- `@nestjs/bullmq` 12.0.0: https://www.npmjs.com/package/@nestjs/bullmq · NestJS 12 release: https://github.com/nestjs/nest/releases
- PostgreSQL range types & exclusion constraints: https://www.postgresql.org/docs/current/rangetypes.html · btree_gist pattern (Neon): https://neon.com/docs/extensions/btree_gist · partial-constraint lifecycle notes: https://dev.to/akincskn/i-solved-double-booking-without-locks-using-one-postgresql-constraint-209m
- Temporal: Stage 4 / Node 26 history: https://nodesource.com/blog/javascript-temporal-history-nodejs-26 · disambiguation semantics: https://github.com/tc39/proposal-temporal/blob/main/docs/zoneddatetime.md · Safari gap: https://web-platform-dx.github.io/web-features-explorer/features/temporal/ · polyfills: https://github.com/fullcalendar/temporal-polyfill
- DST recurrence bug example: https://github.com/ggaabe/rrule-temporal/issues/141
- Node.js release schedule and Node 26: https://nodejs.org/en/blog/release/v26.0.0 · https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule
- Next.js releases and security updates: https://nextjs.org/blog · https://github.com/vercel/next.js/releases
- ORM landscape (Prisma 7.x / Drizzle 0.45.x): https://makerkit.dev/blog/tutorials/drizzle-vs-prisma
- Idempotency-Key IETF draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- Resend idempotency keys: https://resend.com/docs/dashboard/emails/idempotency-keys

*Not independently verified and flagged in the plan for a Phase 2/3 check: ORM round-tripping of `EXCLUDE` constraints, `ON CONFLICT DO NOTHING` behaviour with exclusion constraints on your Postgres version, and `@nestjs/bullmq` 12's BullMQ v6 peer range.*
