# Phase 6 — Admin Authorization Architecture Design
Status: DISCOVERY ONLY (BLOCKED_CONFIGURATION — NOT IMPLEMENTED)
Date: 2026-10-08
Rule: No DB change, no auth change, no frontend change, no Phase 7, no commit/push.

A. Current identity: Provider (providers table: id/name/timezone/slug/email/passwordHash/...), Client (clients table: id/email/name/...), no Admin table, no role field.
B. Sessions: ProviderSession (providerId/tokenHash/expiresAt, cookie chronos_provider_session, guard ProviderAuthGuard); Client session (cookie chronos_session, AuthGuard, no ClientSession table shown).
C. Authorization: ProviderAuthGuard + req.provider.id (PASS — Phase 6 verified); Client-scoped @Headers('cookie') + chronos_session (PASS); AdminController placeholder ForbiddenException; no admin guard.
D. Existing admin: src/admin/admin.controller.ts — single @Get('status') throws ForbiddenException; module exists; no authorization primitive.
E. Security: server-authoritative, no hardcoded IDs, no env-bypass, separate admin cookie from provider/client cookies, service layer must keep provider-scoped filters.
F. Designs considered: (1) Provider.role field — high session-confusion risk; (2) Admin model + AdminSession + AdminAuthGuard — clean separation; (3) Client.role — wrong domain; (4) Generic RBAC — over-engineered.
G. Trade-offs: Provider.role = minimal schema, high risk; Admin model = more work, correct separation; RBAC = unnecessary.
H. Recommended (needs user confirmation): Admin model + AdminSession + AdminAuthGuard + separate cookie; keep ProviderAuthGuard untouched; keep /activity client-scoped.
I. Schema: Admin table (id, email, passwordHash?, name, createdAt, updatedAt); AdminSession (id, adminId, tokenHash, expiresAt); NO role on Provider.
J. Backend: AdminAuthGuard, AdminSessionService (scrypt), AdminController (replace placeholder), AdminModule, /auth/admin/login; NO changes to ProviderAuthGuard/ProvidersController/SearchController/ActivityController.
K. Frontend: /admin/login vs /login distinction (blocker #2 overlap); /admin/* protected by AdminAuthGuard; no change to provider workspace / dashboard / activity.
L. Tests: AdminAuthGuard structural/negative; AdminSession token/hash; cross-session isolation (admin cookie -> provider endpoint = 401; provider cookie -> admin = 401); settings tests already PASS.
M. Runtime verification (post-impl): POST /auth/admin/login => cookie => GET /admin/status 200; no cookie => 401; admin cookie on /search => 401.
N. Migration: create tables; rollback = drop; no reset needed.
O. Assumptions: Admin is separate identity; admin cookie separate; server-authoritative filters preserved; placeholder safe to replace.
P. Open decisions: (1) Admin login method (email+password / email-only / SSO)? (2) Admin data scope (provider-filtered aggregates or cross-provider admin-only)? (3) Session lifetime/MFA? (4) Blocker #2 interaction (/admin/login route vs shared /login)? (5) Audit table needed?

Files inspected (not modified): schema.prisma, auth/*.ts, admin/*.ts, providers.controller.ts, activity.controller.ts, search.controller.ts, dashboard/page.tsx, test/e2e.admin.blocked.test.ts, PHASE_6_EVIDENCE.md.
Git: only intended Phase 6 changes (4 new tests + dashboard state fix + evidence). No DB/Redis changes. No commit.
Status: NOT IMPLEMENTED — BLOCKED_CONFIGURATION. Design delivered. Implementation requires user confirmation on P.
Co-Authored-By: Claude Code <noreply@anthropic.com>
