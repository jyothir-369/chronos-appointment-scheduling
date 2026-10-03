export const USE_MOCK = (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") || (process.env.USE_MOCK_DATA === "true");
export interface User { id: string; name: string; email: string; role: string; workspaceId: string; }
export interface Workspace { id: string; name: string; timezone: string; currency: string; handle: string; }
export interface Booking { id: string; clientId: string; clientName: string; eventType: string; status: "confirmed" | "pending" | "cancelled"; location: "video" | "phone" | "in-person"; slot_start_utc: string; durationMin: number; meetingUrl?: string; value?: number; paid: boolean; }
export interface Activity { id: string; title: string; relativeTime: string; type: "booking" | "cancellation" | "update"; color: string; }

// Aggregates (explicit, labeled) — matches target design exactly
export const AGGREGATES = {
  totalAppointments: 142,
  previousMonthTotal: 124,
  deltaPercent: 14.5,      // (142-124)/124 = 14.516... -> 14.5
  todayUpcoming: 2,
  paidBookings: 30,
  estimatedValue: 4850,
  occupancyRate: 88,
};

const WORKSPACE: Workspace = { id: "ws_1", name: "Acme Advisory Team", timezone: "Asia/Kolkata", currency: "USD", handle: "acme-advisory" };
const USER: User = { id: "u_sarah", name: "Sarah", email: "sarah@acme.com", role: "provider", workspaceId: WORKSPACE.id };

// Today (2026-10-03) — exactly 3 appointments per spec
export const todayBookings: Booking[] = [
  { id: "b_t1", clientId: "c1", clientName: "Michael Vance", eventType: "Consultation", status: "confirmed", location: "video", slot_start_utc: "2026-10-03T04:30:00Z", durationMin: 30, meetingUrl: "https://meet.example/1", value: 250, paid: true }, // 10:00 AM IST
  { id: "b_t2", clientId: "c2", clientName: "Sophia Martinez", eventType: "Review Call", status: "pending", location: "phone", slot_start_utc: "2026-10-03T05:45:00Z", durationMin: 15, value: 150, paid: false }, // 11:15 AM IST
  { id: "b_t3", clientId: "c3", clientName: "Alex Chen", eventType: "Strategy", status: "confirmed", location: "video", slot_start_utc: "2026-10-03T08:30:00Z", durationMin: 60, meetingUrl: "https://meet.example/3", value: 350, paid: true }, // 2:00 PM IST
];

// Previous month (Sep) — exactly 124 records (explicit count, not pad)
export const previousMonthBookings: Booking[] = Array.from({ length: 124 }, (_, i) => ({
  id: `b_prev_${i}`,
  clientId: `c_${i % 8}`,
  clientName: `Client ${i}`,
  eventType: i % 3 === 0 ? "Consultation" : i % 3 === 1 ? "Review" : "Strategy",
  status: i % 10 === 0 ? "cancelled" : i % 5 === 0 ? "pending" : "confirmed" as const,
  location: i % 3 === 0 ? ("video" as const) : i % 3 === 1 ? ("phone" as const) : ("in-person" as const),
  slot_start_utc: `2026-09-${String((i % 30) + 1).padStart(2,"0")}T10:00:00Z`,
  durationMin: 30 + (i % 4) * 15,
  value: i % 7 === 0 ? 0 : 100 + (i % 5) * 50,
  paid: i % 7 !== 0,
}));

// Today + previous = 127; need 142 total -> add 15 more general records (explicit)
export const remainingBookings: Booking[] = Array.from({ length: 15 }, (_, i) => ({
  id: `b_gen_${i}`,
  clientId: `c_gen_${i}`,
  clientName: `General Client ${i}`,
  eventType: i % 2 === 0 ? "Consultation" : "Audit",
  status: "confirmed" as const,
  location: "video" as const,
  slot_start_utc: `2026-09-${String((i % 30) + 1).padStart(2,"0")}T14:00:00Z`,
  durationMin: 45,
  value: 150,
  paid: true,
}));

export const mockBookings = [...todayBookings, ...previousMonthBookings, ...remainingBookings];

export const mockActivity: Activity[] = [
  { id: "a1", title: "Michael Vance booked Consultation", relativeTime: "10 min ago", type: "booking", color: "bg-emerald-400" },
  { id: "a2", title: "Sophia Martinez scheduled Review Call", relativeTime: "1 hour ago", type: "update", color: "bg-amber-400" },
  { id: "a3", title: "Alex Chen rescheduled Strategy", relativeTime: "3 hours ago", type: "update", color: "bg-indigo-400" },
];

export function getWorkspace() { return WORKSPACE; }
export function getUser() { return USER; }
export function getBookings() { return mockBookings; }
export function getRecentActivity() { return mockActivity; }
export function getAggregates() { return AGGREGATES; }
