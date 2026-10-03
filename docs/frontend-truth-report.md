# FRONTEND TRUTH REPORT — 2026-10-03

Role: Senior Full-Stack Engineer (truth pass; previous claims contradicted by code + evidence).

1. REAL BACKEND STATE (evidence required; not derived):
- DB docker 8137f8b92521 up (postgres:16-alpine, 5433->5432 healthy).
- DB contents: bookings COUNT 0; providers 1 (Dr. Chronos Test Provider / America/New_York); clients 0.
- Migrations / seed: NOT RUN (prisma/migrations empty of applied state; seed mechanism not executed).
- API server 3001: NOT RESPONDING (curl returned 000; process did not survive).
- Real curl responses saved: NONE. docs/api-samples/real/ MISSING.
- Previous report claims: FALSE.
  * "Real HTTP responses" — none captured (only source inspection).
  * "DB verified" — container running but empty; seed not run.
  * "6 overlay issues resolved" — never inspected (no running server).
  * "Contracts rebuilt and verified" — rebuilt from source only; unverified vs live DB.

2. PHASE STATUS (each requires evidence; NONE fully complete this session):

PHASE 0 — BACKEND MUST RESPOND: NOT DONE.
Evidence: docker ps shows DB up; docker exec psql shows bookings=0; curl localhost:3001=000; no curl responses saved; seed not executed.

PHASE 1 — CONTRACTS / DATA SOURCE: PARTIAL — CODE ONLY (unverified live).
Evidence:
- Contracts rebuilt (packages/contracts/src/index.ts): matches source enum BOOKED/COMPLETED/CANCELLED/NO_SHOW. Unverified vs live DB (table empty).
- AGGREGATES / hardcoded numbers: still referenced in dashboard/page.tsx line 30 (mock branch only); production branch computes from bookings (0 with real DB). NOT removed.
- Dev indicator ("Data: real API" / "Data: mock"): MISSING.
- Status mapping (AppointmentRow): CODE ONLY; no live response verified.
- Confirm/Decline: endpoints MISSING per bookings.controller.ts (only POST create / GET :id / PATCH reschedule / lifecycle evaluation). Code shows disabled links (`#` href) but buttons still rendered.
- KPI derivation: impossible with empty DB; no metrics/value/paid/occupancy fields in controller; must show unavailable/labelled gap honestly.

PHASE 2 — FIX LIST FROM SCREENSHOTS: NOT VERIFIED (previous claims unsupported).
Evidence:
- Timezone format code changed; not verified against real provider timezone pulled from /providers/me (API down; workspace.timezone from mock only when USE_MOCK=true).
- Schedule filter (todayFiltered): client-side only; backend @Query filter not added (controller confirms no filter params).
- Duplicate "New Appointment" (page line 52): STILL PRESENT (not removed).
- AppointmentRow repeated Client line (line 154): STILL PRESENT; left time block / location-icon / email-icon NOT ADDED.
- Routes (/appointments, /calendar, /clients, /settings, etc.): NOT VERIFIED with real server (API down; web responds 200 but page content unverified).
- Content padding / dead gap: NOT MEASURED.
- Demo Empty States label overlap: NOT CHECKED.
- Settings Save / timezone searchable IANA select: NOT BUILT / NOT VERIFIED.
- Calendar highlight / Week-Day-Agenda / drawer: NOT BUILT / NOT VERIFIED.

PHASE 3 — OVERLAY / CONSOLE: NOT DONE.
Evidence: server never fully responsive; overlay never inspected live; previous "6 fixed" claim unsupported.

PHASE 4 — VERIFICATION / SCREENSHOTS: NOT DONE.
Evidence:
- Playwright script (tests/verify.screenshots.ts): committed; NEVER EXECUTED.
- Playwright config (playwright.config.mts): valid TypeScript; NO webServer entry added.
- Screenshots saved this session: NONE (directory exists but empty of PNGs).
- HTTP status / console errors / overlay count per route: NOT RECORDED.
- Typecheck / lint / build / production build: NOT EXECUTED this session (previous evidence exists; not re-verified).

3. DATA SOURCE TRUTH (honest; values will differ from target design while DB empty):

| KPI Card            | Real Source (DB/controller) | Real Value (current DB) | Mock Value (USE_MOCK) | Matches real? |
|--------------------|-----------------------------|-------------------------|-----------------------|---------------|
| Total Appointments | DB bookings COUNT            | 0                       | 142                   | FALSE         |
| Upcoming Today     | DB bookings filtered         | 0                       | 2-3                   | FALSE         |
| Estimated Value    | NO field in controller       | N/A (unavailable)       | 4850                  | CANNOT DERIVE |
| Occupancy Rate     | NO endpoint verified         | N/A (unavailable)       | 88                    | CANNOT DERIVE |

4. BACKEND GAP LIST (honest; no invented endpoints):
| Capability             | Source Evidence (controller/file)                 | UI Impact                          | Severity |
| Confirm/Decline        | MISSING in bookings.controller (only lifecycle)  | Buttons shown but disabled/gap      | HIGH     |
| Metrics endpoint      | MISSING                                       | KPI cards must show unavailable     | HIGH     |
| /bookings query/filter| MISSING @Query params                          | Filter client-side only             | MEDIUM   |
| Workspace handle      | MISSING endpoint                               | Code marks BACKEND GAP              | MEDIUM   |
| Activity feed         | MISSING endpoint                               | Derived from bookings array         | MEDIUM   |
| Calendar events/detail| NOT BUILT / NOT VERIFIED                       | Page empty / heading only           | MEDIUM   |
| Public booking page   | MISSING endpoint                               | Unavailable                          | LOW      |
| Billing / Analytics   | MISSING endpoint                               | Not available yet                    | LOW      |

5. CORRECTIVE ACTIONS REQUIRED BEFORE ANY CLAIM (must execute + provide evidence):
A. Execute db package seed / migrations (re-run with real mechanism; verify bookings > 0 with realistic 2026-10-03 bookings).
B. Fix / start API 3001 (resolve dependency/decorator error from log; confirm curl /api/health 200; confirm /providers/me, /bookings, /clients, /event-types return 200 with real data).
C. Capture real responses (all endpoints used by frontend); delete any derived-only samples; save to docs/api-samples/real/.
D. Verify contracts against live DB schema (not source only); fix divergence.
E. Remove AGGREGATES / hardcoded numbers from production code path; show 0 / unavailable honestly when DB empty.
F. Add dev indicator; fix timezone verification; fix duplicate button; fix AppointmentRow format; wire calendar; wire settings; build honest unavailable pages.
G. Configure Playwright webServer (start API + web); run headless; save PNGs; record HTTP/console/overlay per route.
H. Paste typecheck + lint + build output for both apps; include screenshot paths.
I. Only after A-H complete: write final report with evidence paths (screenshot filenames, curl outputs, build logs).

No attribution line included (per instruction).
No "pre-existing" label used (per instruction).
No claim without evidence.
