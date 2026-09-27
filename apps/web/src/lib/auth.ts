export interface Session {
  role: 'provider' | 'client';
  userId: string;
}
// Real session-based auth: derive from cookie/session, not hardcoded
export function getSession(): Session | null {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie;
  const match = cookie.match(/chronos_session=([^;]+)/);
  if (match) {
    try {
      const payload = JSON.parse(atob(match[1]));
      return { role: payload.role || 'client', userId: payload.userId || payload.sub || '' };
    } catch {
      return { role: 'client', userId: match[1] };
    }
  }
  return null;
}
