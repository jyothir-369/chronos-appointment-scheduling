# ENV / CONFIG MAP

Recovered from grep of process.env / NEXT_PUBLIC across apps/api/src and apps/web/src at 00c5746.
- DATABASE_URL (required for bookings; default in .env: postgresql://...; masked value contains "localdev") [CODE apps/api/src/bookings/bookings.controller.ts:11]
- NODE_ENV (development default; production triggers auth guard) [CODE apps/api/src/auth/auth.guard.ts:7]
- NO_REAL_AUTH (production bypass; exit if set) [CODE apps/api/src/main.ts:20, apps/api/src/auth/auth.guard.ts:10]
- CORS_ORIGINS (default https://app.chronos.example) [CODE apps/api/src/main.ts:14]
- PORT (default 3001) [CODE apps/api/src/main.ts:17]
- NEXT_PUBLIC_API_URL (default http://localhost:3001) [CODE apps/web/src/app/api/appointments/route.ts:3]
- DEV_PROVIDER_ID (default UUID) [CODE apps/api/src/providers/providers.controller.ts:6]

Secrets: .env files tracked; DATABASE_URL password "localdev" exposed in apps/api/.env line 4, .env, and in git history (3 commits: c5283db, 03938f3, 032c3cd). No .env.example present.
