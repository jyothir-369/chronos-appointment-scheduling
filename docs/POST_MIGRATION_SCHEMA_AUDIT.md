# POST-MIGRATION SCHEMA AUDIT — READ-ONLY
Date: 2026-10-05
Audit rule: NO SQL mutations, NO code modifications, NO commits.

---

## 1. APPLIED MIGRATION
File: `prisma/migrations/20261005102307_schema_reconciliation/migration.sql`

Statements (grouped):

A. ORIGINALLY AUTHORIZED:
- ALTER TABLE providers ADD COLUMN slug ...
- UPDATE providers SET slug = ...
- ALTER ... slug SET NOT NULL
- CREATE UNIQUE INDEX idx_providers_slug ...
- CREATE TABLE event_types (...) + indexes

B. ADDITIONAL (DB changes applied; not in single migration SQL):
- providers.created_at / updated_at
- clients.company / phone / avatar_url / created_at / updated_at
- slots.created_at / updated_at
- slot_minutes / reminder_offsets_minutes DB defaults
- SlotStatus native enum created (`slotstatus`)
- slots_status_check preserved (text check)
- Prisma @map fix for cancellationWindowHours

---

## 2. CURRENT PRISMA SCHEMA (relevant mappings)
- Provider: slug String @unique, cancellationWindowHours Int @map("cancellation_window_hours"), createdAt/updatedAt with @map
- EventType: slug String @unique, providerId/durationMinutes mapped
- Client: company/phone/avatarUrl String?, timestamps
- Slot: status SlotStatus @default(open), timestamps mapped
- SlotStatus enum: open / booked / blocked
- Booking: status BookingStatus, notes String?, clientNotes mapped

---

## 3. CURRENT POSTGRES SCHEMA (key tables, read-only)
See audit script output. Key findings:
- providers: 8 rows, slug NOT NULL, unique index present, legacy defaults preserved
- clients: 5 rows, optional new columns NULL, timestamps present
- event_types: 6 rows (fixture-created)
- slots: 84 rows, status=text, created_at/updated_at present, display_tz/service_id preserved
- bookings: 0
- reminder_jobs: 0
- idempotency_keys: 4

---

## 4. SLOT STATUS INVESTIGATION (current blocker)
A. `slots.status` type: text
B. Native `SlotStatus` enum (`slotstatus`): YES
C. Enum labels: open, booked, blocked
D. Distinct DB status values: booked, open
E. Counts: booked=37, open=47
F. Check constraint: `slots_status_check` — `CHECK (status = ANY (ARRAY[...]))` (text literals)
G. Indexes on status: NONE
H. Prisma SlotStatus: open, booked, blocked

All DB values match Prisma enum labels. No value conflicts.

---

## 5. CRITICAL QUESTION — IS CONVERSION REQUIRED?
YES. Prisma requires SlotStatus enum; DB column is text.

Safest additive/non-destructive conversion (NOT executed):
1. `ALTER TABLE slots DROP CONSTRAINT slots_status_check;`
2. `ALTER TABLE slots ALTER COLUMN status TYPE slotstatus USING status::slotstatus;`
3. `ALTER TABLE slots ALTER COLUMN status SET DEFAULT 'open'::slotstatus;`
4. Verify row counts (should remain 84); verify status values (open/booked).
No data mutation; only column type change using exact-match cast.

---

## 6. DATA PRESERVATION (read-only)
- providers: 8 (original + fixtures preserved; slug backfilled safe)
- clients: 5 (original + fixtures; optional fields NULL safe)
- slots: 84 (all preserved; no deletions)
- event_types: 6 (fixture records, expected)
- bookings/reminder_jobs: 0 (no production data lost)
- idempotency_keys: 4 (preserved)
- Legacy columns: `slot_minutes` (default 30), `reminder_offsets_minutes` ({1440,60}), `display_tz`, `service_id`, `cancelled_at`, `client_timezone` — ALL PRESERVED.

---

## 7. CLASSIFICATION OF EXTRA CHANGES
| Change | Classification | Note |
| providers.slug + index | REQUIRED / SAFE | Authorized; unique preserved |
| event_types | REQUIRED / SAFE | Authorized; exact match |
| providers.created_at/updated_at | SAFE / ADDITIVE | Required by Prisma |
| clients.company/phone/avatar_url | SAFE / ADDITIVE | Optional; NULL preserved |
| clients.created_at/updated_at | SAFE / ADDITIVE | Required by Prisma |
| slots.created_at/updated_at | SAFE / ADDITIVE | Required by Prisma |
| slot_minutes / reminder defaults | SAFE | Legacy preserved |
| cancellationWindowHours @map | REQUIRED / FIX | Schema mapping only |
| SlotStatus enum created | ADDITIVE / PARTIAL | Column not converted |
| slots_status_check preserved | STATUS QUO / BLOCKER | Must drop before conversion |

All extra changes: ADDITIVE / NON-DESTRUCTIVE. Only open blocker: SlotStatus column conversion.

---

## 8. MIGRATION HISTORY
- Folder present: `prisma/migrations/20261005102307_schema_reconciliation/`
- SQL file present (809 bytes)
- `_prisma_migrations` DB table shows migration record (read-only)
- DB schema verifies applied (slug column, event_types table present; data counts preserved)

---

## 9. E2E STATUS
NOT RERUN (per instruction).
Previous state: fixture runs through provider → eventType → client; fails at slot.create() due to text vs SlotStatus.
Once conversion (§5) applied and verified, rerun E2E.

---

## 10. RECOMMENDED NEXT ACTION
Await confirmation. When confirmed, apply ONLY the SlotStatus conversion sequence (§5). No other SQL, no `prisma db push`, no `migrate reset`, no destructive operations.

Audit complete. Zero mutations performed.
