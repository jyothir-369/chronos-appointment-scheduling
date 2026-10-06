# Remediation Report — Chronos (2026-09-30)

Fixed:
- .env / .env.example: removed hard-coded DB password; set NO_REAL_AUTH=false; placeholders in example
- docker-compose.yml: bound DB/Redis to 127.0.0.1; added Redis requirepass; configurable env vars
- apps/api/src/bookings/bookings.module.ts: removed hard-coded fallback connection string
- apps/api/src/auth/auth.guard.ts: created auth guard with development-only bypass (fail-closed)
- apps/api/src/bookings/bookings.controller.ts: delegated to bookings.service; removed Prisma duplicate
- apps/api/src/admin/admin.controller.ts: replaced $NAME template with disabled endpoint + authorization boundary
- apps/web/src/app/book/[provider]/page.tsx: removed hard-coded slots
- apps/api/src/smoke.test.ts: replaced with meaningful assertions
- prisma/schema.prisma: added IdempotencyKey model
- apps/api/src/app.module.ts: imported RateLimitModule; configured CORS in main.ts
- .github/workflows/ci.yml: created basic CI

Partially Fixed / Not Fully Verified:
- Full JWT/session auth not yet fully implemented (stub guard present)
- Idempotency table needs database migration (schema updated; migration not generated)
- ReminderJob offset mapping (service uses minutes, schema uses enum) noted but not fully reconciled
- Integration tests for endpoints not fully written
- Production deployment pipeline not created (only CI workflow)

New Risks Introduced:
- Development bypass (NO_REAL_AUTH=true) must never reach production; documented in guard
- Redis password set to localdev by default — must be rotated for production
- Admin endpoint disabled (safe) but needs full implementation before use

Verification Results (partial due to environment):
- Typecheck: partial failure from unrelated workspace package; core API module builds
- Install: pnpm install succeeded
- Build: not fully verified for all packages
- Security audit: secrets removed, auth stub added, CORS/RateLimit active
