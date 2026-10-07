import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const SECRET = process.env.UNSUBSCRIBE_SECRET || 'chronos-default-unsubscribe-secret-change-in-production';
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface UnsubscribePayload {
  sub: string; // client id
  purpose: string;
  exp: number;
}

export function signToken(clientId: string): string {
  const exp = Math.floor(Date.now() / 1000) + Math.floor(EXPIRY_MS / 1000);
  const payload = JSON.stringify({ sub: clientId, purpose: 'reminder-unsubscribe', exp });
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  const token = Buffer.from(payload).toString('base64url') + '.' + sig;
  return token;
}

export function verifyToken(token: string): UnsubscribePayload | null {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const payload = Buffer.from(b64, 'base64url').toString('utf8');
    const expectedSig = createHmac('sha256', SECRET).update(payload).digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expectedSig, 'base64url');
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    const data = JSON.parse(payload) as UnsubscribePayload;
    if (data.purpose !== 'reminder-unsubscribe') return null;
    if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null;
    if (!data.sub || typeof data.sub !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}
