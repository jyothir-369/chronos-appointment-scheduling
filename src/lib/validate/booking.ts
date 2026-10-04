import { BookingStatus } from "@chronos/contracts";
export function isBookingStatus(s: unknown): s is BookingStatus {
  return typeof s === "string" && (s === "booked" || s === "completed" || s === "cancelled" || s === "no_show");
}
export function validateBookingResponse(r: unknown): { ok: boolean; error?: string } {
  if (r == null) return { ok: false, error: "null response" };
  if (typeof r !== "object") return { ok: false, error: "not object" };
  const obj = r as Record<string, unknown>;
  if (typeof obj.id !== "string") return { ok: false, error: "missing id" };
  if (!isBookingStatus(obj.status)) return { ok: false, error: "bad status: " + String(obj.status) };
  return { ok: true };
}
