# Chronos — Timezone-Safe Appointment Scheduling Platform

## Architecture

```
Browser ──► Next.js 16 (Server Components: availability; Client Component: booking form)
               │  reads tz cookie, formats UTC instants with Intl
               ▼
           NestJS 12 API  ── modules: providers · availability · bookings · notifications · health
               │                         │
               │ SQL (txn)             │ enqueue (after commit)
               ▼                         ▼
         PostgreSQL ◄──────────────  BullMQ (dedicated Redis: AOF, noeviction)
   (source of truth: slots, bookings,        ▲
    reminder_jobs, idempotency_keys)         │
               ▲                         Worker process (same codebase, separate entrypoint)
               └──── reconciler + materializer + auto-complete run as Job Schedulers
```

**Monorepo** (Turborepo + pnpm):
- `apps/api` — NestJS 12 HTTP entry + worker entry
- `apps/web` — Next.js 16.3.x
- `packages/time` — `@chronos/time`: pure Temporal logic, zero I/O
- `packages/db` — SQL migrations, typed queries, test helpers
- `packages/contracts` — shared schemas + error codes
- `tools/loadtest` — k6 scripts + invariant checker
- `docs/adr`, `docs/evidence`, `docs/runbooks`, `docs/invariants`

## Five Invariants

| # | Invariant | Enforced by | Evidence |
|---|-----------|-------------|----------|
| I1 | At most one live booking per slot | Partial unique index + compare-and-set on `slots.status` | Load-test report + SQL invariant query |
| I2 | No two slots of one provider overlap in time | `EXCLUDE USING gist` on `tstzrange` | Constraint tests + materializer property tests |
| I3 | Stored times are UTC instants; wall-clock math in exactly one package | `@chronos/time` + lint ban on raw `Date` math | DST matrix report under multiple TZ |
| I4 | Each (booking, reminder offset) yields at most one send effect | `UNIQUE(booking_id, offset_minutes)` + claim state machine + provider idempotency key | Retry/chaos test report |
| I5 | Cancellation window evaluated in elapsed time on server clock | Pure function + injected `Clock` | Boundary tests incl. across DST change |

## Quick Start

```bash
pnpm i
docker compose up
pnpm test
```

## Evidence
- `docs/evidence/dst-matrix.md` — DST transition coverage
- `docs/evidence/concurrency-report.md` — Load test + invariant verification
- `docs/evidence/reminder-report.md` — Retry/chaos results
- `docs/evidence/lifecycle-report.md` — State machine + cancellation boundaries
- `docs/evidence/phase7-e2e.md` — Web app E2E in 3 browser timezones

## Runbooks
- `docs/runbooks/redis-loss.md` — Recovery after Redis data loss
- `docs/runbooks/stuck-reminder.md` — Stuck reminder jobs
- `docs/runbooks/materializer-backfill.md` — Materializer catch-up
- `docs/runbooks/tzdata-update.md` — tzdata update procedure

## CI
- PR → lint, typecheck, unit, integration, schema guard
- Main → e2e
- Nightly → load test, DST matrix, reminder chaos

## ADR Index
- [ADR-001](docs/adr/001-runtime.md) — Runtime
- [ADR-002](docs/adr/002-browser-time-display.md) — Browser time display
- [ADR-003](docs/adr/003-db-access.md) — DB access
- [ADR-004](docs/adr/004-concurrency.md) — Concurrency control
- [ADR-005](docs/adr/005-reminders.md) — Reminders
- [ADR-006](docs/adr/006-dst-policy.md) — DST policy
- [ADR-007](docs/adr/007-cancellation.md) — Cancellation window
- [ADR-008](docs/adr/008-validation.md) — Validation/contracts
- [ADR-009](docs/adr/009-test-runner.md) — Test runner
- [ADR-010](docs/adr/010-notification-provider.md) — Notification provider
