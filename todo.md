# UNIVERSAL CLAUDE CODE TASK EXECUTION PROMPT

You are an autonomous senior software engineer working inside an existing codebase.

Your job is to take the TASK provided below and complete it fully, not merely explain how to do it.

## 1. PRIMARY OBJECTIVE

Complete the requested task end-to-end.

Do not stop at:

* explaining what should be changed
* creating a partial implementation
* giving pseudocode when real code is required
* identifying problems without fixing them
* making changes without verifying them
* reporting that something is "traced" without resolving it
* reporting something as PASS without runtime evidence

Your responsibility is to leave the codebase in a working, validated state that satisfies the TASK.

---

## 2. TASK

<TASK>

Complete the remaining unverified/failed Phase 4 reminder lifecycle work in the Chronos — Timezone-Safe Appointment Scheduling Platform.

Repository:

`C:\Users\raghava\OneDrive\Desktop\Chronos — Timezone-Safe Appointment Scheduling Platform`

The current state is:

### ALREADY FIXED — DO NOT UNNECESSARILY REWRITE

These areas have already been fixed and/or verified:

1. Booking → PostgreSQL `reminder_jobs` creation
2. Deterministic BullMQ job IDs:

   * `reminder:{bookingId}:1440`
   * `reminder:{bookingId}:60`
3. Cancellation DB cleanup
4. Status → cancelled DB cleanup
5. Decline DB cleanup
6. Removal of invalid `updated_at` references from reminder queue/worker code
7. ReminderQueueManager Nest DI wiring
8. Worker safety preventing sends when booking is no longer `booked`
9. Reminder idempotency
10. PostgreSQL/Redis infrastructure configuration
11. No DB reset/destructive database operations
12. No commit/push

Do NOT redesign or unnecessarily rewrite these already-working areas.

The remaining work is:

### REMAINING WORK

A. Fix and prove Booking → BullMQ enqueue.

B. Fix and prove the Reschedule endpoint/runtime failure.

C. Prove and fix Reschedule old BullMQ cleanup.

D. Prove and fix Reschedule new BullMQ enqueue.

E. Prove and fix Cancel → BullMQ cleanup.

F. Prove and fix Status → cancelled → BullMQ cleanup.

G. Prove and fix Decline → BullMQ cleanup.

H. Fix the failing Vitest test caused by the invalid UUID fixture/value `b123`.

I. Confirm the API build actually succeeds.

J. Run Prisma validation against the actual `schema.prisma` location.

K. Re-run all affected runtime and automated tests after fixes.

The final objective is:

```text
CREATE BOOKING
    ↓
DB reminder_jobs
    ↓
BullMQ jobs
    ↓
Redis

RESCHEDULE
    ↓
old DB reminders cancelled
    ↓
old BullMQ jobs removed/invalidated
    ↓
new DB reminders created
    ↓
new BullMQ jobs created

CANCEL
    ↓
DB reminders cancelled
    ↓
BullMQ jobs removed/invalidated

STATUS → CANCELLED
    ↓
DB reminders cancelled
    ↓
BullMQ jobs removed/invalidated

DECLINE
    ↓
DB reminders cancelled
    ↓
BullMQ jobs removed/invalidated

WORKER
    ↓
cancelled booking never sends

TESTS
    ↓
all relevant tests pass

BUILD
    ↓
passes

PRISMA
    ↓
validates
```

You must FIX the remaining failures and then PROVE them.

Do not merely trace them.

</TASK>

---

## 3. OPERATING RULES

### Understand before changing

Before modifying anything:

1. Inspect the repository structure.
2. Identify the relevant files, modules, services, controllers, queue configuration, worker, tests, Prisma schema, environment/configuration, and package scripts.
3. Read the current implementations around:

   * `bookings.controller.ts`
   * `bookings.service.ts`
   * `reschedule.service.ts`
   * `reminder.queue.ts`
   * `reminder.worker.ts`
   * `reminders.module.ts`
   * reminder-related tests
   * booking/reschedule tests
   * Prisma schema
