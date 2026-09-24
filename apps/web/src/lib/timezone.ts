export function getCookieTz(): string | undefined {
  try { return (globalThis as any).document?.cookie?.split(';').find((c:string)=>c.trim().startsWith('tz='))?.split('=')[1]; } catch { return undefined; }
}
export function resolveTimeZone(): string { return getCookieTz() || 'UTC'; }
