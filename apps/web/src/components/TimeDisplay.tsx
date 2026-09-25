export default function TimeDisplay({ iso, tz }: { iso: string; tz: string }) {
  try {
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || "UTC",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      hour12: true,
    });
    const parts = fmt.formatToParts(d);
    const timeStr = parts.map((p) => (p.type === "literal" ? p.value : p.type === "timeZoneName" ? ` ${p.value}` : p.value)).join("");
    return (
      <span aria-label={`Time in ${tz}`} title={d.toISOString()}>
        {timeStr.trim()}
        <span className="text-slate-400 text-xs ml-1">({tz})</span>
      </span>
    );
  } catch {
    return <span aria-label="Invalid time">—</span>;
  }
}