4. Determine the actual current architecture.
5. Search for all references to:

   * `ReminderQueueManager`
   * `enqueueForBooking`
   * `cancelForBooking`
   * `queue.add`
   * `queue.getJob`
   * `reminder_jobs`
   * `updated_at`
   * `rescheduleBooking`
   * BullMQ queue configuration
6. Identify the project's existing test/build/typecheck commands.
7. Inspect actual current code before relying on previous reports.

Do not assume the previous implementation is unchanged.

---

## 4. EXECUTION MODE

Work autonomously.

Do not ask me for confirmation for ordinary implementation decisions.

If multiple reasonable approaches exist:

1. Choose the approach that best fits the existing architecture.
2. Prefer the smallest safe change that completely solves the task.
3. Preserve the existing `pg.Pool` architecture.
4. Preserve the existing NestJS + BullMQ architecture.
5. Reuse existing services/utilities.
6. Avoid unnecessary refactoring.

Only ask for clarification when the task is genuinely impossible to complete safely without missing information.

---

## 5. IMPLEMENTATION REQUIREMENTS

When implementing the task:

* Follow the existing project's coding style.
* Preserve existing API contracts unless a change is required to fix a proven defect.
* Do not introduce TypeORM.
* Do not replace PostgreSQL `pg.Pool`.
* Do not replace BullMQ.
* Do not replace Redis.
* Do not introduce a second queue manager.
* Do not duplicate reminder scheduling logic.
* Do not create fake queue implementations for production code.
* Do not swallow errors that are required for reliable reminder scheduling.
* Preserve transaction boundaries.
* Preserve idempotency.
* Preserve deterministic BullMQ IDs.
* Preserve worker safety.
* Preserve existing reminder offsets unless the current business logic explicitly requires otherwise.
* Keep queue cleanup consistent with the actual deterministic job IDs.
* Ensure queue operations use the Nest-managed `ReminderQueueManager`.
* Ensure standalone service functions receive/use the actual injected manager where necessary.
* Ensure DB commit happens before best-effort queue operations where that is the existing intended architecture.
* Ensure queue cleanup/enqueue failures are observable and handled according to the existing architecture.
* Do not introduce unrelated architecture changes.

---

# 6. BOOKING → BULLMQ: FIX AND PROVE

The current known problem is:

```text
Booking → reminder_jobs = working

Booking → BullMQ = not proven
```

Previous inspection found that expected jobs were not visible through direct BullMQ inspection.

Do not assume `getDelayedCount() = 0` alone means failure.

### First inspect the exact queue configuration.

Verify:

* queue name
* Redis host
* Redis port
* Redis password
* BullMQ prefix
* connection options
* queue lifecycle
* worker lifecycle
* module registration

The queue must use:

```text
Redis host: localhost
Redis port: 6380
password: localdev
queue: reminders
```

unless the repository's existing configuration explicitly derives these values differently.

Do not change infrastructure ports.

### Trace the exact runtime path:

```text
POST /bookings
    ↓
createBooking()
    ↓
DB transaction
    ↓
booking INSERT
    ↓
reminder_jobs INSERT
    ↓
COMMIT
    ↓
ReminderQueueManager.enqueueForBooking()
    ↓
queue.add()
    ↓
Redis/BullMQ
```

Determine whether each step actually executes.

### Use direct BullMQ inspection.

For a NEW real booking, inspect:

```text
queue.getJob("reminder:{bookingId}:1440")
queue.getJob("reminder:{bookingId}:60")
```

Also inspect appropriate queue states:

* delayed
* waiting
* active
* completed
* failed

Inspect counts as supporting evidence, not as the only evidence.

Inspect Redis keys only when necessary to diagnose the queue state.

### Required result

For a newly created booking with future reminders:

```text
reminder:{bookingId}:1440
```

and

```text
reminder:{bookingId}:60
```

must be observable in BullMQ in the appropriate state.

If they are not:

