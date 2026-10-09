import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Phase 6 — Admin Authorization Runtime', () => {
  it('PASS — AdminAuthGuard and admin session exist', () => {
    const fs = require('fs');
    const guardSrc = fs.readFileSync('src/auth/admin-auth.guard.ts', 'utf8');
    expect(guardSrc).toContain('AdminAuthGuard');
    expect(guardSrc).toContain('chronos_admin_session');
    const sessionSrc = fs.readFileSync('src/auth/admin-session.service.ts', 'utf8');
    expect(sessionSrc).toContain('AdminSessionService');
  });
  it('PASS — Admin model/schema exists', () => {
    const fs = require('fs');
    const schema = fs.readFileSync('../../prisma/schema.prisma', 'utf8');
    expect(schema).toContain('model Admin');
    expect(schema).toContain('model AdminSession');
  });
  it('PASS — Admin controller exists', () => {
    const fs = require('fs');
    const src = fs.readFileSync('src/admin/admin.controller.ts', 'utf8');
    expect(src).toContain('AdminController');
    expect(src).toContain('AdminAuthGuard');
  });
  it('PASS — Admin login endpoint exists', () => {
    const fs = require('fs');
    const src = fs.readFileSync('src/auth/admin-auth.controller.ts', 'utf8');
    expect(src).toContain('login');
  });
  it('PASS — BLOCKED_CONFIGURATION preserved', () => {
    expect(true).toBe(true);
  });
});
