export async function resolveSlot(dateStr: string, timeStr: string, timezone: string) {
  // Build UTC instant from selected date + time
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const utcStr = new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString();
  // Query backend for exact match
  const res = await fetch(`/slots?from=${utcStr}&to=${utcStr}`);
  const data = await res.json();
  if (data.slots?.length > 0) return data.slots[0].id;
  // Try closest open
  const openRes = await fetch('/slots/open');
  const openData = await openRes.json();
  return openData.slots?.[0]?.id || null;
}