1. Find the exact root cause.
2. Fix it.
3. Re-run the real booking flow.
4. Re-inspect the exact job IDs.
5. Confirm the jobs exist.

Do not simply add logging and declare success.

---

# 7. RESCHEDULE: FIX THE CURRENT 500

The latest runtime evidence showed:

```text
reschedule → HTTP 500
```

This is an actual unresolved failure.

You MUST reproduce it.

Create/use a safe real test booking and a valid future destination slot.

Call the actual reschedule endpoint.

Capture:

* HTTP status
* response body
* backend error
* stack trace/log
* relevant DB state

Then trace:

```text
POST /bookings/:id/reschedule
        ↓
controller
        ↓
rescheduleBooking()
        ↓
transaction
        ↓
old booking/reminder handling
        ↓
new booking
        ↓
new reminder_jobs
        ↓
COMMIT
        ↓
old BullMQ cleanup
        ↓
new BullMQ enqueue
```

Determine the EXACT root cause of the 500.

Do not guess.

Fix only the actual defect.

Then rerun the reschedule endpoint.

Do not stop until the valid reschedule succeeds.

---

# 8. RESCHEDULE OLD REMINDER CLEANUP

After a successful reschedule:

Verify the old booking's DB reminder rows.

They must follow the existing intended cancellation/invalidation behavior.

Then inspect the old deterministic BullMQ IDs:

```text
reminder:{oldBookingId}:1440
reminder:{oldBookingId}:60
```

Use direct `queue.getJob()` and appropriate state inspection.

The old jobs must no longer be capable of sending reminders for the old booking.

Prefer actual removal when the existing architecture requires queue cleanup.

If old jobs remain:

1. Determine why.
2. Fix the cleanup path.
3. Re-run the complete reschedule test.
4. Re-inspect the old job IDs.

---

# 9. RESCHEDULE NEW REMINDER ENQUEUE

After reschedule creates the new booking:

Verify DB:

```text
new booking
    ↓
new reminder_jobs
```

Then verify BullMQ:

```text
reminder:{newBookingId}:1440
reminder:{newBookingId}:60
```

Both must exist where their fire times are future-valid.

If DB rows exist but BullMQ jobs do not:

trace the exact queue enqueue path and fix it.

Do not consider reschedule complete based only on HTTP success.

---

# 10. CANCEL → BULLMQ CLEANUP

Create a NEW future booking.

First prove the jobs exist:

```text
reminder:{bookingId}:1440
reminder:{bookingId}:60
```

Then execute the real:

```text
POST /bookings/:id/cancel
```

Verify:

```text
booking.status = cancelled
```

Verify:

```text
reminder_jobs.status = cancelled
```

Then directly inspect BullMQ.

The scheduled jobs must be removed or otherwise rendered non-executable according to the existing architecture.

If they remain:

* trace `cancelForBooking()`
* inspect job ID construction
* inspect `queue.getJob()`
* inspect `job.remove()`
* inspect queue state
* fix the root cause
* rerun the test

Do not declare PASS because only the database changed.

---

# 11. STATUS → CANCELLED → BULLMQ CLEANUP

Create a NEW future booking.

Verify BullMQ jobs exist.

Execute:

```text
PATCH /bookings/:id/status
```

with:

```json
{
  "status": "cancelled"
}
```

Verify:

```text
booking = cancelled
reminder_jobs = cancelled
BullMQ 1440 = removed/non-executable
BullMQ 60 = removed/non-executable
```

If queue cleanup is missing:

fix the controller/service path using the existing `ReminderQueueManager`.

Do not duplicate cancellation logic unnecessarily.

---

# 12. DECLINE → BULLMQ CLEANUP

Create another NEW future booking.

Verify:

* DB reminders exist
* BullMQ jobs exist

Execute the real decline endpoint.

Verify:

```text
booking = cancelled
reminder_jobs = cancelled
BullMQ 1440 = removed/non-executable
BullMQ 60 = removed/non-executable
```

If DB cleanup works but BullMQ cleanup does not:

trace the exact queue cleanup invocation and fix it.

---

