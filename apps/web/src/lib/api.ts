import { USE_MOCK, getBookings, getWorkspace, getRecentActivity } from "@chronos/mock-data";

export async function apiFetch(path: string, opts?: RequestInit & { idempotencyKey?: string }) {
  if (USE_MOCK && typeof window !== "undefined") {
    if (path === "/bookings") return Response.json(getBookings());
    if (path === "/providers/me") return Response.json(getWorkspace());
    if (path === "/clients") return Response.json([]);
    if (path === "/event-types") return Response.json([]);
    return Response.json({});
  }
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    return await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts?.idempotencyKey ? { "idempotency-key": opts.idempotencyKey } : {}), ...(opts?.headers || {}) },
      credentials: "include",
    });
  } catch {
    if (USE_MOCK) {
      if (path === "/bookings") return Response.json(getBookings());
      if (path === "/providers/me") return Response.json(getWorkspace());
      return Response.json({});
    }
    throw new Error("Failed to fetch");
  }
}
