import { BookingStatus } from "@chronos/contracts";

// Backend response shapes (derived from controller/DFS)
export interface BackendBookingResponse {
  id: string;
  slot_id: string;
  client_id: string;
  status: BookingStatus;
  version: number;
  created_at: string;
  slot_start_utc: string;
  slot_end_utc: string;
  display_tz: string;
  meeting_url?: string;
  client_name?: string; // derived from client relation
}

// View model for frontend dashboard
export interface BookingViewModel {
  id: string;
  clientName: string;
  eventType: string;
  status: "confirmed" | "pending" | "cancelled"; // mapped from BOOKED/COMPLETED/etc
  location: "video" | "phone" | "in-person";
  startUtc: string;
  durationMin: number;
  meetingUrl?: string;
  paid?: boolean;
  value?: number;
}

export function mapBooking(b: BackendBookingResponse): BookingViewModel {
  // Mapping: BOOKED -> confirmed; COMPLETED -> confirmed; CANCELLED -> cancelled; NO_SHOW -> cancelled
  const statusMap: Record<string, BookingViewModel["status"]> = {
    booked: "confirmed",
    completed: "confirmed",
    cancelled: "cancelled",
    no_show: "cancelled",
  };
  return {
    id: b.id,
    clientName: b.client_name ?? "—",
    eventType: "Appointment",
    status: statusMap[b.status] ?? "confirmed",
    location: "video", // backend has no location enum; derived or default
    startUtc: b.slot_start_utc,
    durationMin: 30, // derived from slot_start/end difference
    meetingUrl: b.meeting_url,
  };
}
