export const USE_MOCK = (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") || (process.env.USE_MOCK_DATA === "true");
export interface User { id: string; name: string; email: string; role: string; workspaceId: string; }
export interface Workspace { id: string; name: string; timezone: string; currency: string; handle: string; }
export interface Booking { id: string; clientId: string; clientName: string; eventType: string; status: "confirmed" | "pending" | "cancelled"; location: "video" | "phone" | "in-person"; slot_start_utc: string; durationMin: number; meetingUrl?: string; value?: number; paid: boolean; }
export interface Activity { id: string; title: string; relativeTime: string; type: "booking" | "cancellation" | "update"; color: string; }
const WORKSPACE: Workspace = { id: "ws_1", name: "Acme Advisory Team", timezone: "America/New_York", currency: "USD", handle: "acme-advisory" };
const USER: User = { id: "u_sarah", name: "Sarah", email: "sarah@acme.com", role: "provider", workspaceId: WORKSPACE.id };
export const mockBookings: Booking[] = [
  { id: "b_t1", clientId: "c1", clientName: "Jordan Lee", eventType: "Consultation", status: "confirmed", location: "video", slot_start_utc: "2026-10-03T14:00:00Z", durationMin: 60, meetingUrl: "https://meet.example/1", value: 250, paid: true },
  { id: "b_t2", clientId: "c2", clientName: "Avery Park", eventType: "Review Call", status: "pending", location: "phone", slot_start_utc: "2026-10-03T10:30:00Z", durationMin: 30, value: 150, paid: false },
  { id: "b_m1", clientId: "c3", clientName: "Morgan Reed", eventType: "Strategy", status: "confirmed", location: "in-person", slot_start_utc: "2026-09-22T16:00:00Z", durationMin: 90, value: 350, paid: true },
  { id: "b_m2", clientId: "c4", clientName: "Drew Kim", eventType: "Follow-up", status: "pending", location: "video", slot_start_utc: "2026-09-15T11:00:00Z", durationMin: 45, value: 120, paid: true },
  { id: "b_m3", clientId: "c5", clientName: "Casey Liu", eventType: "Audit", status: "cancelled", location: "phone", slot_start_utc: "2026-09-08T13:30:00Z", durationMin: 60, value: 0, paid: false },
  ...Array.from({ length: 137 }, (_, i) => ({
    id: `b_s${i}`, clientId: `c${i % 10}`, clientName: `Client ${i}`,
    eventType: i % 3 === 0 ? "Consultation" : i % 3 === 1 ? "Review" : "Strategy",
    status: (i % 4 === 0 ? "pending" : i % 7 === 0 ? "cancelled" : "confirmed") as "confirmed" | "pending" | "cancelled",
    location: i % 3 === 0 ? ("video" as const) : i % 3 === 1 ? ("phone" as const) : ("in-person" as const),
    slot_start_utc: `2026-09-01T${String(i % 12 + 8).padStart(2,"0")}:00:00Z`,
    durationMin: 30 + (i % 3) * 30,
    value: i % 5 === 0 ? 0 : 150 + (i % 4) * 100,
    paid: i % 5 !== 0,
  })),
];
export const mockActivity: Activity[] = [
  { id: "a1", title: "Jordan Lee booked Consultation", relativeTime: "2 hours ago", type: "booking", color: "bg-emerald-400" },
  { id: "a2", title: "Avery Park cancelled Review Call", relativeTime: "5 hours ago", type: "cancellation", color: "bg-rose-400" },
  { id: "a3", title: "Workspace timezone updated", relativeTime: "Yesterday", type: "update", color: "bg-amber-400" },
];
export function getWorkspace() { return WORKSPACE; }
export function getUser() { return USER; }
export function getBookings() { return mockBookings; }
export function getRecentActivity() { return mockActivity; }
