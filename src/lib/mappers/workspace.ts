import { Workspace } from "../../types/workspace"; // derived

export interface WorkspaceBackend {
  id: string;
  name: string;
  timezone: string; // IANA
  currency: string;
  cancellation_window_hours: number;
}

export interface WorkspaceView {
  id: string;
  name: string;
  timezoneLabel: string; // e.g. "IST (UTC+5:30)" // e.g. "IST (UTC+5:30)"
  handle?: string; // BACKEND GAP: no handle endpoint
}

export function formatTimezone(tz: string): string {
  // Derive label from IANA zone (no full Intl for all zones here; simplified)
  const offset = new Date().toLocaleString("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .match(/GMT([+-]\d+)/)?.[1]
    ? `UTC${new Date().toLocaleString("en-US", { timeZone: tz, timeZoneName: "short" }).match(/GMT([+-][\d:]+)/)?.[1]}`
    : "UTC";
  return `${tz.replace("/", "/")} (${offset})`;
}