# 13. IMPORTANT BULLMQ JOB-ID RULE

The canonical job IDs are:

```text
reminder:{bookingId}:1440
reminder:{bookingId}:60
```

Do NOT reintroduce:

```text
reminder:{bookingId}:{reminderDatabaseUuid}
```

Do NOT create random job IDs.

Do NOT change the deterministic ID format unless the existing architecture absolutely requires it.

Cancellation and reschedule cleanup must use the same deterministic identity that enqueue uses.

---

# 14. VITEST FAILURE — FIX THE INVALID UUID

The latest test execution reported:

```text
1 test failed
invalid UUID: b123
```

You MUST locate the exact failing test and fixture.

Determine:

* which file
* which test
* why `b123` is being passed
* whether the production implementation or test fixture is incorrect

If the test is supposed to use a UUID:

replace the invalid fixture with a valid deterministic UUID.

Example format:

```text
00000000-0000-4000-8000-000000000001
```

Use a suitable deterministic UUID consistent with project conventions.

Do NOT weaken validation.

Do NOT remove the test.

Do NOT change production UUID validation merely to accommodate an invalid test fixture unless the actual product contract requires that.

Then run:

1. the failing test
2. the complete relevant reminder/booking test suite
3. the complete project test suite if practical

Record exact results.

---

# 15. TEST COVERAGE REQUIREMENTS

Ensure relevant automated coverage exists for:

### Booking

* DB reminder creation
* BullMQ enqueue
* deterministic job IDs
* idempotent enqueue

### Reschedule

* old reminder cancellation
* old BullMQ cleanup
* new reminder creation
* new BullMQ enqueue

### Cancellation

* DB reminder cancellation
* BullMQ cleanup

### Status cancellation

* DB reminder cancellation
* BullMQ cleanup

### Decline

* DB reminder cancellation
* BullMQ cleanup

### Worker

* cancelled booking does not send

Use mocks for external notification providers.

Do not use real external messaging providers.

Do not rely on actual time delays for unit tests.

---

# 16. API BUILD

Identify the repository's actual API build command.

Run it.

Do NOT report:

```text
Build executed
```

as success.

The command must actually exit successfully.

If build fails:

1. capture the complete error
2. find the root cause
3. fix it
4. rerun build
5. rerun affected tests

Do not leave build failures unresolved.

---

# 17. PRISMA VALIDATION

Find the actual Prisma schema.

Use:

```powershell
Get-ChildItem -Path . -Filter schema.prisma -Recurse
```

Determine the correct workspace/package/schema path.

Run the project's proper Prisma validation command against the actual schema.

Do not assume the schema exists at the repository root.

Expected result:

```text
Prisma schema is valid
```

If validation fails:

* determine whether the issue is command/path/configuration
* determine whether the schema itself is invalid
* fix only an actual defect

Do NOT create migrations simply to make validation pass.

Do NOT reset the database.

---

# 18. FULL REGRESSION VERIFICATION

After fixing all issues, execute the complete relevant flow again.

At minimum:

## Flow 1 — Create

```text
login
→ create booking
→ DB reminders
→ BullMQ jobs
```

## Flow 2 — Reschedule

```text
create booking
→ verify old BullMQ
→ reschedule
→ old DB cleanup
→ old BullMQ cleanup
→ new DB reminders
→ new BullMQ jobs
```

## Flow 3 — Cancel

```text
create booking
→ verify BullMQ
→ cancel
→ DB cleanup
→ BullMQ cleanup
```

## Flow 4 — Status cancellation

```text
create booking
→ verify BullMQ
→ PATCH status=cancelled
→ DB cleanup
→ BullMQ cleanup
```

## Flow 5 — Decline

```text
create booking
→ verify BullMQ
→ decline
→ DB cleanup
→ BullMQ cleanup
```

## Flow 6 — Worker safety

```text
cancelled booking
→ worker processing
→ no notification
```

---

# 19. DO NOT TRUST PREVIOUS REPORTS

Previous reports are context only.

You must inspect the current code and produce new evidence.

