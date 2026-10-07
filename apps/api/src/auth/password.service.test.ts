import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';

describe('PasswordService regression', () => {
  const ps = new PasswordService();

  it('hashPassword generates a hash', async () => {
    const h = await ps.hashPassword('secret');
    expect(typeof h).toBe('string');
    expect(h.startsWith('scrypt:')).toBe(true);
  });

  it('verifyPassword correct returns true', async () => {
    const h = await ps.hashPassword('Phase5Authz!2026');
    expect(await ps.verifyPassword('Phase5Authz!2026', h)).toBe(true);
  });

  it('verifyPassword wrong returns false', async () => {
    const h = await ps.hashPassword('Phase5Authz!2026');
    expect(await ps.verifyPassword('wrong', h)).toBe(false);
  });

  it('same password produces different hashes (salt)', async () => {
    const a = await ps.hashPassword('x');
    const b = await ps.hashPassword('x');
    expect(a).not.toBe(b);
  });

  it('malformed hash rejected', async () => {
    expect(await ps.verifyPassword('x', 'bad')).toBe(false);
    expect(await ps.verifyPassword('x', 'scrypt::')).toBe(false);
  });

  it('incorrect password never verifies', async () => {
    const h = await ps.hashPassword('correct');
    expect(await ps.verifyPassword('incorrect', h)).toBe(false);
  });
});
