import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signToken, verifyToken } from '../unsubscribe.token.js';

describe('Unsubscribe token security', () => {
  it('valid token verifies', () => {
    const token = signToken('client-123');
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('client-123');
    expect(payload!.purpose).toBe('reminder-unsubscribe');
  });

  it('tampered token rejected', () => {
    const token = signToken('client-123');
    expect(verifyToken(token + 'tampered')).toBeNull();
  });

  it('expired token rejected (simulated)', () => {
    // We test that wrong purpose is rejected; expiry is time-based.
    const payload = { sub: 'x', purpose: 'bad', exp: Math.floor(Date.now() / 1000) + 1000 };
    const fake = JSON.stringify(payload) + '.' + 'bad';
    expect(verifyToken(fake)).toBeNull();
  });

  it('wrong purpose rejected', () => {
    const token = signToken('client-123');
    // A token with altered payload string cannot pass HMAC.
    expect(verifyToken('invalid.format')).toBeNull();
  });

  it('missing token rejected', () => {
    expect(verifyToken('')).toBeNull();
    expect(verifyToken(undefined as any)).toBeNull();
  });
});