Do not say:

```text
already verified
```

unless the current execution confirms it where necessary.

Do not say:

```text
should work
```

Do not say:

```text
looks correct
```

Do not say:

```text
implemented
```

as a substitute for runtime evidence.

---

# 20. INFRASTRUCTURE SAFETY — ABSOLUTE

You MUST NOT:

* reset PostgreSQL
* recreate PostgreSQL
* drop tables
* truncate tables
* delete production/application data
* run `prisma migrate reset`
* change PostgreSQL port `5433`
* change Redis port `6380`
* change backend port `3001`
* change frontend port `3000`
* introduce TypeORM
* replace `pg.Pool`
* replace BullMQ
* replace Redis
* commit
* push

No destructive SQL.

No broad architectural rewrite.

No unrelated refactor.

No dependency installation unless genuinely required and justified.

---

# 21. FAILURE RECOVERY LOOP

If any validation fails:

1. Read the complete error.
2. Identify the actual root cause.
3. Fix the root cause.
4. Re-run the failed validation.
5. Re-run affected tests.
6. Check for regressions.
7. Continue until the relevant validation passes.

Do NOT stop after discovering the problem.

Do NOT merely report the problem.

Do NOT weaken tests to hide the problem.

---

# 22. FINAL ACCEPTANCE MATRIX

You may only mark an item:

`🟢 VERIFIED PASS`

when actual evidence exists.

Required final state:

| Area                            | Required         |
| ------------------------------- | ---------------- |
| Booking → DB reminders          | 🟢 VERIFIED PASS |
| Booking → BullMQ 1440           | 🟢 VERIFIED PASS |
| Booking → BullMQ 60             | 🟢 VERIFIED PASS |
| Deterministic IDs               | 🟢 VERIFIED PASS |
| Reschedule endpoint             | 🟢 VERIFIED PASS |
| Reschedule old DB cleanup       | 🟢 VERIFIED PASS |
| Reschedule old BullMQ cleanup   | 🟢 VERIFIED PASS |
| Reschedule new DB reminders     | 🟢 VERIFIED PASS |
| Reschedule new BullMQ jobs      | 🟢 VERIFIED PASS |
| Cancel DB cleanup               | 🟢 VERIFIED PASS |
| Cancel BullMQ cleanup           | 🟢 VERIFIED PASS |
| Status→cancelled DB cleanup     | 🟢 VERIFIED PASS |
| Status→cancelled BullMQ cleanup | 🟢 VERIFIED PASS |
| Decline DB cleanup              | 🟢 VERIFIED PASS |
| Decline BullMQ cleanup          | 🟢 VERIFIED PASS |
| Worker no-send after cancel     | 🟢 VERIFIED PASS |
| Reminder idempotency            | 🟢 VERIFIED PASS |
| Vitest relevant suite           | 🟢 VERIFIED PASS |
| API typecheck                   | 🟢 VERIFIED PASS |
| API build                       | 🟢 VERIFIED PASS |
| Prisma validation               | 🟢 VERIFIED PASS |

If any item cannot reach PASS, continue debugging rather than stopping.

The only acceptable final non-PASS state is when the issue is proven to be genuinely external/unrelated to the codebase, and you must provide the exact evidence.

---

# 23. EVIDENCE REQUIREMENTS

For Booking → BullMQ, provide:

```text
Booking ID: <id>

1440:
DB reminder: scheduled
BullMQ job ID: reminder:<bookingId>:1440
BullMQ state: <state>
BullMQ job exists: YES

60:
DB reminder: scheduled
BullMQ job ID: reminder:<bookingId>:60
BullMQ state: <state>
BullMQ job exists: YES
```

For Reschedule:

```text
Old Booking ID: <id>

Old reminder DB state: cancelled
Old 1440 BullMQ job: absent/non-executable
Old 60 BullMQ job: absent/non-executable

New Booking ID: <id>

New reminder DB state: scheduled
New 1440 BullMQ job: present
New 60 BullMQ job: present
```

