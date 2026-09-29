# Chronos — Architecture

Phase 1 foundation only.

- Monorepo: Turborepo + pnpm workspace
- Frontend: Next.js App Router (new, old impl not restored)
- Backend: NestJS (new)
- DB: PostgreSQL + Prisma
- Shared: packages/ui, packages/types, packages/config

No fake APIs; no localStorage database; all times stored as UTC via Prisma.
