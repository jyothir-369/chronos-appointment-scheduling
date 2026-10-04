// Pure helpers — unit tested
export const countByStatus = (items: any[], key: string = "status") => {
  const out: Record<string, number> = {};
  for (const it of items) { const s = it[key] || "unknown"; out[s] = (out[s] || 0) + 1; }
  return out;
};
export const percentChange = (current: number, prev: number) => {
  if (prev === 0) return current === 0 ? 0 : null;
  return Math.round(((current - prev) / prev) * 1000) / 10;
};
