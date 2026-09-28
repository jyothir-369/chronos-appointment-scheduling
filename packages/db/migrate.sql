-- Native PostgreSQL migration runner (PowerShell-compatible via psql)
\echo 'Running migrations...'
\i packages/db/migrations/001_phase0_schema.sql
\i packages/db/migrations/002_phase2_full_schema.sql
\i packages/db/migrations/003_seed_data.sql
\i packages/db/migrations/004_stage_d_services.sql
\i packages/db/migrations/005_stage_e_waitlist.sql
\i packages/db/migrations/006_stage_e_blocked.sql
\echo 'Migrations completed.'
