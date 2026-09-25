# tzdata-Update Runbook

**Last reviewed:** 2026-09-25
**Owner:** Chronos platform team

## Problem
tzdata changes (IANA releases) shift DST transition dates, affecting materialization and reminder calculations.

## Procedure
1. Update Node.js `tzdata` package: `pnpm add tzdata`.
2. Update Postgres timezone data: `apt-get install --only-upgrade tzdata` (in container) or use Postgres image with latest tzdata.
3. Re-run DST matrix tests under `TZ=UTC`, `TZ=Asia/Kolkata`, `TZ=America/Los_Angeles`.
4. Verify: all zone-matrix rows pass; slot counts correct on transition days (23h/25h days).
5. Re-run `docs/evidence/dst-matrix.md` generation from test run.

## Design Rationale (ADR-006)
- Postgres stores/compares instants only; never converts time zones for business logic.
- Node and browser use IANA zone names + `Intl.DateTimeFormat`; browser formats with `Intl.DateTimeFormat` + IANA zone.
- `process.versions.tz` logged at boot for diagnostics (golden rule).

## Verification
Run `pnpm test:tz` (three TZ values) after tzdata update; confirm identical results.
