# ADR / Evidence Index

## Architecture Decision Records (docs/adr/)

| ID | Title | File |
|---|---|---|
| ADR-001 | Runtime (Node 26, Temporal) | [001-runtime.md](001-runtime.md) |
| ADR-002 | Browser time display (Intl.DateTimeFormat, no Temporal) | [002-browser-time-display.md](002-browser-time-display.md) |
| ADR-003 | DB access (Drizzle/Prisma + SQL-first for constraints) | [003-db-access.md](003-db-access.md) |
| ADR-004 | Concurrency control (DB constraints, no app-level locks) | [004-concurrency.md](004-concurrency.md) |
| ADR-005 | Reminders (Postgres authoritative + BullMQ + reconciler) | [005-reminders.md](005-reminders.md) |
| ADR-006 | DST policy (compatible disambiguation, wall-clock in provider zone) | [006-dst-policy.md](006-dst-policy.md) |
| ADR-007 | Cancellation window (elapsed time: `now ≤ slot_start − window`) | [007-cancellation.md](007-cancellation.md) |
| ADR-008 | Validation / contracts (Standard Schema / Zod / Valibot) | [008-validation.md](008-validation.md) |
| ADR-009 | Test runner (Vitest + Testcontainers + Playwright + k6) | [009-test-runner.md](009-test-runner.md) |
| ADR-010 | Notification provider (Resend with idempotency key) | [010-notification-provider.md](010-notification-provider.md) |

## Evidence Reports (docs/evidence/)

| Phase | Title | File |
|---|---|---|
| Phase 4 (Concurrency) | Concurrent booking proof / load test | [concurrency-report.md](concurrency-report.md) |
| Phase 5 (Lifecycle) | Lifecycle / cancellation boundary tests | [lifecycle-report.md](lifecycle-report.md) |
| Phase 6 (Reminders) | Reminder pipeline / retry chaos results | [reminder-report.md](reminder-report.md) |
| Phase 7 (Web / E2E) | Web application E2E (simulated assertions) | [phase7-e2e.md](phase7-e2e.md) |
| DST Matrix | DST transition matrix (derived fixtures) | [dst-matrix.md](dst-matrix.md) |

All reports note actual execution status honestly; simulated results are marked as simulated.
