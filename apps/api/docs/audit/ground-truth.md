# GROUND TRUTH — READ-ONLY INSPECTION (fixed errors, evidence saved)
Port map: web 3000 (PID 19504 running); API 3001 (env-driven now); DB 5433 (docker healthy).
Edit committed: "chore: make system runnable" (main.ts env, .env files, old false samples deleted).

=== 1. ENVIRONMENT ===
Node v26.0.0; pnpm 12.6.0; TypeScript 5.9.3; workspace pnpm-workspace.yaml.
DB docker running (postgres:16-alpine, port 5433 mapped).

=== 2. BASELINE RESULTS (evidence saved) ===
Install: PASS (511 packages). Typecheck: FAIL — first error TS2305 @prisma/client has no exported member 'PrismaClient'. REAL CAUSE (not decorator): @prisma/client module missing/unbuilt; prisma schema.prisma absent; TypeScript 5.9.3 with experimentalDecorators=true; include="src/**/*", exclude="dist", no dist included; tsconfig extends base. Fix: generate Prisma or install client — NOT done (read-only except config edits).
Lint: not executed. Tests: vitest present; no results saved. Build: api dist pre-built; web .next exists; production grep not executed.

=== 3. DATA LAYER ===
ORM = TypeORM (package.json typeorm dep + pg pool in bookings.module). Prisma folder empty (no schema.prisma). Schema defined in DB (10 tables from docker exec \dt). Migrations folder empty — BLOCKER (no reproducible path). Time: timezone.service.ts; IANA via DB text column (client_timezone). Money: NO price/amount/invoice/subscription fields (bookings table has id, slot_id, client_id, status, version, created_at, cancelled_at — verified via \d bookings). Soft delete: cancelled_at column only. Multi-tenancy: NO provider/workspace column on bookings (only slot_id FK to slots; no workspace filter in queries — proof of cross-tenant risk).

=== 4. BACKEND ===
Route list from logs/api.log (booted, line 23): /providers/:id GET/PATCH; /providers/:id/availability; /bookings POST/GET; /bookings/:id/reschedule; /bookings/:id/cancel; HealthModule; RateLimitModule.
Auth guard (auth.guard.ts): fail-closed (returns false by default). BYPASS REACHABLE IN PRODUCTION: line 7 checks NO_REAL_AUTH env with no NODE_ENV guard (proof: grep line 7). Evidence saved.
Frontend calls: /bookings mapped; /event-types mapped; /clients mapped (from log); /providers/me FAILS (mapped is /:id; 'me' parsed as UUID -> 500); /health returns 404 (mismatch: module mapped, endpoint 404).
Tenancy query: bookings query (from bookings.service) — no WHERE provider/workspace clause shown — BLOCKER (provider A can read B by ID).

=== 5. ROUTE SWEEP ===
/dashboard FUNCTIONAL; /calendar FUNCTIONAL (duplicate key fixed); /analytics /reports /billing STUB; /clients PARTIAL (not fully audited); /public-booking MISSING; /unknown BROKEN. Script: scripts/audit-routes.ts (stub, not executable — Playwright not configured). Screenshots: NONE (verification/audit/ empty).

=== 9. CLAIMS CHECKED FROM OLD REPORT ===
D1 (EADDRINUSE): confirmed — PID 19504 on 3000; fixed by env/port mapping. D2-D4 (missing endpoints): confirmed — routes missing. D5 (no price): confirmed — bookings table has no money fields. D7 (auth stub): confirmed — bypass reachable in production. D10 (no screenshots): confirmed — empty dir. All verified; corrections saved.

=== 10. PROTOTYPE ENTITIES WITH NO BACKEND ===
From DB survey: availability_rules (has table), clients (table), bookings (table), providers (table), event-types / services (table = services), notifications (reminder_jobs table — partial), payments / subscription / invoice (NONE — no tables, no routes). Blocked by backend gaps.

=== 11. GO/NO-GO ===
NO-GO for production. Blockers: D1 fixed (env); D2-D4 (endpoints missing — HIGH); D5 (money fields — HIGH); D6 (migrations empty — HIGH); D7 (auth bypass in prod — BLOCKER); D10 (evidence incomplete — MEDIUM); D11 (currency missing — MEDIUM). Implementation can start ONLY after D1+D7+D6+endpoints fixed.
