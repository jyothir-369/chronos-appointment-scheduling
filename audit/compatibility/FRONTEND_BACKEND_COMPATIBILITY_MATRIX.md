=== FRONTEND_BACKEND_COMPATIBILITY_MATRIX ===
Feature | Frontend File | Request | Backend Route | DTO | Response | DB Source | Status | Gap | Severity
Dashboard | dashboard/page.tsx | GET /bookings + /clients | /bookings /clients | CreateBookingDto | {bookings:[ ]} (empty) | bookings=0 | BROKEN | Empty DB, no fixture | P1
Notifications | notifications/page/info? | GET /notifications | /notifications (controller) | none | {notifications:[] (hardcoded in controller) | notifications table MISSING; module missing service | BROKEN | P1
Activity | activity/page? | GET /activity | /activity (controller) | none | {activities:[] (filtered by cookie) | activity table MISSING; DB empty | BROKEN | P1
Appointments | appointments/page.tsx | GET /bookings | /bookings | CreateBookingDto | [] | bookings=0 | BROKEN | P1
Calendar | calendar/page.tsx | GET /bookings + slots | /slots, /providers/:id/availability | none | slots exist (85) | slots OK | PARTIAL | P2
Clients | clients/page.tsx | GET /clients | /clients | none | clients (3 rows) | clients OK | PARTIAL | P2
Billing | billing/page.tsx | GET /billing | /billing | none | none (no payments table) | BROKEN | P0
Reports/Analytics | reports/analytics | GET /analytics /reports | /analytics /reports | none | mock/hardcoded in source | MOCKED | P2
Event Types | event-types/page | GET /event-types | /event-types | none | event_types (table) | PARTIAL | P2
Availability | availability/page | GET /providers/:id/availability | /providers/:id/availability | AvailabilityQuery | depends on provider | PARTIAL | P2
