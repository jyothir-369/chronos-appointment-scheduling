export async function resolveSlot(dateStr: string, timeStr: string, timezone: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const utcStr = new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString();
  const res = await fetch(`/slots?from=${utcStr}&to=${utcStr}`);
  if (!res.ok) {
    if (res.status === 401) throw new Error('AUTH_EXPIRED');
    if (res.status >= 500) throw new Error('SERVER_ERROR');
    throw new Error('UNAVAILABLE');
  }
  const data = await res.json();
  if (data.slots?.length > 0) return data.slots[0].id;
  const openRes = await fetch('/slots/open');
  if (!openRes.ok) {
    if (openRes.status === 401) throw new Error('AUTH_EXPIRED');
    if (openRes.status >= 500) throw new Error('SERVER_ERROR');
    return null;
  }
  const openData = await openRes.json();
  return openData.slots?.[0]?.id || null;
}
