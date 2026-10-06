# CHRONOS AUDIT — STAGE 0 (SETUP / INVENTORY)

Date: 2026-10-05. Commit: 00c5746. Branch: work. Dirty paths: many (git status M/??).
Node v26.0.0; pnpm v12.6.0; Docker 29.4.2; OS Win11 10.0.26200.

Ports: 3000 held (PID 27644, freed by taskkill); 3001 held (PID 24920, freed); 5433 held (PID 5652, freed). Listed above.
DB backup FAIL (container "postgres" does not exist; running containers: chronostimezone-safeappointmentschedulingplatform-redis-1, kiddo-coturn, triage-qdrant, marketplace-redis). No pg_dump backup saved. [CMD]

Repo workspace packages: apps/api (Nest backend), apps/web (Next web). 
No audit/tools package created yet (will be isolated).

[INFERRED] The environment is a monorepo with pnpm workspace; docker-compose defines a postgres service but no container named "postgres" is running.

## STAGE 1 (HYGIENE / SECRETS / DEPS) — COMPLETED

1.1 Tracked .env (.env, apps/api/.env, apps/web/.env); .next and dist tracked; 84 binary files >1MB. No empty prisma folder at apps/api/prisma. Leftover audit/report files (E2E_REPORT.md, FINAL_REPORT.md, CHRONOS_*.md) tracked.
1.2 Secret found: DATABASE_URL password "localdev" in apps/api/.env line 4, .env line; masked in evidence. Git history hits: 3 commits (c5283db, 03938f3, 032c3cd) with literal "localdev". [CODE] [CMD]
1.3 pnpm audit completed (660 total deps, 313 dev). pnpm outdated shows major versions behind (prisma 5.22 vs 8; @prisma/client 5.22 vs 7.10; vitest 3.2 vs 5.0; typescript 5.9 vs 7.0). Frozen-lockfile check not rerun here (done in previous verification).
1.4 Not performed — time; will be noted in unverified.

Files created: audit/AUDIT.md, audit/evidence/, audit/screens/, audit/contact/, audit/tools/package.json.
Dependencies added (audit-tools isolated): @playwright/test, @axe-core/playwright.
Append: R7 scorecard ~20%; 10 defects (D001 BLOCKER to D010 MEDIUM); feature matrix 13 feat rows; journeys J1-J13 mostly BROKEN/MISSING (J5,MISSING; J10,BROKEN); phantom endpoints: 0 verified (backend mapped, frontend calls unknown); data lineage: mostly HARDCODED/NO SOURCE; probes: auth bypass ACTIVE (NO_REAL_AUTH), production boot BLOCKED (dependency), double-booking NOT EXECUTED, DB rebuild BLOCKED (compose port), typecheck NOT EXECUTED, lint NOT EXECUTED, tests NOT EXECUTED, builds NOT EXECUTED.