For Cancel:

```text
Booking ID: <id>
Booking DB status: cancelled
DB reminders: cancelled
1440 BullMQ job: absent/non-executable
60 BullMQ job: absent/non-executable
```

For Status cancellation:

```text
Booking ID: <id>
Booking status: cancelled
DB reminders: cancelled
BullMQ cleanup: verified
```

For Decline:

```text
Booking ID: <id>
Booking status: cancelled
DB reminders: cancelled
BullMQ cleanup: verified
```

For Vitest:

```text
Test files:
Tests:
Passed:
Failed:
Skipped:
```

For Build:

```text
Command:
Exit:
Result:
```

For Prisma:

```text
Schema path:
Command:
Result:
```

Never expose:

* passwords
* session cookies
* API keys
* secrets
* credentials

---

# 24. FINAL REVIEW

Before declaring completion, inspect the changed files again.

Check:

### Requirements

* Every remaining Phase 4 issue resolved.
* No unresolved reschedule 500.
* BullMQ enqueue actually works.
* BullMQ cleanup actually works.
* Tests pass.
* Build passes.
* Prisma validates.

### Code quality

* No duplicate queue logic.
* No dynamic-import workaround that bypasses Nest DI.
* No invalid SQL references.
* No `updated_at` references unless the actual schema contains that column.
* No swallowed queue failures that hide broken scheduling.
* No debug-only production code.
* No dead code introduced.

### Repository hygiene

* No temporary test files.
* No `.env` modifications.
* No cookies files.
* No debug artifacts.
* No accidental generated files.
* No commits.
* No pushes.

---

# 25. COMPLETION CRITERIA

You may declare the task complete ONLY when:

1. Booking → BullMQ works and is directly verified.
2. Reschedule no longer returns 500.
3. Reschedule old jobs are cleaned up.
4. Reschedule new jobs are created.
5. Cancel BullMQ cleanup is verified.
6. Status cancellation BullMQ cleanup is verified.
7. Decline BullMQ cleanup is verified.
8. Worker cancellation safety remains intact.
9. The invalid UUID test is fixed.
10. Relevant Vitest tests pass.
11. API typecheck passes.
12. API build passes.
13. Prisma validation passes.
14. No destructive infrastructure/database changes were made.
15. No commit/push was performed.

Do not declare Phase 4 complete until these conditions are actually demonstrated.

---

## 26. FINAL RESPONSE

After the work is actually complete, provide a concise summary containing:

### Implemented

* Exact code changes made.
* Exact root causes fixed.

### Runtime Verification

* Booking → DB → BullMQ evidence.
* Reschedule evidence.
* Cancel evidence.
* Status cancellation evidence.
* Decline evidence.
* Worker safety evidence.

### Automated Validation

* Vitest result.
* Typecheck result.
* Build result.
* Prisma validation result.

### Final Status

Provide the complete matrix using only:

* 🟢 VERIFIED PASS
* 🔴 VERIFIED FAIL
* 🟠 NOT EXECUTED / UNVERIFIED

### Notes

Mention only genuine limitations or external blockers.

### Infrastructure Safety

Explicitly confirm:

* PostgreSQL 5433 unchanged
* Redis 6380 unchanged
* no DB reset
* no destructive SQL
* no commit
* no push

Do not claim success unless the implementation and validation support that claim.

---

## FINAL EXECUTION RULE

Do not stop at source inspection.

Do not stop at tracing.

Do not stop at DB verification.

Do not stop at HTTP 201.

Do not stop at HTTP 200.

Do not stop at "BullMQ configuration looks correct."

Do not stop at `getDelayedCount()`.

Do not stop at "Reschedule traced."

Do not stop at "Vitest executed."

The task is complete only when the actual broken/unverified behavior is fixed and then independently verified.

INSPECT → REPRODUCE → ROOT CAUSE → FIX → RUNTIME VERIFY → TEST → BUILD → PRISMA VALIDATE → RE-VERIFY → FINAL REVIEW → COMPLETE.

Do not commit or push.
