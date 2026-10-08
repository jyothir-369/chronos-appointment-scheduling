
=== DEBUGGING SESSION — 2026-10-08 (user-initiated) ===
Provider auth 401: verified cookie (chronos_provider_session) + CORS (localhost:3000 added in dev) + ProviderAuthGuard intact. No bypass. No architecture change.
Activity 500: root cause = invalid client cookie value passed to DB; fixed via ActivityService hardening (null guard + try/catch). Client-scoped preserved; NOT converted to provider-scoped.
Appointment message: fixed slot-resolver (checks res.ok; throws AUTH_EXPIRED for 401, SERVER_ERROR for 500, UNAVAILABLE otherwise). No masking.
Files changed: src/activity/activity.service.ts; apps/web/src/app/bookings/slot-resolver.ts.
Tests: admin 5/5 pass; full suite 86/86 preserved; TypeScript clean; frontend build intact; Prisma up-to-date; Redis PONG (no flush); no DB reset; no Phase 7; no commit/push.
Status unchanged: PHASE 6 NOT COMPLETE — BLOCKED_CONFIGURATION (only P + Blocker #2 deferred).
