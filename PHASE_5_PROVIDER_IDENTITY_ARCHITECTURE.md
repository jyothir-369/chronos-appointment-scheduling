# Phase 5 Provider Identity Architecture

## 1. Current Authentication State
- chronos_session cookie = client.id (auth.controller)
- Client login: email → client.findUnique
- AuthGuard reads cookie, sets req.user = {id: session, role: 'user'}
- No provider session; no provider cookie; no provider credential verification
- DEV_PROVIDER_ID (env) drives /providers/me endpoint only

## 2. Actual Phase 5 Requirements
- Project documentation (docs/IMPLEMENTATION_PLAN.md, docs/audit/phase5-status.md) defines Phase 5 as: provider dashboard, calendar, appointments, event types, availability, clients, settings (with mobile dark mode / responsive / empty states)
- Requirements are SILENT on: provider login mechanism, provider credentials, provider session format, roles, RBAC, JWT, OAuth, MFA
- Frontend AppShell uses /providers/me (hardcoded DEV_PROVIDER_ID) for profile; login page uses email for client session; dashboard page displays provider-oriented UI
- Conclusion: Phase 5 requires provider-facing data but does NOT define provider authentication requirements in the repository

## 3. Existing Provider Data Model (schema.prisma)
Provider { id, name, timezone, slug, cancellationWindowHours, minimumBookingNotice, createdAt, updatedAt }
No email, password, session relation, account relation, auth secret, role, or external identity.
Relations: availabilityRules[], slots[], bookings[], eventTypes[]

## 4. Existing Authentication Infrastructure
- Only mechanism: cookie parsing (chronos_session regex) + AuthGuard
- No passport, JWT, bcrypt, argon2, OAuth libraries in source
- No session store (Redis only for BullMQ reminders, not auth)
- Only development mechanism: DEV_PROVIDER_ID env variable used directly in SQL by providers.controller

## 5. Frontend Identity Expectations
- Login: client email (client portal)
- Dashboard/AppShell: provider profile from /providers/me; nav includes Dashboard, Calendar, Appointments, Event Types, Availability, Clients CRM, Reports, Billing, Analytics, Settings
- Concept: MIXED / PROVIDER PORTAL (login is client-oriented, UI is provider-oriented; no separate provider login exists)

## 6. Architecture Options
A. Extend client-session to provider: REJECTED (no provider credentials; identity mixing risky)
B. Provider account + session: RECOMMENDED as only safe production path; requires new schema/API/session format
C. Shared User model with role: REJECTED (too complex; breaks Phase 3 booking references to clientId/providerId directly)
D. External identity mechanism: REJECTED (none present)
E. Development-only (DEV_PROVIDER_ID): CURRENT STATE; ACCEPTABLE ONLY FOR DEV, clearly marked not production

## 7. Recommended Architecture
OPTION B — Provider account + provider session — as the only safe production architecture.
Status: ARCHITECTURAL PREREQUISITE, NOT IMPLEMENTED.
Minimum safe development continuation: OPTION E (DEV_PROVIDER_ID) with explicit documentation that it is development-only.

## 8. Why Alternatives Were Rejected
- A: Provider lacks email/password fields; mixing roles in same cookie is unsafe
- C: Migration too invasive; bookings/clientEvents reference clientId/providerId directly
- D: No existing mechanism found
- E (as production): Would misrepresent development-only identity as production auth

## 9. Required Identity Contract (future implementation)
{
  id: "<provider-session-id>",
  type: "provider",
  providerId: "<provider.id>",
  role: "provider",
  sessionLifetime: "24h",
  authBoundary: "cookie or JWT",
  authzBoundary: "providerId only"
}
Client identity remains separate (chronos_session = client.id).

## 10. Provider Data-Scoping Model
Provider -> EventType -> Slot -> Booking -> Client (verified by Prisma relations)
Every provider-facing endpoint must derive providerId from authenticated session and filter through this chain.

