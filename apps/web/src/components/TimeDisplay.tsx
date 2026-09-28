import { formatInTimeZone } from "date-fns-tz";

export default function TimeDisplay({ iso, tz }: { iso: string; tz: string }) {
  try {
    const timeStr = formatInTimeZone(iso, tz, "h:mm a");
    return (
      <span aria-label={`Time in ${tz}`} title={iso}>
        {timeStr}
        <span className="text-slate-400 text-xs ml-1">({tz})</span>
      </span>
    );
  } catch {
    return <span aria-label="Invalid time">—</span>;
  }
}
