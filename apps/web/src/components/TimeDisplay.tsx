export default function TimeDisplay({ iso, tz }: { iso: string; tz: string }) {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', timeZoneName: 'short', hour12: true });
  return <span aria-label={`Time in ${tz}`}>{fmt.format(d)}</span>;
}