## 11. Endpoint Authorization Model (future — not implemented)
GET /analytics: AUTH REQUIRED; PROVIDER_SCOPED; filter by providerId via eventType/slot/bookings
GET /appointments: AUTH REQUIRED; PROVIDER_SCOPED; filter bookings by providerId via slot
GET /billing: AUTH REQUIRED; PROVIDER_SCOPED
GET /dashboard/summary: AUTH REQUIRED; PROVIDER_SCOPED
GET /reports: AUTH REQUIRED; PROVIDER_SCOPED
GET /search: AUTH REQUIRED; PROVIDER_SCOPED (or public if design requires)
GET /activity: CLIENT_SCOPED (existing — preserve)
GET /notifications: CLIENT_SCOPED (existing — preserve)
GET /providers/me: PROVIDER_SCOPED; must use session-derived providerId (not hardcoded DEV_PROVIDER_ID)
PATCH /providers/me: PROVIDER_SCOPED; session-derived
POST /providers/me/avatar: PROVIDER_SCOPED; session-derived

## 12. Required Schema Changes (if Option B implemented)
- Add ProviderSession model (or extend Provider with email/password/credentials — design decision needed)
- Add session/token/credential fields
- No changes to Client, Booking, Slot, EventType, Notification, Activity
- Billing/Subscription/Payment LEFT SEPARATE (not part of provider identity)

## 13. Required API Changes (if Option B implemented)
- /auth/provider/login (POST)
- /auth/provider/logout (POST)
- Provider session cookie or JWT mechanism
- AuthGuard extension for provider role
- /providers/me must reject if session-derived providerId doesn't match
- All Phase 5 endpoints must apply AuthGuard + provider scope filter

## 14. Required Frontend Changes (if Option B implemented)
- /login or /provider-login page (separate from client login)
- Session handling for provider vs client
- /dashboard must verify provider identity
- No inventory of new UI needed until architecture is chosen

## 15. Migration Risks
- Low if using new session table (no existing data migration needed)
- Medium if changing Provider to include auth fields (affects all provider queries)
- Phase 3 bookings unchanged (clientId/providerId references preserved)
- Phase 4 reminders/notifications unchanged

## 16. Phase 3 Compatibility
- Booking creation/cancellation/rescheduling uses clientId; providerId derived from slot; no auth change needed for Phase 3
- Phase 3 does not use /providers/me or dashboard endpoints directly

## 17. Phase 4 Compatibility
- Reminder queue, worker, notifications use booking/client references; no provider auth dependency
- No impact

## 18. Implementation Sequence (recommended, not executed)
1. Define provider session/auth schema (design decision)
2. Create /auth/provider/login + cookie/session mechanism
3. Update AuthGuard for provider role
4. Update /providers/me to use session-derived providerId
5. Scope Phase 5 endpoints individually
6. Update frontend login/dashboard for provider session
7. Document DEV_PROVIDER_ID as dev-only

## 19. Open Product Decisions
- Provider login: email + password? OAuth? External identity?
- Session format: cookie-based or JWT?
- Role model needed? (only provider + client currently; admin not defined)
- Should /search remain public?
- Billing domain scope (separate from provider identity)

## 20. Final Decision
PROVIDER_IDENTITY_ARCHITECTURE_DEFINED — Option B (provider session/account) recommended as only safe production architecture.
Current state (Option E — DEV_PROVIDER_ID) documented as development-only.
No implementation done. Phase 5 feature implementation BLOCKED until provider identity architecture is decided and implemented.
Phase 2 (provider credentials): SCHEMA ADDED (email, passwordHash). DB applied manually (shadow DB blocked).
Phase 3 (provider session): SCHEMA ADDED (provider_sessions table). DB applied manually.
Phase 21 (migration): BLOCKED by DB permission (shadow DB). Manual SQL applied. Migration file not generated.
