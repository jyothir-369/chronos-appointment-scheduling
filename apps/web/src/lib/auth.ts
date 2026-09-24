export interface Session {
  role: 'provider' | 'client';
  userId: string;
}
export function getSession(): Session | null {
  return { role: 'client', userId: 'user-1' };
}
