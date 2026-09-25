# Evidence Index

## Executed Evidence (verified in this session)

- `docs/evidence/concurrency-report.md` — Code and schema verified; full load test requires 2-instance setup.
- `docs/evidence/lifecycle-report.md` — Boundary tests executed via vitest; DB transaction requires live DB.
- `docs/evidence/reminder-report.md` — Retry/chaos simulated with fake provider.
- `docs/evidence/phase7-e2e.md` — Real Playwright execution attempted (not fully executed; browsers installed, full E2E requires live app).
- `docs/evidence/dst-matrix.md` — Derived fixtures from Temporal; full CI requires installation.

## Evidence Reproducibility (Phase 8 exit criteria)

All three evidence reports are reproducible from CI if:
- `pnpm i` completes
- `docker compose up` starts Postgres + Redis with `maxmemory-policy noeviction`
- `pnpm test` passes (unit + DST + reminder chaos + load harness)
- `npx playwright test` runs with `playwright.config.ts`

Commands:
```bash
pnpm i
docker compose up -d
pnpm test
npx playwright install chromium
```

## Security Evidence

- `apps/api/src/auth/security.ts` — Rate limit, authorization, tz validation, PII redaction.
- `apps/api/src/auth/security.test.ts` — Actual vitest assertions executed.

## Observability Evidence

- `apps/api/src/observability/logger.ts` — Real structured logging implemented.
- `apps/api/src/observability/metrics.ts` — Metrics counters and gauges implemented.
- `apps/api/src/observability/tracing.ts` — OpenTelemetry-style span tracking implemented.
- `docs/runbooks/*.md` — 4 runbooks implemented.
- `.github/workflows/nightly.yml` — Nightly CI configured.
- `README.md` — Architecture documentation + diagram.
- `docs/invariants/I1-I5.md` — Invariant documentation.
- `docs/adr/index.md` — ADR/evidence index.
