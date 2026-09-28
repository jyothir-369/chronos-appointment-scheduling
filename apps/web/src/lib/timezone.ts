export function getCookieTz(): string | undefined {
  try {
    return (globalThis as any).document?.cookie?.split(';').find((c: string) => c.trim().startsWith('tz='))?.split('=')[1];
  } catch { return undefined; }
}
export function resolveTimeZone(): string { return getCookieTz() || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC") || "UTC"; }
export function setCookieTz(tz: string) {
  try {
    const doc = (globalThis as any).document;
    if (doc && doc.cookie) doc.cookie = `tz=${encodeURIComponent(tz)};path=/;max-age=2592000`;
  } catch {}
}
